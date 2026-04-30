import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const TEAM_URL = "https://staveley6aside.leaguerepublic.com/team/480035827/849970515.html";
const OUR_TEAM = "Real Sosobad";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "en-GB,en;q=0.9",
  "Referer": "https://staveley6aside.leaguerepublic.com/"
};

function cleanTeamName(name) {
  return String(name || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLeagueDate(raw) {
  const [day, month, year] = raw.split("/").map(Number);
  return `20${String(year).padStart(2, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function syncFixturesFromLeagueRepublic() {
  const response = await fetch(TEAM_URL, { headers: BROWSER_HEADERS });
  const html = await response.text();

  const upcomingStart = html.indexOf("<h2>Matches</h2>");
  const upcomingHtml = upcomingStart >= 0 ? html.slice(upcomingStart) : html;

  const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
  let match;

  while ((match = rowRegex.exec(upcomingHtml)) !== null) {
    const row = match[1];

    const dateMatch = row.match(/(\d{2}\/\d{2}\/\d{2})\s*<br\/>\s*([0-9:]+)/);
    if (!dateMatch) continue;

    const links = [...row.matchAll(/<a[^>]*class="bold"[^>]*>([\s\S]*?)<\/a>/g)]
      .map(m => cleanTeamName(m[1]));

    if (links.length < 2) continue;

    const homeTeam = links[0];
    const awayTeam = links[1];

    const ourHome = homeTeam.toLowerCase().includes(OUR_TEAM.toLowerCase());
    const ourAway = awayTeam.toLowerCase().includes(OUR_TEAM.toLowerCase());

    if (!ourHome && !ourAway) continue;

    const opponent = ourHome ? awayTeam : homeTeam;
    const matchDate = parseLeagueDate(dateMatch[1]);
    const kickoffTime = dateMatch[2] === "00:00" ? null : dateMatch[2];
    const kickoffTbc = dateMatch[2] === "00:00";
    const isHome = ourHome;

    const exists = await pool.query(
      `
      SELECT id
      FROM fixtures
      WHERE match_date::date = $1::date
        AND LOWER(opponent) = LOWER($2)
      LIMIT 1
      `,
      [matchDate, opponent]
    );

    if (exists.rows.length > 0) continue;

    await pool.query(
      `
      INSERT INTO fixtures
        (opponent, match_date, kickoff_time, kickoff_tbc, is_home, venue, played)
      VALUES
        ($1, $2, $3, $4, $5, $6, false)
      `,
      [opponent, matchDate, kickoffTime, kickoffTbc, isHome, "Staveley MWFC, S43 3JL"]
    );
  }
}

export default async function handler(req, res) {
  try {
    try {
      await syncFixturesFromLeagueRepublic();
    } catch (syncError) {
      console.error("Fixture sync failed inside dashboard", syncError);
    }

    const playersResult = await pool.query(`
      SELECT id, name, display_name, position
      FROM players
      ORDER BY name ASC
    `);

    const fixturesResult = await pool.query(`
      SELECT id, opponent, match_date, kickoff_time, played, home_score, away_score, is_home
      FROM fixtures
      ORDER BY match_date ASC
    `);

    const today = new Date().toISOString().split("T")[0];

    const fixtures = fixturesResult.rows;
    const players = playersResult.rows;

    const upcomingFixtures = fixtures.filter(f => !f.played);

const nextFixtureRaw = upcomingFixtures.length > 0 ? upcomingFixtures[0] : null;

const nextFixture = nextFixtureRaw
  ? {
      id: nextFixtureRaw.id,
      opponent: nextFixtureRaw.opponent,
      matchDate: nextFixtureRaw.match_date,
      kickoffTime: nextFixtureRaw.kickoff_time,
      played: nextFixtureRaw.played,
      homeScore: nextFixtureRaw.home_score,
      awayScore: nextFixtureRaw.away_score,
      isHome: nextFixtureRaw.is_home
    }
  : null;

    res.status(200).json({
      nextFixture,
      votingOpenFixture: null,
      totalSquadValue: players.length * 5000000,
      seasonRecord: {
        played: fixtures.filter(f => f.played).length,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0
      },
      topScorer: null,
      topLevel: players[0]
        ? {
            playerId: players[0].id,
            playerName: players[0].display_name ?? players[0].name,
            level: 1,
            totalXp: 0
          }
        : null,
      recentResults: [],
      hallOfFame: {
        topScorer: null,
        topRated: null,
        mostMotms: null,
        muppetKing: null
      },
      squadPhotoUrl: null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Dashboard failed",
      message: error.message
    });
  }
}
