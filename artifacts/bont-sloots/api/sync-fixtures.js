import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TEAM_URL = "https://staveley6aside.leaguerepublic.com/team/480035827/849970515.html";
const OUR_TEAM = "Real Sosobad";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "en-GB,en;q=0.9",
  "Referer": "https://staveley6aside.leaguerepublic.com/"
};

function cleanTeamName(name) {
  return String(name || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(raw) {
  const [day, month, year] = raw.split("/").map(Number);
  return `20${String(year).padStart(2, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default async function handler(req, res) {
  try {
    const response = await fetch(TEAM_URL, { headers: BROWSER_HEADERS });
    const html = await response.text();

    const upcomingStart = html.indexOf("<h2>Matches</h2>");
    const upcomingHtml = upcomingStart >= 0 ? html.slice(upcomingStart) : html;

    const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
    const fixtures = [];
    let match;

    while ((match = rowRegex.exec(upcomingHtml)) !== null) {
      const row = match[1];

      const dateMatch = row.match(/(\d{2}\/\d{2}\/\d{2})\s*<br\/>\s*([0-9:]+)/);
      if (!dateMatch) continue;

      const links = [...row.matchAll(/<a[^>]*class="bold"[^>]*>([\s\S]*?)<\/a>/g)]
        .map(m => cleanTeamName(m[1]));

      if (links.length < 2) continue;

      const homeTeam = links[0];
      const awayTeam = links[1];

      const ourHome = homeTeam.toLowerCase().includes(OUR_TEAM.toLowerCase());
      const ourAway = awayTeam.toLowerCase().includes(OUR_TEAM.toLowerCase());

      if (!ourHome && !ourAway) continue;

      const opponent = ourHome ? awayTeam : homeTeam;

      const venueMatch = row.match(/<td class="left">\s*([^<]*Staveley[^<]*)\s*<\/td>/);
      const venue = venueMatch ? venueMatch[1].replace(/\s+/g, " ").trim() : "Staveley MWFC, S43 3JL";

      fixtures.push({
        opponent,
        matchDate: parseDate(dateMatch[1]),
        kickoffTime: dateMatch[2] === "00:00" ? null : dateMatch[2],
        kickoffTbc: dateMatch[2] === "00:00",
        isHome: ourHome,
        venue
      });
    }

    const created = [];

    for (const fixture of fixtures) {
      const exists = await pool.query(
        `
        SELECT id
        FROM fixtures
        WHERE match_date::date = $1::date
          AND LOWER(opponent) = LOWER($2)
        LIMIT 1
        `,
        [fixture.matchDate, fixture.opponent]
      );

      if (exists.rows.length > 0) continue;

      const inserted = await pool.query(
        `
        INSERT INTO fixtures
          (opponent, match_date, kickoff_time, kickoff_tbc, is_home, venue, played)
        VALUES
          ($1, $2, $3, $4, $5, $6, false)
        RETURNING *
        `,
        [
          fixture.opponent,
          fixture.matchDate,
          fixture.kickoffTime,
          fixture.kickoffTbc,
          fixture.isHome,
          fixture.venue
        ]
      );

      created.push(inserted.rows[0]);
    }

    return res.status(200).json({
      found: fixtures.length,
      created: created.length,
      fixtures
    });
  } catch (error) {
    return res.status(500).json({
      error: "Fixture sync failed",
      message: error.message
    });
  }
}
