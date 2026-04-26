import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  try {

    // ✅ GET all fixtures
    if (req.method === "GET") {
      const result = await pool.query(`
        SELECT
          id,
          opponent,
          match_date AS "matchDate",
          kickoff_time AS "kickoffTime",
          kickoff_tbc AS "kickoffTbc",
          home_score AS "homeScore",
          away_score AS "awayScore",
          played,
          is_home AS "isHome",
          venue,
          notes,
          season_id AS "seasonId",
          voting_closes_at AS "votingClosesAt"
        FROM fixtures
        ORDER BY match_date ASC
      `);

      return res.status(200).json(result.rows);
    }

    // ✅ CREATE single fixture
    if (req.method === "POST" && !req.url.includes("bulk")) {
      const {
        opponent,
        matchDate,
        kickoffTime,
        isHome,
        venue,
        played,
        homeScore,
        awayScore
      } = req.body;

      const result = await pool.query(`
        INSERT INTO fixtures
        (opponent, match_date, kickoff_time, is_home, venue, played, home_score, away_score)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *
      `, [
        opponent,
        matchDate,
        kickoffTime,
        isHome ?? true,
        venue ?? null,
        played ?? false,
        homeScore ?? null,
        awayScore ?? null
      ]);

      return res.status(201).json(result.rows[0]);
    }

// ✅ BULK CREATE
if (req.method === "POST" && req.url.includes("bulk")) {
  const { text, defaultYear } = req.body;

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const created = [];

  for (const line of lines) {
    // Examples:
    // 12/04 Studs FC
    // 12/04/2026 Studs FC
    const parts = line.split(" ");
    const datePart = parts[0];
    const opponent = parts.slice(1).join(" ");
const cleanOpponent = opponent.replace(/^vs\s+/i, "");

    let day, month, year;

    if (datePart.includes("/")) {
      const split = datePart.split("/");

      day = parseInt(split[0]);
      month = parseInt(split[1]) - 1;
      year = split[2] ? parseInt(split[2]) : defaultYear;
    } else {
      continue;
    }

    const matchDate = new Date(year, month, day);

    const result = await pool.query(`
      INSERT INTO fixtures (opponent, match_date, is_home, played)
      VALUES ($1, $2, true, false)
      RETURNING *
    `, [cleanOpponent, matchDate]);

    created.push(result.rows[0]);
  }

  return res.status(201).json(created);
}

    return res.status(405).json({ error: "Method not allowed" });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Fixtures failed",
      message: error.message,
    });
  }
}
