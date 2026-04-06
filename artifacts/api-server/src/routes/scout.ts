import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable, fixturesTable } from "@workspace/db";
import { z } from "zod/v4";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const router: IRouter = Router();

const STANDINGS_URL = "https://staveley6aside.leaguerepublic.com/standingsForDate/177116197/2/-1/-1.html";
const FORM_URL = "https://staveley6aside.leaguerepublic.com/teamForm/177116197.html";
const LR_BASE = "https://staveley6aside.leaguerepublic.com";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "en-GB,en;q=0.9",
  "Referer": "https://staveley6aside.leaguerepublic.com/",
};

function normaliseName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const aWords = a.split(" ");
  const bWords = b.split(" ");
  const common = aWords.filter(w => bWords.includes(w)).length;
  return common / Math.max(aWords.length, bWords.length);
}

function buildVerdict(rank: number, ga: number, gf: number): string[] {
  const verdicts: string[] = [];
  if (rank <= 3) verdicts.push("Title Contenders - High Alert");
  if (ga >= 8) verdicts.push("Defensive Weakness Detected");
  if (gf >= 12 && rank <= 3) verdicts.push("Dangerous Attack");
  return verdicts;
}

async function scrapeStandings(): Promise<Array<{ name: string; rank: number; played: number; gf: number; ga: number; teamPath: string }>> {
  const res = await fetch(STANDINGS_URL, { headers: BROWSER_HEADERS });
  const html = await res.text();

  const rows: Array<{ name: string; rank: number; played: number; gf: number; ga: number; teamPath: string }> = [];

  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return rows;

  const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let trMatch;
  while ((trMatch = trPattern.exec(tbodyMatch[1])) !== null) {
    const cells: string[] = [];
    const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let tdMatch;
    while ((tdMatch = tdPattern.exec(trMatch[1])) !== null) {
      cells.push(tdMatch[1].replace(/<[^>]+>/g, "").trim());
    }
    const teamPathMatch = trMatch[1].match(/href="([^"]*\/team\/[^"]*)"/);
    const teamPath = teamPathMatch ? teamPathMatch[1] : "";
    const nameMatch = trMatch[1].match(/<a[^>]*>\s*([\s\S]*?)\s*<\/a>/);
    const rawName = nameMatch ? nameMatch[1].trim() : "";
    if (!rawName || cells.length < 8) continue;
    const rank = parseInt(cells[0]) || 0;
    const played = parseInt(cells[2]) || 0;
    const gf = parseInt(cells[6]) || 0;
    const ga = parseInt(cells[7]) || 0;
    rows.push({ name: rawName, rank, played, gf, ga, teamPath });
  }
  return rows;
}

async function scrapeForm(): Promise<Map<string, string>> {
  const res = await fetch(FORM_URL, { headers: BROWSER_HEADERS });
  const html = await res.text();

  const formMap = new Map<string, string>();
  const rowPattern = /<tr>([\s\S]*?)<\/tr>/g;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const row = rowMatch[1];
    const nameMatch = row.match(/<a[^>]*>\s*([\s\S]*?)\s*<\/a>/);
    if (!nameMatch) continue;
    const rawName = nameMatch[1].trim();

    const formBoxPattern = /class="team-form-box (won|drawn|lost)"/g;
    let boxMatch;
    let formStr = "";
    while ((boxMatch = formBoxPattern.exec(row)) !== null) {
      const r = boxMatch[1];
      formStr += r === "won" ? "W" : r === "drawn" ? "D" : "L";
    }
    if (rawName && formStr) {
      formMap.set(rawName, formStr);
    }
  }
  return formMap;
}

function overrideKey(opponent: string): string {
  return `scout_override_${normaliseName(opponent).replace(/\s+/g, "_")}`;
}

function liveScoutKey(): string {
  return "scout_live_cache";
}

interface ScoutData {
  name: string;
  rank: number;
  gf: number;
  ga: number;
  form: string;
  verdicts: string[];
  teamUrl: string;
  isOverride: boolean;
}

