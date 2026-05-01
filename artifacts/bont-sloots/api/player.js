import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const XP_VALUES = {
  appearance: 100,
  goal: 50,
  assist: 50,
  cleanSheetDefGk: 50,
  cleanSheetMidFwd: 10,
  mom: 200,
  muppet: -100,
};

function isGkOrDef(position) {
  if (!position) return true;
  return position === "GK" || position === "DEF";
}

function xpRequiredForLevel(level) {
  if (level <= 5) return 500;
  if (level <= 15) return 1000;
  if (level <= 30) return 2500;
  return 5000;
}

function xpToReachLevel(level) {
  if (level <= 0) return 0;
  let total = 0;
  for (let l = 1; l <= level; l++) total += xpRequiredForLevel(l);
  return total;
}

function calculateLevel(progressionXp) {
  let level = 1;
  let remaining = progressionXp;
  while (true) {
    const cost = xpRequiredForLevel(level + 1);
    if (remaining < cost) break;
    remaining -= cost;
    level++;
  }
  return level;
}

function calculateXp(input) {
  const csRate = isGkOrDef(input.position)
    ? XP_VALUES.cleanSheetDefGk
    : XP_VALUES.cleanSheetMidFwd;

  const xpBreakdown = {
    appearances: input.apps * XP_VALUES.appearance,
    goals: input.goals * XP_VALUES.goal,
    assists: input.assists * XP_VALUES.assist,
    cleanSheets: input.cleanSheets * csRate,
    mom: input.momAwards * XP_VALUES.mom,
    fanMotm: (input.fanMotmAwards || 0) * XP_VALUES.mom,
    doubleMotm: (input.doubleMotmAwards || 0) * 100,
    muppet: input.muppetAwards * XP_VALUES.muppet,
  };

  const baseProgressionXp =
    xpBreakdown.appearances +
    xpBreakdown.goals +
    xpBreakdown.assists +
    xpBreakdown.cleanSheets +
    xpBreakdown.mom +
    xpBreakdown.fanMotm +
    xpBreakdown.doubleMotm;

  const achievementBonus = input.achievementXp || 0;
  const progressionXp = baseProgressionXp + achievementBonus;
  const totalXp = progressionXp + xpBreakdown.muppet;

  const level = calculateLevel(progressionXp);
  const xpAtCurrentLevel = xpToReachLevel(level) - xpRequiredForLevel(1);

  return {
    totalXp,
    progressionXp,
    level,
    xpIntoLevel: progressionXp - xpAtCurrentLevel,
    xpForNextLevel: xpRequiredForLevel(level + 1),
    xpBreakdown,
  };
}

