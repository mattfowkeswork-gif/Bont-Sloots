import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const TEAM_URL = "https://staveley6aside.leaguerepublic.com/team/480035827/849970515.html";
const STANDINGS_URL = "https://staveley6aside.leaguerepublic.com/standingsForDate/177116197/2/-1/-1.html";
const OUR_TEAM = "Real Sosobad";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "en-GB,en;q=0.9",
  "Referer": "https://staveley6aside.leaguerepublic.com/"
};

function isGkOrDef(position) {
  if (!position) return true;
  return position === "GK" || position === "DEF";
}

function xpRequiredForLevel(level) {
  if (level <= 5) return 500;
  if (level <= 15) return 1000;
  if (level <= 30) return 2500;
  return 5000;
}

function calculateLevel(progressionXp) {
  let level = 1;
  let remaining = progressionXp;
  while (true) {
    const cost = xpRequiredForLevel(level + 1);
    if (remaining < cost) break;
    remaining -= cost;
    level++;
  }
  return level;
}

function basicAchievementXp({ apps, goals, assists, cleanSheets, momAwards, emergencyGk }) {
  let xp = 0;

  if (apps >= 1) xp += 100;
  if (assists >= 1) xp += 100;
  if (cleanSheets >= 1) xp += 100;
  if (apps >= 5) xp += 250;
  if (goals >= 1) xp += 150;

  if (apps >= 10) xp += 500;
  if (apps >= 25) xp += 1250;
  if (apps >= 50) xp += 2500;
  if (apps >= 75) xp += 3500;
  if (apps >= 100) xp += 5000;

  if (goals >= 5) xp += 750;
  if (goals >= 10) xp += 750;
  if (goals >= 25) xp += 2000;
  if (goals >= 50) xp += 4500;

  if (assists >= 5) xp += 500;
  if (assists >= 10) xp += 750;
  if (assists >= 25) xp += 2000;
  if (assists >= 50) xp += 4500;

  if (cleanSheets >= 5) xp += 750;
  if (cleanSheets >= 10) xp += 750;
  if (cleanSheets >= 20) xp += 2500;
  if (cleanSheets >= 25) xp += 2000;
  if (cleanSheets >= 50) xp += 4500;

  if (momAwards >= 10) xp += 4000;
  if (emergencyGk >= 1) xp += 750;

  return xp;
}

function calculatePlayerDashboardXp(row) {
  const apps = Number(row.apps || 0);
  const goals = Number(row.goals || 0);
  const assists = Number(row.assists || 0);
  const cleanSheets = Number(row.clean_sheets || 0);
  const momAwards = Number(row.mom_awards || 0);
  const fanMotmAwards = Number(row.fan_motm_awards || 0);
  const doubleMotmAwards = Number(row.double_motm_awards || 0);
  const muppetAwards = Number(row.muppet_awards || 0);
  const emergencyGk = Number(row.emergency_gk || 0);

  const cleanSheetRate = isGkOrDef(row.position) ? 50 : 10;

  const baseXp =
    apps * 100 +
    goals * 50 +
    assists * 50 +
    cleanSheets * cleanSheetRate +
    momAwards * 200;

  const achievementXp = basicAchievementXp({ apps, goals, assists, cleanSheets, momAwards, emergencyGk });
  const progressionXp = baseXp + achievementXp;
  const totalXp = progressionXp + muppetAwards * -100;
  const level = calculateLevel(progressionXp);

  return {
    playerId: row.id,
    playerName: row.display_name ?? row.name,
    level,
    totalXp,
  };
}

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

