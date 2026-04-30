import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const fixtureId = Number(req.query.id);
  const { playerId, deviceId } = req.body || {};

  if (!fixtureId || !playerId || !deviceId) {
    return res.status(400).json({ error: "Missing vote details" });
  }

  const fixture = await pool.query(`SELECT id, played, voting_closes_at FROM fixtures WHERE id=$1`, [fixtureId]);
  const f = fixture.rows[0];
  if (!f) return res.status(404).json({ error: "Fixture not found" });

  const votingClosesAt = f.voting_closes_at ? new Date(f.voting_closes_at) : null;
  const isOpen = !!votingClosesAt && new Date() < votingClosesAt && f.played === true;
  if (!isOpen) return res.status(400).json({ error: "Voting is not open" });

  const already = await pool.query(
    `SELECT id FROM motm_votes WHERE fixture_id=$1 AND device_id=$2 LIMIT 1`,
    [fixtureId, deviceId]
  );
  if (already.rows.length > 0) return res.status(409).json({ error: "Already voted" });

  const present = await pool.query(`
    SELECT id FROM fixture_players
    WHERE fixture_id=$1 AND player_id=$2 AND present=true
    LIMIT 1
  `, [fixtureId, Number(playerId)]);

  if (present.rows.length === 0) {
    return res.status(400).json({ error: "Player was not present" });
  }

  await pool.query(
    `INSERT INTO motm_votes (fixture_id, player_id, device_id) VALUES ($1,$2,$3)`,
    [fixtureId, Number(playerId), deviceId]
  );

  res.status(201).json({ ok: true });
}