const ACHIEVEMENT_DEFS = [
  { id: "first_blood",      name: "Sloots Debut",           description: "Make your first appearance",                          icon: "🔥", tier: "basic",     xp: 100  },
  { id: "the_playmaker",    name: "The Playmaker",          description: "Register your 1st career assist",                    icon: "🅰️", tier: "basic",     xp: 100  },
  { id: "safe_hands",       name: "Safe Hands",             description: "Keep your 1st career clean sheet",                   icon: "🧤", tier: "basic",     xp: 100  },
  { id: "match_fit",        name: "Match Fit",              description: "Make 5 total career appearances",                    icon: "🏃", tier: "milestone", xp: 250, group: "appearances" },
  { id: "off_the_mark",     name: "Off the Mark",           description: "Score your 1st career goal",                         icon: "🎯", tier: "basic",     xp: 150  },

  { id: "the_regular",      name: "The Regular",            description: "Make 10 career appearances",                         icon: "🥉", tier: "milestone", xp: 500,  variant: "bronze",  group: "appearances" },
  { id: "the_veteran",      name: "The Veteran",            description: "Make 25 career appearances",                         icon: "🥈", tier: "milestone", xp: 1250, variant: "silver",  group: "appearances" },
  { id: "the_stalwart",     name: "The Stalwart",           description: "Make 75 career appearances",                         icon: "🥇", tier: "milestone", xp: 3500, variant: "gold",    group: "appearances" },
  { id: "the_centurion",    name: "The Centurion",          description: "Make 100 career appearances",                        icon: "💯", tier: "milestone", xp: 5000, variant: "diamond", group: "appearances" },

  { id: "the_specialist",   name: "The Specialist",         description: "Score 5 career goals",                               icon: "⚽", tier: "milestone", xp: 750,                      group: "goals" },
  { id: "double_digits",    name: "Double Digits",          description: "Score 10 career goals",                              icon: "🔟", tier: "milestone", xp: 750,  variant: "bronze",  group: "goals" },
  { id: "silver_boot",      name: "The Silver Boot",        description: "Score 25 career goals",                              icon: "🥈", tier: "milestone", xp: 2000, variant: "silver",  group: "goals" },
  { id: "golden_boot",      name: "The Golden Boot",        description: "Score 50 career goals",                              icon: "🥇", tier: "milestone", xp: 4500, variant: "gold",    group: "goals" },

  { id: "the_architect",    name: "The Architect",          description: "Register 5 career assists",                          icon: "📐", tier: "milestone", xp: 500,                      group: "assists" },
  { id: "helper",           name: "Helper",                 description: "Register 10 career assists",                         icon: "🤝", tier: "milestone", xp: 750,  variant: "bronze",  group: "assists" },
  { id: "the_maestro",      name: "The Maestro",            description: "Register 25 career assists",                         icon: "🎼", tier: "milestone", xp: 2000, variant: "silver",  group: "assists" },
  { id: "supply_line",      name: "The Supply Line",        description: "Register 50 career assists",                         icon: "🚚", tier: "milestone", xp: 4500, variant: "gold",    group: "assists" },

  { id: "brick_wall",       name: "Brick Wall",             description: "Keep 5 career clean sheets",                         icon: "🛡️", tier: "milestone", xp: 750,                      group: "clean_sheets" },
  { id: "solid",            name: "Solid",                  description: "Keep 10 career clean sheets",                        icon: "🧱", tier: "milestone", xp: 750,  variant: "bronze",  group: "clean_sheets" },
  { id: "lockdown",         name: "The Lockdown",           description: "Keep 25 career clean sheets",                        icon: "🔒", tier: "milestone", xp: 2000, variant: "silver",  group: "clean_sheets" },
  { id: "great_wall",       name: "The Great Wall",         description: "Keep 50 career clean sheets",                        icon: "🏯", tier: "milestone", xp: 4500, variant: "gold",    group: "clean_sheets" },

  { id: "half_centurion",   name: "The Half-Centurion",     description: "Make 50 total career appearances",                   icon: "🎖️", tier: "elite",     xp: 2500 },
  { id: "the_natural",      name: "The Natural",            description: "Score 3 career hat-tricks",                          icon: "🎩", tier: "elite",     xp: 2000 },
  { id: "golden_glove",     name: "Golden Glove Elite",     description: "Keep 20 career clean sheets",                        icon: "✨", tier: "elite",     xp: 2500 },

  { id: "club_icon",        name: "Club Icon",              description: "Win 10 Man of the Match awards",                     icon: "👑", tier: "legendary", xp: 4000 },
  { id: "statue_outside",   name: "Statue Outside the Ground", description: "Reach Level 50",                                 icon: "🗿", tier: "legendary", xp: 7500 },

  { id: "getting_started",  name: "Getting Started",        description: "Unlock 5 achievements",                              icon: "🌱", tier: "meta",      xp: 500  },
  { id: "the_collector",    name: "The Collector",          description: "Unlock 15 achievements",                             icon: "🧺", tier: "meta",      xp: 1500 },
  { id: "bont_sloots_elite", name: "Bont Sloots Elite",     description: "Unlock 25 achievements",                             icon: "💎", tier: "meta",      xp: 5000, variant: "diamond" },

  { id: "the_phoenix",        name: "The Phoenix",          description: "Win MOTM immediately after receiving a Muppet award", icon: "🔥", tier: "secret", xp: 800,  secret: true },
  { id: "the_joker",          name: "The Joker",            description: "Get an assist and a Muppet in the same match",        icon: "🃏", tier: "secret", xp: 300,  secret: true },
  { id: "the_professional",   name: "The Professional",     description: "Make 10 appearances with zero Muppet awards",         icon: "👔", tier: "secret", xp: 1500, secret: true },
  { id: "the_ghost",          name: "The Ghost",            description: "Make 3 consecutive appearances with zero stats",       icon: "👻", tier: "secret", xp: 50,   secret: true },
  { id: "emergency_number_1", name: "Emergency Number 1",   description: "Step up as Emergency GK when the team needed you",     icon: "🧤", tier: "secret", xp: 750,  secret: true },
];

