import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function mapSeason(row) {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    isCurrent: row.is_current,
    createdAt: row.created_at,
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const result = await pool.query("SELECT * FROM seasons ORDER BY start_date ASC");
      return res.status(200).json(result.rows.map(mapSeason));
    }

    if (req.method === "POST") {
      const result = await pool.query(
        `
        INSERT INTO seasons (name, start_date, end_date, is_current)
        VALUES ('March - July 2026', '2026-03-01', '2026-07-31', true)
        ON CONFLICT DO NOTHING
        RETURNING *
        `
      );

      await pool.query(`
        UPDATE seasons
        SET is_current = CASE WHEN name = 'March - July 2026' THEN true ELSE false END
      `);

      const seasonResult = await pool.query(`
        SELECT *
        FROM seasons
        WHERE name = 'March - July 2026'
        LIMIT 1
      `);

      const season = seasonResult.rows[0];

      await pool.query(
        `
        UPDATE fixtures
        SET season_id = $1
        WHERE match_date::date >= '2026-03-01'
          AND match_date::date <= '2026-07-31'
        `,
        [season.id]
      );

      return res.status(200).json({
        season: mapSeason(season),
        fixturesUpdated: true,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({
      error: "Seasons failed",
      message: error.message,
    });
  }
}