router.get("/scout", async (req, res): Promise<void> => {
  const opponentRaw = (req.query.opponent as string | undefined) ?? "";
  if (!opponentRaw) {
    res.status(400).json({ error: "opponent query param required" });
    return;
  }

  const key = overrideKey(opponentRaw);
  const [override] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  if (override) {
    try {
      const data = JSON.parse(override.value) as Omit<ScoutData, "isOverride">;
      res.json({ ...data, verdicts: buildVerdict(data.rank, data.ga, data.gf), isOverride: true });
      return;
    } catch {
    }
  }

  try {
    const [standings, formMap] = await Promise.all([scrapeStandings(), scrapeForm()]);
    const normOpponent = normaliseName(opponentRaw);

    let bestMatch: typeof standings[0] | null = null;
    let bestScore = 0;
    for (const team of standings) {
      const score = scoreSimilarity(normaliseName(team.name), normOpponent);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = team;
      }
    }

    if (!bestMatch || bestScore < 0.2) {
      res.status(404).json({ error: "Team not found in standings", normalisedSearch: normOpponent });
      return;
    }

    let form = formMap.get(bestMatch.name) ?? "";
    if (!form) {
      for (const [name, f] of formMap.entries()) {
        const score = scoreSimilarity(normaliseName(name), normaliseName(bestMatch.name));
        if (score > 0.5) { form = f; break; }
      }
    }

    const data: ScoutData = {
      name: bestMatch.name,
      rank: bestMatch.rank,
      gf: bestMatch.gf,
      ga: bestMatch.ga,
      form,
      verdicts: buildVerdict(bestMatch.rank, bestMatch.ga, bestMatch.gf),
      teamUrl: bestMatch.teamPath ? `${LR_BASE}${bestMatch.teamPath}` : `${LR_BASE}/standingsForDate/177116197/2/-1/-1.html`,
      isOverride: false,
    };
    res.json(data);
  } catch (err: any) {
    res.status(503).json({ error: "Failed to fetch standings", detail: err?.message });
  }
});

router.get("/admin/scout-override", async (req, res): Promise<void> => {
  const opponentRaw = (req.query.opponent as string | undefined) ?? "";
  if (!opponentRaw) { res.status(400).json({ error: "opponent required" }); return; }
  const key = overrideKey(opponentRaw);
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  if (!row) { res.json(null); return; }
  try { res.json(JSON.parse(row.value)); } catch { res.json(null); }
});

const ScoutOverrideBody = z.object({
  opponent: z.string().min(1),
  rank: z.number().int().min(1),
  gf: z.number().int().min(0),
  ga: z.number().int().min(0),
  form: z.string().max(20),
  teamUrl: z.string().optional().default(""),
});

router.post("/admin/scout-override", async (req, res): Promise<void> => {
  const parsed = ScoutOverrideBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: String(parsed.error) }); return; }
  const { opponent, ...data } = parsed.data;
  const key = overrideKey(opponent);
  await db
    .insert(settingsTable)
    .values({ key, value: JSON.stringify(data), updatedAt: new Date() })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: JSON.stringify(data), updatedAt: new Date() } });
  res.json({ ok: true });
});

router.delete("/admin/scout-override", async (req, res): Promise<void> => {
  const opponentRaw = (req.query.opponent as string | undefined) ?? "";
  if (!opponentRaw) { res.status(400).json({ error: "opponent required" }); return; }
  const key = overrideKey(opponentRaw);
  await db.delete(settingsTable).where(eq(settingsTable.key, key));
  res.json({ ok: true });
});

const AI_SUMMARY_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function summaryKey(opponent: string): string {
  return `scout_ai_summary_${normaliseName(opponent).replace(/\s+/g, "_")}`;
}

