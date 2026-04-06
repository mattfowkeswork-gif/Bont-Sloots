import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { z } from "zod/v4";

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
  notes?: string;
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
      res.json({ ...data, verdicts: buildVerdict(data.rank, data.ga, data.gf), isOverride: true, notes: data.notes ?? "" });
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
  notes: z.string().optional().default(""),
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


export default router;
