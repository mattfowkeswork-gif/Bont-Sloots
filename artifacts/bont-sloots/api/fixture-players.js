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
      return res.status(400).json({ error: "Fixture id is required" });
    }

    if (req.method === "GET") {
      const result = await pool.query(
        `
        SELECT
          p.id AS "playerId",
          p.name,
          CASE
            WHEN fp.player_id IS NULL THEN false
            ELSE true
          END AS present
        FROM players p
        LEFT JOIN fixture_players fp
          ON fp.player_id = p.id
          AND fp.fixture_id = $1
        ORDER BY p.name ASC
        `,
        [id]
      );

      return res.status(200).json(result.rows);
    }

    if (req.method === "PUT") {
      const { playerIds } = req.body;

      if (!Array.isArray(playerIds)) {
        return res.status(400).json({ error: "playerIds must be an array" });
      }

      await pool.query("DELETE FROM fixture_players WHERE fixture_id = $1", [id]);

      for (const playerId of playerIds) {
        await pool.query(
          `
          INSERT INTO fixture_players (fixture_id, player_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          `,
          [id, playerId]
        );
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Fixture players failed",
      message: error.message,
    });
  }
}
