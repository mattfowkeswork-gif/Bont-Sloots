import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function mapFixture(row) {
  return {
    id: row.id,
    opponent: row.opponent,
    matchDate: row.match_date,
    kickoffTime: row.kickoff_time,
    kickoffTbc: row.kickoff_tbc,
    homeScore: row.home_score,
    awayScore: row.away_score,
    played: row.played,
    isHome: row.is_home,
    venue: row.venue,
    notes: row.notes,
    seasonId: row.season_id,
    votingClosesAt: row.voting_closes_at,
  };
}


async function getVoteStatus(fixtureId, deviceId) {
  const fixtureResult = await pool.query(
    `SELECT id, played, voting_closes_at FROM fixtures WHERE id = $1`,
    [fixtureId]
  );

  const fixture = fixtureResult.rows[0];
  if (!fixture) return null;

  const votingClosesAt = fixture.voting_closes_at ? new Date(fixture.voting_closes_at) : null;
  const isOpen = !!votingClosesAt && new Date() < votingClosesAt && fixture.played === true;

  const eligibleResult = await pool.query(`
    SELECT fp.player_id, COALESCE(p.display_name, p.name) AS player_name
    FROM fixture_players fp
    JOIN players p ON p.id = fp.player_id
    WHERE fp.fixture_id = $1
      AND fp.present = true
    ORDER BY COALESCE(p.display_name, p.name)
  `, [fixtureId]);

  const votesResult = await pool.query(`
    SELECT player_id, COUNT(*)::int AS votes
    FROM motm_votes
    WHERE fixture_id = $1
    GROUP BY player_id
  `, [fixtureId]);

  const eligiblePlayers = eligibleResult.rows.map(p => ({
    playerId: p.player_id,
    playerName: p.player_name,
    present: true,
  }));

  const results = eligiblePlayers.map(p => ({
    playerId: p.playerId,
    playerName: p.playerName,
    votes: Number(votesResult.rows.find(v => v.player_id === p.playerId)?.votes || 0),
  }));

  let hasVoted = false;
  if (deviceId) {
    const existingResult = await pool.query(
      `SELECT id FROM motm_votes WHERE fixture_id = $1 AND device_id = $2 LIMIT 1`,
      [fixtureId, deviceId]
    );
    hasVoted = existingResult.rows.length > 0;
  }

  return {
    isOpen,
    votingClosesAt: votingClosesAt ? votingClosesAt.toISOString() : null,
    hasVoted,
    eligiblePlayers,
    results,
  };
}