function computeAchievements(input) {
  const earned = new Set();

  if (input.apps >= 1) earned.add("first_blood");
  if (input.assists >= 1) earned.add("the_playmaker");
  if (input.cleanSheets >= 1) earned.add("safe_hands");
  if (input.apps >= 5) earned.add("match_fit");
  if (input.goals >= 1) earned.add("off_the_mark");

  if (input.apps >= 10) earned.add("the_regular");
  if (input.apps >= 25) earned.add("the_veteran");
  if (input.apps >= 75) earned.add("the_stalwart");
  if (input.apps >= 100) earned.add("the_centurion");

  if (input.goals >= 5) earned.add("the_specialist");
  if (input.goals >= 10) earned.add("double_digits");
  if (input.goals >= 25) earned.add("silver_boot");
  if (input.goals >= 50) earned.add("golden_boot");

  if (input.assists >= 5) earned.add("the_architect");
  if (input.assists >= 10) earned.add("helper");
  if (input.assists >= 25) earned.add("the_maestro");
  if (input.assists >= 50) earned.add("supply_line");

  if (input.cleanSheets >= 5) earned.add("brick_wall");
  if (input.cleanSheets >= 10) earned.add("solid");
  if (input.cleanSheets >= 20) earned.add("golden_glove");
  if (input.cleanSheets >= 25) earned.add("lockdown");
  if (input.cleanSheets >= 50) earned.add("great_wall");

  if (input.apps >= 50) earned.add("half_centurion");
  if (input.cleanSheets >= 20) earned.add("golden_glove");
  if (input.momAwards >= 10) earned.add("club_icon");
  if (input.baseLevel >= 50) earned.add("statue_outside");

  if (input.apps >= 10 && input.muppetAwards === 0) earned.add("the_professional");
  if ((input.emergencyGkCount || 0) >= 1) earned.add("emergency_number_1");

  const nonMetaCount = earned.size;
  if (nonMetaCount >= 5) earned.add("getting_started");
  if (nonMetaCount >= 15) earned.add("the_collector");
  if (nonMetaCount >= 25) earned.add("bont_sloots_elite");

  return ACHIEVEMENT_DEFS.map(def => ({
    ...def,
    earned: earned.has(def.id),
  }));
}

function totalAchievementXp(achievements) {
  return achievements
    .filter(a => a.earned)
    .reduce((sum, a) => sum + a.xp, 0);
}

