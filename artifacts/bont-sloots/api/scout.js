const STANDINGS_URL = "https://staveley6aside.leaguerepublic.com/standingsForDate/177116197/2/-1/-1.html";
const FORM_URL = "https://staveley6aside.leaguerepublic.com/teamForm/177116197.html";
const LR_BASE = "https://staveley6aside.leaguerepublic.com";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "en-GB,en;q=0.9",
  "Referer": "https://staveley6aside.leaguerepublic.com/"
};

function normaliseName(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreSimilarity(a, b) {
  if (a === b) return 1;
  const aWords = a.split(" ").filter(Boolean);
  const bWords = b.split(" ").filter(Boolean);
  const common = aWords.filter(w => bWords.includes(w)).length;
  return common / Math.max(aWords.length, bWords.length, 1);
}

function buildVerdict(rank, ga, gf) {
  const verdicts = [];
  if (rank <= 3) verdicts.push("Title Contenders - High Alert");
  if (ga >= 8) verdicts.push("Defensive Weakness Detected");
  if (gf >= 12 && rank <= 3) verdicts.push("Dangerous Attack");
  return verdicts;
}

async function scrapeStandings() {
  const response = await fetch(STANDINGS_URL, { headers: BROWSER_HEADERS });
  const html = await response.text();
  const rows = [];

  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return rows;

  const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let trMatch;

  while ((trMatch = trPattern.exec(tbodyMatch[1])) !== null) {
    const rowHtml = trMatch[1];
    const cells = [];
    const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let tdMatch;

    while ((tdMatch = tdPattern.exec(rowHtml)) !== null) {
      cells.push(tdMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim());
    }

    const nameMatch = rowHtml.match(/<a[^>]*>\s*([\s\S]*?)\s*<\/a>/);
    const teamPathMatch = rowHtml.match(/href="([^"]*\/team\/[^"]*)"/);

    const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, "").trim() : "";
    if (!name || cells.length < 8) continue;

    rows.push({
      name,
      rank: parseInt(cells[0], 10) || 0,
      played: parseInt(cells[2], 10) || 0,
      gf: parseInt(cells[6], 10) || 0,
      ga: parseInt(cells[7], 10) || 0,
      teamPath: teamPathMatch ? teamPathMatch[1] : ""
    });
  }

  return rows;
}

async function scrapeForm() {
  const response = await fetch(FORM_URL, { headers: BROWSER_HEADERS });
  const html = await response.text();
  const formMap = new Map();

  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const row = rowMatch[1];
    const nameMatch = row.match(/<a[^>]*>\s*([\s\S]*?)\s*<\/a>/);
    if (!nameMatch) continue;

    const rawName = nameMatch[1].replace(/<[^>]+>/g, "").trim();
    const formBoxPattern = /class="team-form-box (won|drawn|lost)"/g;
    let boxMatch;
    let form = "";

    while ((boxMatch = formBoxPattern.exec(row)) !== null) {
      form += boxMatch[1] === "won" ? "W" : boxMatch[1] === "drawn" ? "D" : "L";
    }

    if (rawName && form) formMap.set(rawName, form);
  }

  return formMap;
}

export default async function handler(req, res) {
  try {
    const opponentRaw = req.query.opponent || "";

    if (!opponentRaw) {
      return res.status(400).json({ error: "opponent required" });
    }

    const standings = await scrapeStandings();
    const formMap = await scrapeForm();
    const normOpponent = normaliseName(opponentRaw);

    let bestMatch = null;
    let bestScore = 0;

    for (const team of standings) {
      const score = scoreSimilarity(normaliseName(team.name), normOpponent);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = team;
      }
    }

    if (!bestMatch || bestScore < 0.2) {
      return res.status(404).json({
        error: "Team not found in standings",
        searchedFor: opponentRaw,
        teamsFound: standings.map(t => t.name)
      });
    }

    let form = formMap.get(bestMatch.name) || "";
    if (!form) {
      for (const [name, value] of formMap.entries()) {
        if (scoreSimilarity(normaliseName(name), normaliseName(bestMatch.name)) > 0.5) {
          form = value;
          break;
        }
      }
    }

    return res.status(200).json({
      name: bestMatch.name,
      rank: bestMatch.rank,
      gf: bestMatch.gf,
      ga: bestMatch.ga,
      form,
      verdicts: buildVerdict(bestMatch.rank, bestMatch.ga, bestMatch.gf),
      teamUrl: bestMatch.teamPath ? `${LR_BASE}${bestMatch.teamPath}` : STANDINGS_URL,
      isOverride: false
    });
  } catch (error) {
    return res.status(500).json({
      error: "Scout failed",
      message: error.message
    });
  }
}
