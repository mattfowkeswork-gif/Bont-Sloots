import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function normaliseName(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function overrideKey(opponent) {
  return `scout_override_${normaliseName(opponent).replace(/\s+/g, "_")}`;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { opponent } = req.query;
      if (!opponent) return res.status(400).json({ error: "opponent required" });

      const key = overrideKey(opponent);
      const result = await pool.query("SELECT value FROM settings WHERE key = $1", [key]);

      if (result.rows.length === 0) return res.status(200).json(null);

      return res.status(200).json(JSON.parse(result.rows[0].value));
    }

    if (req.method === "POST") {
      const { opponent, rank, gf, ga, form, teamUrl, notes } = req.body;

      if (!opponent) return res.status(400).json({ error: "opponent required" });

      const key = overrideKey(opponent);
      const value = JSON.stringify({
        name: opponent,
        rank,
        gf,
        ga,
        form,
        teamUrl: teamUrl || "",
        notes: notes || ""
      });

      await pool.query(
        `
        INSERT INTO settings (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `,
        [key, value]
      );

      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { opponent } = req.query;
      if (!opponent) return res.status(400).json({ error: "opponent required" });

      const key = overrideKey(opponent);
      await pool.query("DELETE FROM settings WHERE key = $1", [key]);

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({
      error: "Scout override failed",
      message: error.message,
    });
  }
}