export default async function handler(req, res) {
  try {
    const id = req.query.id;
    const action = req.query.action;

    if (req.method === "GET" && action === "vote-status") {
      const fixtureId = Number(req.query.fixtureId);
      const deviceId = req.query.deviceId;

      if (!fixtureId) {
        return res.status(400).json({ error: "fixtureId is required" });
      }

      const status = await getVoteStatus(fixtureId, deviceId);
      if (!status) {
        return res.status(404).json({ error: "Fixture not found" });
      }

      return res.status(200).json(status);
    }

    if (req.method === "POST" && action === "close-voting") {
      const fixtureId = Number(req.query.fixtureId);

      if (!fixtureId) {
        return res.status(400).json({ error: "fixtureId is required" });
      }

      const winnerResult = await pool.query(`
        SELECT player_id, COUNT(*)::int AS votes
        FROM motm_votes
        WHERE fixture_id = $1
        GROUP BY player_id
        ORDER BY votes DESC, player_id ASC
        LIMIT 1
      `, [fixtureId]);

      await pool.query(
        `DELETE FROM awards WHERE fixture_id = $1 AND type = 'fan_motm'`,
        [fixtureId]
      );

      if (winnerResult.rows[0]) {
        await pool.query(`
          INSERT INTO awards (fixture_id, player_id, type)
          VALUES ($1, $2, 'fan_motm')
        `, [fixtureId, winnerResult.rows[0].player_id]);
      }

      const result = await pool.query(`
        UPDATE fixtures
        SET voting_closes_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [fixtureId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Fixture not found" });
      }

      return res.status(200).json({
        ...mapFixture(result.rows[0]),
        fanMotmWinnerPlayerId: winnerResult.rows[0]?.player_id ?? null,
      });
    }

    if (req.method === "POST" && action === "vote") {
      const fixtureId = Number(req.query.fixtureId);
      const { playerId, deviceId } = req.body || {};

      if (!fixtureId || !playerId || !deviceId) {
        return res.status(400).json({ error: "fixtureId, playerId and deviceId are required" });
      }

      const status = await getVoteStatus(fixtureId, deviceId);
      if (!status) {
        return res.status(404).json({ error: "Fixture not found" });
      }

      if (!status.isOpen) {
        return res.status(400).json({ error: "Voting is not open for this fixture" });
      }

      if (status.hasVoted) {
        return res.status(409).json({ error: "Already voted from this device" });
      }

      const presentResult = await pool.query(`
        SELECT id
        FROM fixture_players
        WHERE fixture_id = $1
          AND player_id = $2
          AND present = true
        LIMIT 1
      `, [fixtureId, Number(playerId)]);

      if (presentResult.rows.length === 0) {
        return res.status(400).json({ error: "Player was not present in this fixture" });
      }

      await pool.query(
        `INSERT INTO motm_votes (fixture_id, player_id, device_id) VALUES ($1, $2, $3)`,
        [fixtureId, Number(playerId), deviceId]
      );

      const updatedStatus = await getVoteStatus(fixtureId, deviceId);
      return res.status(201).json(updatedStatus);
    }

    if (req.method === "GET") {
      const result = await pool.query(`
        SELECT *
        FROM fixtures
        ORDER BY match_date ASC
      `);

      return res.status(200).json(result.rows.map(mapFixture));
    }

    if (req.method === "POST" && req.url.includes("bulk")) {
      const { text, defaultYear } = req.body;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      const created = [];

      for (const line of lines) {
        const parts = line.split(" ");
        const datePart = parts[0];
        const opponent = parts.slice(1).join(" ").replace(/^vs\s+/i, "");

        const split = datePart.split("/");
        const day = parseInt(split[0]);
        const month = parseInt(split[1]) - 1;
        const year = split[2] ? parseInt(split[2]) : defaultYear;

        const matchDate = new Date(year, month, day);

        const result = await pool.query(`
          INSERT INTO fixtures (opponent, match_date, is_home, played)
          VALUES ($1, $2, true, false)
          RETURNING *
        `, [opponent, matchDate]);

        created.push(mapFixture(result.rows[0]));
      }

      return res.status(201).json(created);
    }

    if (req.method === "POST") {
      const data = req.body;

      const result = await pool.query(`
        INSERT INTO fixtures
        (opponent, match_date, kickoff_time, kickoff_tbc, is_home, venue, notes, played, home_score, away_score)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
      `, [
        data.opponent,
        data.matchDate,
        data.kickoffTime ?? null,
        data.kickoffTbc ?? false,
        data.isHome ?? true,
        data.venue ?? null,
        data.notes ?? null,
        data.played ?? false,
        data.homeScore ?? null,
        data.awayScore ?? null,
      ]);

      return res.status(201).json(mapFixture(result.rows[0]));
    }

    if (req.method === "PUT") {
      const data = req.body;

      const result = await pool.query(`
        UPDATE fixtures
        SET
          opponent = $1,
          match_date = $2,
          kickoff_time = $3,
          kickoff_tbc = $4,
          is_home = $5,
          venue = $6,
          notes = $7,
          played = $8,
          home_score = $9,
          away_score = $10,
          voting_closes_at = CASE
            WHEN $8 = true AND played = false THEN NOW() + INTERVAL '90 minutes'
            ELSE voting_closes_at
          END
        WHERE id = $11
        RETURNING *
      `, [
        data.opponent,
        data.matchDate,
        data.kickoffTime ?? null,
        data.kickoffTbc ?? false,
        data.isHome ?? true,
        data.venue ?? null,
        data.notes ?? null,
        data.played ?? false,
        data.homeScore ?? null,
        data.awayScore ?? null,
        id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Fixture not found" });
      }

      return res.status(200).json(mapFixture(result.rows[0]));
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Fixtures failed",
      message: error.message,
    });
  }
}
