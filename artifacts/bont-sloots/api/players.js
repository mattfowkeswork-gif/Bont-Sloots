import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

function mapPlayer(row) {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    position: row.position,
    scoutingProfile: row.scouting_profile,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
  };
}

export default async function handler(req, res) {
  try {
    const id = req.query.id ? Number(req.query.id) : null;

    if (req.method === "GET") {
      const result = await pool.query(`
        SELECT id, name, display_name, position, scouting_profile, photo_url, created_at
        FROM players
        ORDER BY name ASC
      `);

      return res.status(200).json(result.rows.map(mapPlayer));
    }

    if (req.method === "POST") {
      const data = req.body || {};

      if (!data.name) {
        return res.status(400).json({ error: "Player name is required" });
      }

      const result = await pool.query(`
        INSERT INTO players (name, display_name, position, scouting_profile)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, display_name, position, scouting_profile, photo_url, created_at
      `, [
        data.name,
        data.displayName ?? null,
        data.position ?? null,
        data.scoutingProfile ?? null,
      ]);

      return res.status(201).json(mapPlayer(result.rows[0]));
    }

    if (req.method === "PUT") {
      if (!id) {
        return res.status(400).json({ error: "Player id is required" });
      }

      const data = req.body || {};

      const result = await pool.query(`
        UPDATE players
        SET
          name = $1,
          display_name = $2,
          position = $3,
          scouting_profile = $4
        WHERE id = $5
        RETURNING id, name, display_name, position, scouting_profile, photo_url, created_at
      `, [
        data.name,
        data.displayName ?? null,
        data.position ?? null,
        data.scoutingProfile ?? null,
        id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Player not found" });
      }

      return res.status(200).json(mapPlayer(result.rows[0]));
    }

    if (req.method === "DELETE") {
      if (!id) {
        return res.status(400).json({ error: "Player id is required" });
      }

      const result = await pool.query(`
        DELETE FROM players
        WHERE id = $1
        RETURNING id
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Player not found" });
      }

      return res.status(204).end();
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Players API failed",
      message: error.message
    });
  }
}