export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Player id is required" });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const playerResult = await pool.query(
      `
      SELECT
        id,
        name,
        display_name,
        position,
        scouting_profile,
        photo_url,
        created_at
      FROM players
      WHERE id = $1
      `,
      [id]
    );

    const player = playerResult.rows[0];

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    const statsResult = await pool.query(
      `
      SELECT s.type, COUNT(*)::int AS count
      FROM stats s
      JOIN fixture_players fp
        ON fp.fixture_id = s.fixture_id
        AND fp.player_id = s.player_id
        AND fp.present = true
      WHERE s.player_id = $1
      GROUP BY s.type
      `,
      [id]
    );

    const getStat = (type) =>
      Number(statsResult.rows.find(s => s.type === type)?.count || 0);

    const totalGoals = getStat("goal");
    const totalAssists = getStat("assist");
    const totalCleanSheets = getStat("clean_sheet");
    const totalEmergencyGk = getStat("emergency_gk");

    const appsResult = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM fixture_players
      WHERE player_id = $1
        AND present = true
      `,
      [id]
    );

    const apps = Number(appsResult.rows[0]?.count || 0);

    const ratingsResult = await pool.query(
      `
      SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating
      FROM player_ratings
      WHERE player_id = $1
      `,
      [id]
    );

    const avgRating =
      ratingsResult.rows[0]?.avg_rating === null
        ? null
        : Number(ratingsResult.rows[0]?.avg_rating);

    const awardsResult = await pool.query(
      `
      SELECT
        a.id,
        a.player_id,
        a.fixture_id,
        a.type,
        a.created_at,
        f.opponent AS fixture_opponent
      FROM awards a
      LEFT JOIN fixtures f ON f.id = a.fixture_id
      JOIN fixture_players fp
        ON fp.fixture_id = a.fixture_id
        AND fp.player_id = a.player_id
        AND fp.present = true
      WHERE a.player_id = $1
      ORDER BY a.created_at ASC
      `,
      [id]
    );

    const momCount = awardsResult.rows.filter(a => a.type === "mom").length;
    const fanMotmCount = awardsResult.rows.filter(a => a.type === "fan_motm").length;
    const motmCount = awardsResult.rows.filter(a => a.type === "motm").length;

    const momFixtureIds = new Set(awardsResult.rows.filter(a => a.type === "mom").map(a => a.fixture_id));
    const fanMotmFixtureIds = new Set(awardsResult.rows.filter(a => a.type === "fan_motm").map(a => a.fixture_id));
    const doubleMotmCount = [...fanMotmFixtureIds].filter(fid => momFixtureIds.has(fid)).length;

    const historyResult = await pool.query(
      `
      SELECT
        fp.fixture_id,
        f.opponent,
        f.match_date,
        f.home_score,
        f.away_score,
        f.is_home,
        pr.rating,
        COUNT(s_goal.id)::int AS goals,
        COUNT(s_assist.id)::int AS assists
      FROM fixture_players fp
      JOIN fixtures f ON f.id = fp.fixture_id
      LEFT JOIN player_ratings pr
        ON pr.fixture_id = fp.fixture_id
        AND pr.player_id = fp.player_id
      LEFT JOIN stats s_goal
        ON s_goal.fixture_id = fp.fixture_id
        AND s_goal.player_id = fp.player_id
        AND s_goal.type = 'goal'
      LEFT JOIN stats s_assist
        ON s_assist.fixture_id = fp.fixture_id
        AND s_assist.player_id = fp.player_id
        AND s_assist.type = 'assist'
      WHERE fp.player_id = $1
        AND fp.present = true
      GROUP BY
        fp.fixture_id,
        f.opponent,
        f.match_date,
        f.home_score,
        f.away_score,
        f.is_home,
        pr.rating
      ORDER BY f.match_date DESC
      `,
      [id]
    );

    const matchHistory = historyResult.rows.map(m => ({
      fixtureId: m.fixture_id,
      opponent: m.opponent,
      matchDate: m.match_date,
      homeScore: m.home_score,
      awayScore: m.away_score,
      isHome: m.is_home,
      rating: m.rating === null ? null : Number(m.rating),
      goals: Number(m.goals || 0),
      assists: Number(m.assists || 0),
      valueChange: null,
      valueBreakdown: null,
      isKing: false,
    }));

    let xpBonuses = [];
    try {
      const bonusResult = await pool.query(
        `
        SELECT id, player_id, amount, reason, created_at
        FROM player_xp_bonuses
        WHERE player_id = $1
        ORDER BY created_at DESC
        `,
        [id]
      );
      xpBonuses = bonusResult.rows;
    } catch {
      xpBonuses = [];
    }

    const manualXpBonus = xpBonuses.reduce((sum, b) => sum + Number(b.amount || 0), 0);

    const baseXp = calculateXp({
      apps,
      goals: totalGoals,
      assists: totalAssists,
      cleanSheets: totalCleanSheets,
      momAwards: momCount, fanMotmAwards: fanMotmCount, doubleMotmAwards: doubleMotmCount,
      muppetAwards: motmCount,
      position: player.position,
      achievementXp: manualXpBonus,
    });

    const achievements = computeAchievements({
      apps,
      goals: totalGoals,
      assists: totalAssists,
      cleanSheets: totalCleanSheets,
      momAwards: momCount, fanMotmAwards: fanMotmCount, doubleMotmAwards: doubleMotmCount,
      muppetAwards: motmCount,
      baseLevel: baseXp.level,
      emergencyGkCount: totalEmergencyGk,
    });

    const achievementXp = totalAchievementXp(achievements);

    const xp = calculateXp({
      apps,
      goals: totalGoals,
      assists: totalAssists,
      cleanSheets: totalCleanSheets,
      momAwards: momCount, fanMotmAwards: fanMotmCount, doubleMotmAwards: doubleMotmCount,
      muppetAwards: motmCount,
      position: player.position,
      achievementXp: achievementXp + manualXpBonus,
    });

    return res.status(200).json({
      id: player.id,
      name: player.name,
      displayName: player.display_name,
      position: player.position,
      scoutingProfile: player.scouting_profile,
      photoUrl: player.photo_url,
      isMuppet: false,
      createdAt: player.created_at,
      totalGoals,
      totalAssists,
      totalCleanSheets,
      momCount,
      fanMotmCount,
      doubleMotmCount,
      motmCount,
      motmVotes: 0,
      isKing: false,
      apps,
      marketValue: 5000000,
      avgRating,
      recentForm: [],
      matchHistory,
      comments: [],
      totalXp: xp.totalXp,
      progressionXp: xp.progressionXp,
      level: xp.level,
      xpIntoLevel: xp.xpIntoLevel,
      xpForNextLevel: xp.xpForNextLevel,
      xpBreakdown: xp.xpBreakdown,
      achievementXp,
      manualXpBonus,
      xpBonuses,
      achievements,
      awardHistory: awardsResult.rows.map(a => ({
        id: a.id,
        playerId: a.player_id,
        playerName: player.name,
        fixtureId: a.fixture_id,
        fixtureOpponent: a.fixture_opponent,
        type: a.type,
        createdAt: a.created_at,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Player profile failed",
      message: error.message,
    });
  }
}
