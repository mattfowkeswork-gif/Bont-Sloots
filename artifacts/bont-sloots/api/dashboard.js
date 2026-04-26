import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req, res) {
  try {
    const playersResult = await pool.query(`
      SELECT id, name, display_name, position
      FROM players
      ORDER BY name ASC
    `);

    const fixturesResult = await pool.query(`
      SELECT id, opponent, match_date, kickoff_time, played, home_score, away_score, is_home
      FROM fixtures
      ORDER BY match_date ASC
    `);

    const today = new Date().toISOString().split("T")[0];

    const fixtures = fixturesResult.rows;
    const players = playersResult.rows;

    const upcomingFixtures = fixtures.filter(f => !f.played);
const nextFixture = upcomingFixtures.length > 0 ? upcomingFixtures[0] : null;

    res.status(200).json({
      nextFixture,
      votingOpenFixture: null,
      totalSquadValue: players.length * 5000000,
      seasonRecord: {
        played: fixtures.filter(f => f.played).length,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0
      },
      topScorer: null,
      topLevel: players[0]
        ? {
            playerId: players[0].id,
            playerName: players[0].display_name ?? players[0].name,
            level: 1,
            totalXp: 0
          }
        : null,
      recentResults: [],
      hallOfFame: {
        topScorer: null,
        topRated: null,
        mostMotms: null,
        muppetKing: null
      },
      squadPhotoUrl: null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Dashboard failed",
      message: error.message
    });
  }
}
