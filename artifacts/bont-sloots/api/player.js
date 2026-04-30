import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Player id is required" });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const playerResult = await pool.query(
      `
      SELECT
        id,
        name,
        display_name,
        position,
        scouting_profile,
        photo_url,
        created_at
      FROM players
      WHERE id = $1
      `,
      [id]
    );

    const player = playerResult.rows[0];

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    const statsResult = await pool.query(
      `
      SELECT type, COUNT(*)::int AS count
      FROM stats
      WHERE player_id = $1
      GROUP BY type
      `,
      [id]
    );

    const getStat = (type) =>
      Number(statsResult.rows.find(s => s.type === type)?.count || 0);

    const totalGoals = getStat("goal");
    const totalAssists = getStat("assist");
    const totalCleanSheets = getStat("clean_sheet");

    const appsResult = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM fixture_players
      WHERE player_id = $1
        AND present = true
      `,
      [id]
    );

    const apps = Number(appsResult.rows[0]?.count || 0);

    const ratingsResult = await pool.query(
      `
      SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating
      FROM player_ratings
      WHERE player_id = $1
      `,
      [id]
    );

    const avgRating =
      ratingsResult.rows[0]?.avg_rating === null
        ? null
        : Number(ratingsResult.rows[0]?.avg_rating);

    const awardsResult = await pool.query(
      `
      SELECT
        a.id,
        a.player_id,
        a.fixture_id,
        a.type,
        a.created_at,
        f.opponent AS fixture_opponent
      FROM awards a
      LEFT JOIN fixtures f ON f.id = a.fixture_id
      WHERE a.player_id = $1
      ORDER BY a.created_at ASC
      `,
      [id]
    );

    const momCount = awardsResult.rows.filter(a => a.type === "mom").length;
    const motmCount = awardsResult.rows.filter(a => a.type === "motm").length;

    const historyResult = await pool.query(
      `
      SELECT
        fp.fixture_id,
        f.opponent,
        f.match_date,
        f.home_score,
        f.away_score,
        f.is_home,
        pr.rating,
        COUNT(s_goal.id)::int AS goals,
        COUNT(s_assist.id)::int AS assists
      FROM fixture_players fp
      JOIN fixtures f ON f.id = fp.fixture_id
      LEFT JOIN player_ratings pr
        ON pr.fixture_id = fp.fixture_id
        AND pr.player_id = fp.player_id
      LEFT JOIN stats s_goal
        ON s_goal.fixture_id = fp.fixture_id
        AND s_goal.player_id = fp.player_id
        AND s_goal.type = 'goal'
      LEFT JOIN stats s_assist
        ON s_assist.fixture_id = fp.fixture_id
        AND s_assist.player_id = fp.player_id
        AND s_assist.type = 'assist'
      WHERE fp.player_id = $1
        AND fp.present = true
      GROUP BY
        fp.fixture_id,
        f.opponent,
        f.match_date,
        f.home_score,
        f.away_score,
        f.is_home,
        pr.rating
      ORDER BY f.match_date DESC
      `,
      [id]
    );

    const matchHistory = historyResult.rows.map(m => ({
      fixtureId: m.fixture_id,
      opponent: m.opponent,
      matchDate: m.match_date,
      homeScore: m.home_score,
      awayScore: m.away_score,
      isHome: m.is_home,
      rating: m.rating === null ? null : Number(m.rating),
      goals: Number(m.goals || 0),
      assists: Number(m.assists || 0),
      valueChange: null,
      valueBreakdown: null,
      isKing: false,
    }));

    return res.status(200).json({
      id: player.id,
      name: player.name,
      displayName: player.display_name,
      position: player.position,
      scoutingProfile: player.scouting_profile,
      photoUrl: player.photo_url,
      isMuppet: false,
      createdAt: player.created_at,
      totalGoals,
      totalAssists,
      totalCleanSheets,
      momCount,
      motmCount,
      motmVotes: 0,
      isKing: false,
      apps,
      marketValue: 5000000,
      avgRating,
      recentForm: [],
      matchHistory,
      comments: [],
      totalXp: 0,
      progressionXp: 0,
      level: 1,
      xpIntoLevel: 0,
      xpForNextLevel: 1000,
      xpBreakdown: {},
      achievementXp: 0,
      manualXpBonus: 0,
      xpBonuses: [],
      achievements: [],
      awardHistory: awardsResult.rows.map(a => ({
        id: a.id,
        playerId: a.player_id,
        playerName: player.name,
        fixtureId: a.fixture_id,
        fixtureOpponent: a.fixture_opponent,
        type: a.type,
        createdAt: a.created_at,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Player profile failed",
      message: error.message,
    });
  }
}
