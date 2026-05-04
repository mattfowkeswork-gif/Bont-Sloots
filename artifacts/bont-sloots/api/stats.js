import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function mapStat(row) {
  return {
    id: row.id,
    playerId: row.player_id,
    fixtureId: row.fixture_id,
    type: row.type,
    createdAt: row.created_at,
  };
}

export default async function handler(req, res) {
  try {
    const { id, fixtureId, type } = req.query;

    if (req.method === "GET") {
      let query = `
        SELECT id, player_id, fixture_id, type, created_at
        FROM stats
        WHERE 1=1
      `;
      const params = [];

      if (fixtureId) {
        params.push(fixtureId);
        query += ` AND fixture_id = $${params.length}`;
      }

      if (type) {
        params.push(type);
        query += ` AND type = $${params.length}`;
      }

      query += " ORDER BY created_at DESC";

      const result = await pool.query(query, params);
      return res.status(200).json(result.rows.map(mapStat));
    }

    if (req.method === "POST") {
      const { action } = req.query;

      if (action === "xp-bonus") {
        const { playerId, amount, reason } = req.body;

        if (!playerId || !amount || !reason) {
          return res.status(400).json({ error: "playerId, amount and reason are required" });
        }

        const result = await pool.query(
          `
          INSERT INTO player_xp_bonuses (player_id, amount, reason)
          VALUES ($1, $2, $3)
          RETURNING id, player_id, amount, reason, created_at
          `,
          [playerId, amount, reason]
        );

        return res.status(201).json({
          id: result.rows[0].id,
          playerId: result.rows[0].player_id,
          amount: result.rows[0].amount,
          reason: result.rows[0].reason,
          createdAt: result.rows[0].created_at,
        });
      }

      if (action === "muppet-award") {
        const { playerId, fixtureId } = req.body;

        if (!playerId || !fixtureId) {
          return res.status(400).json({ error: "playerId and fixtureId are required" });
        }

        const result = await pool.query(
          `
          INSERT INTO awards (player_id, fixture_id, type)
          VALUES ($1, $2, 'motm')
          RETURNING id, player_id, fixture_id, type, created_at
          `,
          [playerId, fixtureId]
        );

        return res.status(201).json({
          id: result.rows[0].id,
          playerId: result.rows[0].player_id,
          fixtureId: result.rows[0].fixture_id,
          type: result.rows[0].type,
          createdAt: result.rows[0].created_at,
        });
      }

      const { playerId, fixtureId, type } = req.body;

      if (!playerId || !fixtureId || !type) {
        return res.status(400).json({ error: "playerId, fixtureId and type are required" });
      }

      const result = await pool.query(
        `
        INSERT INTO stats (player_id, fixture_id, type)
        VALUES ($1, $2, $3)
        RETURNING id, player_id, fixture_id, type, created_at
        `,
        [playerId, fixtureId, type]
      );

      return res.status(201).json(mapStat(result.rows[0]));
    }

    if (req.method === "DELETE") {
      if (!id) {
        return res.status(400).json({ error: "Stat id is required" });
      }

      await pool.query("DELETE FROM stats WHERE id = $1", [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Stats failed",
      message: error.message,
    });
  }
}
