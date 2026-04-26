import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  try {
    const result = await pool.query(`
      SELECT id, name, display_name, position, scouting_profile, photo_url
      FROM players
      ORDER BY name ASC
    `);

    const players = result.rows.map(p => ({
      playerId: p.id,
      playerName: p.name,
      displayName: p.display_name,
      position: p.position,
      scoutingProfile: p.scouting_profile,
      photoUrl: p.photo_url,
      apps: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      motmVotes: 0,
      momAwards: 0,
      muppetAwards: 0,
      marketValue: 5000000,
      avgRating: null,
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