async function scrapeLeagueTable() {
  try {
    const response = await fetch(STANDINGS_URL, { headers: BROWSER_HEADERS });
    const html = await response.text();

    const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
    if (!tbodyMatch) return [];

    const rows = [];
    const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let trMatch;

    while ((trMatch = trPattern.exec(tbodyMatch[1])) !== null) {
      const rowHtml = trMatch[1];

      const cells = [];
      const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
      let tdMatch;

      while ((tdMatch = tdPattern.exec(rowHtml)) !== null) {
        cells.push(tdMatch[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim());
      }

      const nameMatch = rowHtml.match(/<a[^>]*>\s*([\s\S]*?)\s*<\/a>/);
      const name = cleanTeamName(nameMatch ? nameMatch[1] : cells[1]);

      if (!name || cells.length < 10) continue;

      const played = Number(cells[2] || 0);
      const wins = Number(cells[3] || 0);
      const draws = Number(cells[4] || 0);
      const losses = Number(cells[5] || 0);
      const gf = Number(cells[6] || 0);
      const ga = Number(cells[7] || 0);
      const gd = Number(cells[8] || gf - ga);
      const points = Number(cells[9] || 0);

      rows.push({
        rank: Number(cells[0] || rows.length + 1),
        name,
        played,
        wins,
        draws,
        losses,
        gf,
        ga,
        gd,
        points,
        isUs: name.toLowerCase().includes(OUR_TEAM.toLowerCase()),
      });
    }

    return rows;
  } catch (error) {
    console.error("League table scrape failed", error);
    return [];
  }
}

async function syncFixturesFromLeagueRepublic() {
  const response = await fetch(TEAM_URL, { headers: BROWSER_HEADERS });
  const html = await response.text();

  const upcomingStart = html.indexOf("<h2>Matches</h2>");
  const upcomingHtml = upcomingStart >= 0 ? html.slice(upcomingStart) : html;

  const seasonResult = await pool.query(
    `
    SELECT id
    FROM seasons
    WHERE is_current = true
    LIMIT 1
    `
  );

  const currentSeasonId = seasonResult.rows[0]?.id ?? null;

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
        (opponent, match_date, kickoff_time, kickoff_tbc, is_home, venue, played, season_id)
      VALUES
        ($1, $2, $3, $4, $5, $6, false, $7)
      `,
      [opponent, matchDate, kickoffTime, kickoffTbc, isHome, "Staveley MWFC, S43 3JL", currentSeasonId]
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

    const topLevelRowsResult = await pool.query(`
      WITH present_apps AS (
        SELECT player_id, COUNT(*)::int AS apps
        FROM fixture_players
        WHERE present = true
        GROUP BY player_id
      ),
      stat_counts AS (
        SELECT s.player_id, s.type, COUNT(*)::int AS count
        FROM stats s
        JOIN fixture_players fp
          ON fp.fixture_id = s.fixture_id
          AND fp.player_id = s.player_id
          AND fp.present = true
        GROUP BY s.player_id, s.type
      ),
      award_counts AS (
        SELECT a.player_id, a.type, COUNT(*)::int AS count
        FROM awards a
        JOIN fixture_players fp
          ON fp.fixture_id = a.fixture_id
          AND fp.player_id = a.player_id
          AND fp.present = true
        GROUP BY a.player_id, a.type
      )
      SELECT
        p.id,
        p.name,
        p.display_name,
        p.position,
        COALESCE(pa.apps, 0)::int AS apps,
        COALESCE(MAX(CASE WHEN sc.type = 'goal' THEN sc.count END), 0)::int AS goals,
        COALESCE(MAX(CASE WHEN sc.type = 'assist' THEN sc.count END), 0)::int AS assists,
        COALESCE(MAX(CASE WHEN sc.type = 'clean_sheet' THEN sc.count END), 0)::int AS clean_sheets,
        COALESCE(MAX(CASE WHEN sc.type = 'emergency_gk' THEN sc.count END), 0)::int AS emergency_gk,
        COALESCE(MAX(CASE WHEN ac.type = 'mom' THEN ac.count END), 0)::int AS mom_awards,
        COALESCE(MAX(CASE WHEN ac.type = 'motm' THEN ac.count END), 0)::int AS muppet_awards
      FROM players p
      LEFT JOIN present_apps pa ON pa.player_id = p.id
      LEFT JOIN stat_counts sc ON sc.player_id = p.id
      LEFT JOIN award_counts ac ON ac.player_id = p.id
      LEFT JOIN (
        SELECT fm.player_id, COUNT(*)::int AS double_motm_awards
        FROM awards fm
        JOIN awards m
          ON m.fixture_id = fm.fixture_id
          AND m.player_id = fm.player_id
          AND m.type = 'mom'
        WHERE fm.type = 'fan_motm'
        GROUP BY fm.player_id
      ) dm ON dm.player_id = p.id
      GROUP BY p.id, p.name, p.display_name, p.position, pa.apps
    `);

    const topLevel = topLevelRowsResult.rows
      .map(calculatePlayerDashboardXp)
      .sort((a, b) => b.level - a.level || b.totalXp - a.totalXp)[0] ?? null;

    const votingOpenResult = await pool.query(`
      SELECT
        f.id,
        f.opponent,
        f.match_date,
        f.voting_closes_at
      FROM fixtures f
      WHERE f.played = true
        AND f.voting_closes_at IS NOT NULL
        AND f.voting_closes_at > NOW()
        AND EXISTS (
          SELECT 1
          FROM fixture_players fp
          WHERE fp.fixture_id = f.id
            AND fp.present = true
        )
      ORDER BY f.match_date DESC
      LIMIT 1
    `);

    const votingOpenFixture = votingOpenResult.rows[0]
      ? {
          id: votingOpenResult.rows[0].id,
          opponent: votingOpenResult.rows[0].opponent,
          matchDate: votingOpenResult.rows[0].match_date,
          votingClosesAt: votingOpenResult.rows[0].voting_closes_at,
        }
      : null;

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

    const leagueTable = await scrapeLeagueTable();

    res.status(200).json({
      nextFixture,
      votingOpenFixture,
      leagueTable,
      
      seasonRecord: (() => {
        const playedFixtures = fixtures.filter(f =>
          f.played &&
          f.home_score !== null &&
          f.away_score !== null
        );

        let wins = 0;
        let draws = 0;
        let losses = 0;
        let goalsFor = 0;
        let goalsAgainst = 0;

        for (const f of playedFixtures) {
          const ourScore = f.is_home ? f.home_score : f.away_score;
          const theirScore = f.is_home ? f.away_score : f.home_score;

          goalsFor += Number(ourScore || 0);
          goalsAgainst += Number(theirScore || 0);

          if (ourScore > theirScore) wins++;
          else if (ourScore < theirScore) losses++;
          else draws++;
        }

        return {
          played: playedFixtures.length,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst
        };
      })(),
      topScorer: null,
      topLevel,
      recentResults: fixtures
        .filter(f => f.played)
        .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))
        .slice(0, 5)
        .map(f => ({
          id: f.id,
          opponent: f.opponent,
          matchDate: f.match_date,
          homeScore: f.home_score,
          awayScore: f.away_score,
          isHome: f.is_home,
          result:
            f.home_score === null || f.away_score === null
              ? null
              : f.home_score > f.away_score
                ? "W"
                : f.home_score < f.away_score
                  ? "L"
                  : "D"
        })),
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
