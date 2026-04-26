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

export default async function handler(req, res) {
  try {
    const id = req.query.id;

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
