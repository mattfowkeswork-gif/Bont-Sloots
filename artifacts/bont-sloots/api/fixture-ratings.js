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
          p.name AS "playerName",
          pr.rating
        FROM fixture_players fp
        JOIN players p ON p.id = fp.player_id
        LEFT JOIN player_ratings pr
          ON pr.fixture_id = fp.fixture_id
          AND pr.player_id = fp.player_id
        WHERE fp.fixture_id = $1
          AND fp.present = true
        ORDER BY p.name ASC
        `,
        [id]
      );

      return res.status(200).json(result.rows);
    }

    if (req.method === "PUT") {
      const { ratings } = req.body;

      if (!Array.isArray(ratings)) {
        return res.status(400).json({ error: "ratings must be an array" });
      }

      for (const item of ratings) {
        await pool.query(
          `
          INSERT INTO player_ratings (fixture_id, player_id, rating)
          VALUES ($1, $2, $3)
          ON CONFLICT (fixture_id, player_id)
          DO UPDATE SET rating = EXCLUDED.rating
          `,
          [id, item.playerId, item.rating]
        );
      }

      const topResult = await pool.query(
        `
        SELECT
          pr.player_id,
          p.name
        FROM player_ratings pr
        JOIN players p ON p.id = pr.player_id
        WHERE pr.fixture_id = $1
        ORDER BY pr.rating DESC, p.name ASC
        LIMIT 1
        `,
        [id]
      );

      const winner = topResult.rows[0];

      if (winner) {
        await pool.query(
          `
          DELETE FROM awards
          WHERE fixture_id = $1
            AND type = 'mom'
          `,
          [id]
        );

        await pool.query(
          `
          INSERT INTO awards (fixture_id, player_id, type)
          VALUES ($1, $2, 'mom')
          `,
          [id, winner.player_id]
        );
      }

      return res.status(200).json({
        success: true,
        momWinner: winner ? winner.name : null
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Fixture ratings failed",
      message: error.message,
    });
  }
}
