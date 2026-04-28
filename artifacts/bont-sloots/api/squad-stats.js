import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.display_name,
        p.position,
        p.scouting_profile,
        p.photo_url,

        COUNT(DISTINCT fp.id) FILTER (WHERE fp.present = true) AS apps,

        COUNT(DISTINCT s_goal.id) AS goals,
        COUNT(DISTINCT s_assist.id) AS assists,
        COUNT(DISTINCT s_clean.id) AS clean_sheets,

        COALESCE(AVG(pr.rating), NULL) AS avg_rating

      FROM players p

      LEFT JOIN fixture_players fp
        ON fp.player_id = p.id

      LEFT JOIN stats s_goal
        ON s_goal.player_id = p.id
        AND s_goal.type = 'goal'

      LEFT JOIN stats s_assist
        ON s_assist.player_id = p.id
        AND s_assist.type = 'assist'

      LEFT JOIN stats s_clean
        ON s_clean.player_id = p.id
        AND s_clean.type = 'clean_sheet'

      LEFT JOIN player_ratings pr
        ON pr.player_id = p.id

      GROUP BY
        p.id,
        p.name,
        p.display_name,
        p.position,
        p.scouting_profile,
        p.photo_url

      ORDER BY p.name ASC
    `);

    const players = result.rows.map(p => ({
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
      momAwards: 0,
      muppetAwards: 0,
      marketValue: 5000000,
      avgRating: p.avg_rating === null ? null : Number(p.avg_rating),
      recentForm: [],
      lastMatchChange: null,
      isKing: false,
      isMuppet: false,
      totalXp: 0,
      progressionXp: 0,
      level: 1,
      xpIntoLevel: 0,
      xpForNextLevel: 1000,
      xpBreakdown: {},
      achievementXp: 0,
      achievementCount: 0
    }));

    res.status(200).json(players);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Squad stats failed",
      message: error.message
    });
  }
}
