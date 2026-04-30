import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export default async function handler(req, res) {
  const fixtureId = Number(req.query.id);
  const deviceId = req.query.deviceId;

  const fixture = await pool.query(`SELECT id, played, voting_closes_at FROM fixtures WHERE id=$1`, [fixtureId]);
  if (!fixture.rows[0]) return res.status(404).json({ error: "Fixture not found" });

  const f = fixture.rows[0];
  const votingClosesAt = f.voting_closes_at ? new Date(f.voting_closes_at) : null;
  const isOpen = !!votingClosesAt && new Date() < votingClosesAt && f.played === true;

  const eligible = await pool.query(`
    SELECT fp.player_id, COALESCE(p.display_name, p.name) AS player_name
    FROM fixture_players fp
    JOIN players p ON p.id = fp.player_id
    WHERE fp.fixture_id=$1 AND fp.present=true
    ORDER BY COALESCE(p.display_name, p.name)
  `, [fixtureId]);

  const votes = await pool.query(`
    SELECT player_id, COUNT(*)::int AS votes
    FROM motm_votes
    WHERE fixture_id=$1
    GROUP BY player_id
  `, [fixtureId]);

  const existing = deviceId ? await pool.query(
    `SELECT id FROM motm_votes WHERE fixture_id=$1 AND device_id=$2 LIMIT 1`,
    [fixtureId, deviceId]
  ) : { rows: [] };

  const eligiblePlayers = eligible.rows.map(p => ({
    playerId: p.player_id,
    playerName: p.player_name,
    present: true
  }));

  const results = eligiblePlayers.map(p => ({
    playerId: p.playerId,
    playerName: p.playerName,
    votes: Number(votes.rows.find(v => v.player_id === p.playerId)?.votes || 0)
  }));

  res.status(200).json({
    isOpen,
    votingClosesAt: votingClosesAt ? votingClosesAt.toISOString() : null,
    hasVoted: existing.rows.length > 0,
    eligiblePlayers,
    results
  });
}