router.get("/scout/summary", async (req, res): Promise<void> => {
  const opponentRaw = (req.query.opponent as string | undefined) ?? "";
  if (!opponentRaw) {
    res.status(400).json({ error: "opponent query param required" });
    return;
  }

  // Return cached summary if fresh enough
  const cacheKey = summaryKey(opponentRaw);
  const [cached] = await db.select().from(settingsTable).where(eq(settingsTable.key, cacheKey));
  if (cached) {
    try {
      const parsed = JSON.parse(cached.value) as { summary: string; generatedAt: string };
      const age = Date.now() - new Date(parsed.generatedAt).getTime();
      if (age < AI_SUMMARY_TTL_MS) {
        res.json({ summary: parsed.summary, cached: true });
        return;
      }
    } catch { /* stale/invalid cache — regenerate */ }
  }

  // Gather scout data
  let scoutData: ScoutData | null = null;
  try {
    const [standings, formMap] = await Promise.all([scrapeStandings(), scrapeForm()]);
    const normOpponent = normaliseName(opponentRaw);
    let bestMatch: typeof standings[0] | null = null;
    let bestScore = 0;
    for (const team of standings) {
      const score = scoreSimilarity(normaliseName(team.name), normOpponent);
      if (score > bestScore) { bestScore = score; bestMatch = team; }
    }
    if (bestMatch && bestScore >= 0.2) {
      let form = formMap.get(bestMatch.name) ?? "";
      if (!form) {
        for (const [name, f] of formMap.entries()) {
          if (scoreSimilarity(normaliseName(name), normaliseName(bestMatch.name)) > 0.5) { form = f; break; }
        }
      }
      scoutData = {
        name: bestMatch.name,
        rank: bestMatch.rank,
        gf: bestMatch.gf,
        ga: bestMatch.ga,
        form,
        verdicts: buildVerdict(bestMatch.rank, bestMatch.ga, bestMatch.gf),
        teamUrl: bestMatch.teamPath ? `${LR_BASE}${bestMatch.teamPath}` : "",
        isOverride: false,
      };
    }
  } catch { /* scraping failed — still try to build summary from H2H */ }

  // Fetch all our played fixtures for H2H + recent form
  const allPlayed = await db.select().from(fixturesTable).where(eq(fixturesTable.played, true));

  // H2H: match opponent name fuzzily against DB fixture opponents
  const normOpp = normaliseName(opponentRaw);
  const h2hFixtures = allPlayed.filter(f => scoreSimilarity(normaliseName(f.opponent), normOpp) >= 0.4);

  const h2hStats = h2hFixtures.reduce(
    (acc, f) => {
      const bsScore = f.isHome ? f.homeScore! : f.awayScore!;
      const opScore = f.isHome ? f.awayScore! : f.homeScore!;
      if (bsScore > opScore) acc.wins++;
      else if (bsScore === opScore) acc.draws++;
      else acc.losses++;
      acc.gf += bsScore;
      acc.ga += opScore;
      return acc;
    },
    { wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 }
  );

  const h2hLines = h2hFixtures
    .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
    .slice(0, 5)
    .map(f => {
      const bsScore = f.isHome ? f.homeScore! : f.awayScore!;
      const opScore = f.isHome ? f.awayScore! : f.homeScore!;
      const result = bsScore > opScore ? "W" : bsScore === opScore ? "D" : "L";
      return `  ${f.matchDate}: ${result} ${bsScore}-${opScore} (${f.isHome ? "Home" : "Away"})`;
    });

  // Our recent form (last 6 played)
  const recentUs = [...allPlayed]
    .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
    .slice(0, 6)
    .map(f => {
      const bsScore = f.isHome ? f.homeScore! : f.awayScore!;
      const opScore = f.isHome ? f.awayScore! : f.homeScore!;
      const result = bsScore > opScore ? "W" : bsScore === opScore ? "D" : "L";
      return `  ${result} ${bsScore}-${opScore} vs ${f.opponent}`;
    });

  // Build prompt
  const leagueSection = scoutData
    ? `League position: #${scoutData.rank} | Goals scored: ${scoutData.gf} | Goals conceded: ${scoutData.ga} | GD: ${scoutData.gf - scoutData.ga}
Recent form (oldest to newest): ${scoutData.form || "unknown"}`
    : "League data unavailable.";

  const h2hSection = h2hFixtures.length > 0
    ? `Overall H2H: ${h2hStats.wins}W ${h2hStats.draws}D ${h2hStats.losses}L (GF ${h2hStats.gf} GA ${h2hStats.ga})
Recent meetings:\n${h2hLines.join("\n")}`
    : "No previous meetings on record.";

  const ourFormSection = recentUs.length > 0
    ? recentUs.join("\n")
    : "No recent results on record.";

  const prompt = `You are a scout analyst for Bont Sloots FC, a 6-a-side football team playing in a local league.

Upcoming opponent: ${opponentRaw}

OPPONENT LEAGUE DATA:
${leagueSection}

HEAD-TO-HEAD RECORD (Bont Sloots vs ${opponentRaw}):
${h2hSection}

BONT SLOOTS RECENT RESULTS:
${ourFormSection}

Write a punchy, laddish 2-3 paragraph scouting report for the lads. Cover:
1. How good is this opponent — are they title contenders, mid-table, or easy pickings?
2. Are they an attacking threat or are they defensively solid? Back it up with the stats.
3. Based on the H2H and current form, how likely are Bont Sloots to win — and what should the lads watch out for?

Keep it fun, direct and confident. Use specific numbers. No bullet points — just flowing paragraphs.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const summary = completion.choices[0]?.message?.content ?? "Unable to generate report.";

    // Cache the result
    const value = JSON.stringify({ summary, generatedAt: new Date().toISOString() });
    await db
      .insert(settingsTable)
      .values({ key: cacheKey, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });

    res.json({ summary, cached: false });
  } catch (err: any) {
    res.status(503).json({ error: "AI summary generation failed", detail: err?.message });
  }
});

export default router;
