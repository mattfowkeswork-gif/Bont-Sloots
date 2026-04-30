import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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

function xpToReachLevel(level) {
  if (level <= 0) return 0;
  let total = 0;
  for (let l = 1; l <= level; l++) total += xpRequiredForLevel(l);
  return total;
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

function calculateXp(row) {
  const apps = Number(row.apps || 0);
  const goals = Number(row.goals || 0);
  const assists = Number(row.assists || 0);
  const cleanSheets = Number(row.clean_sheets || 0);
  const momAwards = Number(row.mom_awards || 0);
  const muppetAwards = Number(row.muppet_awards || 0);
  const emergencyGk = Number(row.emergency_gk || 0);

  const cleanSheetRate = isGkOrDef(row.position) ? 50 : 10;

  const xpBreakdown = {
    appearances: apps * 100,
    goals: goals * 50,
    assists: assists * 50,
    cleanSheets: cleanSheets * cleanSheetRate,
    mom: momAwards * 200,
    muppet: muppetAwards * -100,
  };

  const achievementXp = basicAchievementXp({
    apps,
    goals,
    assists,
    cleanSheets,
    momAwards,
    emergencyGk,
  });

  const progressionXp =
    xpBreakdown.appearances +
    xpBreakdown.goals +
    xpBreakdown.assists +
    xpBreakdown.cleanSheets +
    xpBreakdown.mom +
    achievementXp;

  const totalXp = progressionXp + xpBreakdown.muppet;
  const level = calculateLevel(progressionXp);
  const xpAtCurrentLevel = xpToReachLevel(level) - xpRequiredForLevel(1);

  return {
    totalXp,
    progressionXp,
    level,
    xpIntoLevel: progressionXp - xpAtCurrentLevel,
    xpForNextLevel: xpRequiredForLevel(level + 1),
    xpBreakdown,
    achievementXp,
  };
}

export default async function handler(req, res) {
  try {
    const rawSeasonId = req.query.seasonId;
    const seasonId = rawSeasonId === "all" || !rawSeasonId ? null : Number(rawSeasonId);

    const result = await pool.query(`
      WITH present_apps AS (
        SELECT fp.player_id, COUNT(*)::int AS apps
        FROM fixture_players fp
        JOIN fixtures f ON f.id = fp.fixture_id
        WHERE fp.present = true
          AND ($1::int IS NULL OR f.season_id = $1::int)
        GROUP BY fp.player_id
      ),
      stat_counts AS (
        SELECT s.player_id, s.type, COUNT(*)::int AS count
        FROM stats s
        JOIN fixture_players fp
          ON fp.fixture_id = s.fixture_id
          AND fp.player_id = s.player_id
          AND fp.present = true
        JOIN fixtures f ON f.id = s.fixture_id
        WHERE ($1::int IS NULL OR f.season_id = $1::int)
        GROUP BY s.player_id, s.type
      ),
      award_counts AS (
        SELECT a.player_id, a.type, COUNT(*)::int AS count
        FROM awards a
        JOIN fixture_players fp
          ON fp.fixture_id = a.fixture_id
          AND fp.player_id = a.player_id
          AND fp.present = true
        JOIN fixtures f ON f.id = a.fixture_id
        WHERE ($1::int IS NULL OR f.season_id = $1::int)
        GROUP BY a.player_id, a.type
      ),
      ratings AS (
        SELECT pr.player_id, ROUND(AVG(pr.rating)::numeric, 1) AS avg_rating
        FROM player_ratings pr
        JOIN fixture_players fp
          ON fp.fixture_id = pr.fixture_id
          AND fp.player_id = pr.player_id
          AND fp.present = true
        JOIN fixtures f ON f.id = pr.fixture_id
        WHERE ($1::int IS NULL OR f.season_id = $1::int)
        GROUP BY pr.player_id
      )
      SELECT
        p.id,
        p.name,
        p.display_name,
        p.position,
        p.scouting_profile,
        p.photo_url,
        COALESCE(pa.apps, 0)::int AS apps,
        COALESCE(MAX(CASE WHEN sc.type = 'goal' THEN sc.count END), 0)::int AS goals,
        COALESCE(MAX(CASE WHEN sc.type = 'assist' THEN sc.count END), 0)::int AS assists,
        COALESCE(MAX(CASE WHEN sc.type = 'clean_sheet' THEN sc.count END), 0)::int AS clean_sheets,
        COALESCE(MAX(CASE WHEN sc.type = 'emergency_gk' THEN sc.count END), 0)::int AS emergency_gk,
        COALESCE(MAX(CASE WHEN ac.type = 'mom' THEN ac.count END), 0)::int AS mom_awards,
        COALESCE(MAX(CASE WHEN ac.type = 'motm' THEN ac.count END), 0)::int AS muppet_awards,
        r.avg_rating
      FROM players p
      LEFT JOIN present_apps pa ON pa.player_id = p.id
      LEFT JOIN stat_counts sc ON sc.player_id = p.id
      LEFT JOIN award_counts ac ON ac.player_id = p.id
      LEFT JOIN ratings r ON r.player_id = p.id
      GROUP BY
        p.id,
        p.name,
        p.display_name,
        p.position,
        p.scouting_profile,
        p.photo_url,
        pa.apps,
        r.avg_rating
    `, [seasonId]);

    const players = result.rows.map(p => {
      const xp = calculateXp(p);

      return {
        playerId: p.id,
        playerName: p.name,
        displayName: p.display_name,
        position: p.position,
        scoutingProfile: p.scouting_profile,
        photoUrl: p.photo_url,
        apps: Number(p.apps || 0),
        goals: Number(p.goals || 0),
        assists: Number(p.assists || 0),
        cleanSheets: Number(p.clean_sheets || 0),
        motmVotes: 0,
        momAwards: Number(p.mom_awards || 0),
        muppetAwards: Number(p.muppet_awards || 0),
        marketValue: 5000000,
        avgRating: p.avg_rating === null ? null : Number(p.avg_rating),
        recentForm: [],
        lastMatchChange: null,
        isKing: false,
        isMuppet: false,
        totalXp: xp.totalXp,
        progressionXp: xp.progressionXp,
        level: xp.level,
        xpIntoLevel: xp.xpIntoLevel,
        xpForNextLevel: xp.xpForNextLevel,
        xpBreakdown: xp.xpBreakdown,
        achievementXp: xp.achievementXp,
        achievementCount: 0
      };
    });

    players.sort((a, b) =>
      b.level - a.level ||
      b.totalXp - a.totalXp ||
      a.playerName.localeCompare(b.playerName)
    );

    res.status(200).json(players);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Squad stats failed",
      message: error.message
    });
  }
}
