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
        id,
        opponent,
        match_date AS "matchDate",
        kickoff_time AS "kickoffTime",
        kickoff_tbc AS "kickoffTbc",
        home_score AS "homeScore",
        away_score AS "awayScore",
        played,
        is_home AS "isHome",
        venue,
        notes,
        season_id AS "seasonId",
        voting_closes_at AS "votingClosesAt"
      FROM fixtures
      ORDER BY match_date ASC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Fixtures failed",
      message: error.message,
    });
  }
}
