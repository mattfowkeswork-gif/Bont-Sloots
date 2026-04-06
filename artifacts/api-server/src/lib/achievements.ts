export type AchievementTier = "basic" | "grinder" | "milestone" | "elite" | "legendary" | "meta" | "secret";
export type AchievementVariant = "bronze" | "silver" | "gold" | "diamond";
export type AchievementGroup = "appearances" | "goals" | "assists" | "clean_sheets";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  xp: number;
  secret?: boolean;
  variant?: AchievementVariant;
  group?: AchievementGroup;
}

export interface EarnedAchievement extends AchievementDef {
  earned: boolean;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ── Tier 1: Basics ──────────────────────────────────────────────────────────
  { id: "first_blood",      name: "First Blood",           description: "Score your 1st career goal",                          icon: "🆕", tier: "basic",     xp: 100  },
  { id: "the_playmaker",    name: "The Playmaker",          description: "Register your 1st career assist",                    icon: "🅰️", tier: "basic",     xp: 100  },
  { id: "safe_hands",       name: "Safe Hands",             description: "Keep your 1st career clean sheet",                   icon: "🧤", tier: "basic",     xp: 100  },
  { id: "match_fit",        name: "Match Fit",              description: "Make 5 total career appearances",                    icon: "🏃", tier: "basic",     xp: 250  },
  { id: "off_the_mark",     name: "Off the Mark",           description: "Score your 1st career goal",                         icon: "🎯", tier: "basic",     xp: 150  },

  // ── Tier 2: Grinders ────────────────────────────────────────────────────────
  { id: "the_specialist",   name: "The Specialist",         description: "Score 10 career goals",                              icon: "⚽", tier: "grinder",   xp: 750  },
  { id: "the_engine",       name: "The Engine",             description: "Make 10 career appearances",                         icon: "⚙️", tier: "grinder",   xp: 750  },
  { id: "brick_wall",       name: "Brick Wall",             description: "Keep 5 career clean sheets",                         icon: "🛡️", tier: "grinder",   xp: 750  },
  { id: "the_architect",    name: "The Architect",          description: "Register 5 career assists",                          icon: "📐", tier: "grinder",   xp: 500  },

  // ── Tier Milestone: Appearances ─────────────────────────────────────────────
  { id: "the_regular",      name: "The Regular",            description: "Make 10 career appearances",                         icon: "🥉", tier: "milestone", xp: 500,  variant: "bronze",  group: "appearances" },
  { id: "the_veteran",      name: "The Veteran",            description: "Make 25 career appearances",                         icon: "🥈", tier: "milestone", xp: 1250, variant: "silver",  group: "appearances" },
  { id: "the_stalwart",     name: "The Stalwart",           description: "Make 75 career appearances",                         icon: "🥇", tier: "milestone", xp: 3500, variant: "gold",    group: "appearances" },
  { id: "the_centurion",    name: "The Centurion",          description: "Make 100 career appearances",                        icon: "💯", tier: "milestone", xp: 5000, variant: "diamond", group: "appearances" },

  // ── Tier Milestone: Goals ────────────────────────────────────────────────────
  { id: "double_digits",    name: "Double Digits",          description: "Score 10 career goals",                              icon: "🔟", tier: "milestone", xp: 750,  variant: "bronze",  group: "goals" },
  { id: "silver_boot",      name: "The Silver Boot",        description: "Score 25 career goals",                              icon: "🥈", tier: "milestone", xp: 2000, variant: "silver",  group: "goals" },
  { id: "golden_boot",      name: "The Golden Boot",        description: "Score 50 career goals",                              icon: "🥇", tier: "milestone", xp: 4500, variant: "gold",    group: "goals" },

  // ── Tier Milestone: Assists ───────────────────────────────────────────────────
  { id: "helper",           name: "Helper",                 description: "Register 10 career assists",                         icon: "🤝", tier: "milestone", xp: 750,  variant: "bronze",  group: "assists" },
  { id: "the_maestro",      name: "The Maestro",            description: "Register 25 career assists",                         icon: "🎼", tier: "milestone", xp: 2000, variant: "silver",  group: "assists" },
  { id: "supply_line",      name: "The Supply Line",        description: "Register 50 career assists",                         icon: "🚚", tier: "milestone", xp: 4500, variant: "gold",    group: "assists" },

  // ── Tier Milestone: Clean Sheets ──────────────────────────────────────────────
  { id: "solid",            name: "Solid",                  description: "Keep 10 career clean sheets",                        icon: "🧱", tier: "milestone", xp: 750,  variant: "bronze",  group: "clean_sheets" },
  { id: "lockdown",         name: "The Lockdown",           description: "Keep 25 career clean sheets",                        icon: "🔒", tier: "milestone", xp: 2000, variant: "silver",  group: "clean_sheets" },
  { id: "great_wall",       name: "The Great Wall",         description: "Keep 50 career clean sheets",                        icon: "🏯", tier: "milestone", xp: 4500, variant: "gold",    group: "clean_sheets" },

  // ── Tier 3: Elite ────────────────────────────────────────────────────────────
  { id: "half_centurion",   name: "The Half-Centurion",     description: "Make 50 total career appearances",                   icon: "🎖️", tier: "elite",     xp: 2500 },
  { id: "the_natural",      name: "The Natural",            description: "Score 3 career hat-tricks",                          icon: "🎩", tier: "elite",     xp: 2000 },
  { id: "golden_glove",     name: "Golden Glove Elite",     description: "Keep 20 career clean sheets",                        icon: "✨", tier: "elite",     xp: 2500 },

  // ── Tier 4: Legendary ────────────────────────────────────────────────────────
  { id: "club_icon",        name: "Club Icon",              description: "Win 10 Man of the Match awards",                     icon: "👑", tier: "legendary", xp: 4000 },
  { id: "statue_outside",   name: "Statue Outside the Ground", description: "Reach Level 50",                                 icon: "🗿", tier: "legendary", xp: 7500 },

  // ── Meta: Completionist ───────────────────────────────────────────────────────
  { id: "getting_started",  name: "Getting Started",        description: "Unlock 5 achievements",                              icon: "🌱", tier: "meta",      xp: 500  },
  { id: "the_collector",    name: "The Collector",          description: "Unlock 15 achievements",                             icon: "🧺", tier: "meta",      xp: 1500 },
  { id: "bont_sloots_elite", name: "Bont Sloots Elite",    description: "Unlock 25 achievements",                             icon: "💎", tier: "meta",      xp: 5000, variant: "diamond" },

  // ── Tier 5: Secrets ───────────────────────────────────────────────────────────
  { id: "the_phoenix",      name: "The Phoenix",            description: "Win MOTM immediately after receiving a Muppet award", icon: "🔥", tier: "secret", xp: 800,  secret: true },
  { id: "the_joker",        name: "The Joker",              description: "Get an assist and a Muppet in the same match",        icon: "🃏", tier: "secret", xp: 300,  secret: true },
  { id: "the_professional", name: "The Professional",       description: "Make 10 appearances with zero Muppet awards",         icon: "👔", tier: "secret", xp: 1500, secret: true },
  { id: "the_ghost",        name: "The Ghost",              description: "Make 3 consecutive appearances with zero stats",       icon: "👻", tier: "secret", xp: 50,   secret: true },
];

export interface PlayerMatchForAchievements {
  fixtureId: number;
  matchDate: string | Date;
  goals: number;
  assists: number;
  cleanSheets: number;
  hasMomAward: boolean;
  hasMuppetAward: boolean;
}

export interface ComplexAchievements {
  hatTrickCount: number;
  isPhoenix: boolean;
  isJoker: boolean;
  isGhost: boolean;
}

export function computeComplexAchievements(
  matchData: PlayerMatchForAchievements[]
): ComplexAchievements {
  const sorted = [...matchData].sort(
    (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
  );

  const hatTrickCount = matchData.filter(m => m.goals >= 3).length;

  let isPhoenix = false;
  const awardMatches = sorted.filter(m => m.hasMomAward || m.hasMuppetAward);
  for (let i = 1; i < awardMatches.length; i++) {
    if (awardMatches[i - 1].hasMuppetAward && awardMatches[i].hasMomAward) {
      isPhoenix = true;
      break;
    }
  }

  const isJoker = matchData.some(m => m.assists > 0 && m.hasMuppetAward);

  let isGhost = false;
  if (sorted.length >= 3) {
    for (let i = 0; i <= sorted.length - 3; i++) {
      const trio = sorted.slice(i, i + 3);
      if (trio.every(m => m.goals === 0 && m.assists === 0 && m.cleanSheets === 0)) {
        isGhost = true;
        break;
      }
    }
  }

  return { hatTrickCount, isPhoenix, isJoker, isGhost };
}

export interface AchievementInput {
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  momAwards: number;
  muppetAwards: number;
  baseLevel: number;
  hatTrickCount: number;
  isPhoenix: boolean;
  isJoker: boolean;
  isGhost: boolean;
}

const NON_META_IDS = ACHIEVEMENT_DEFS.filter(d => d.tier !== "meta").map(d => d.id);

export function computeAchievements(input: AchievementInput): EarnedAchievement[] {
  const earned = new Set<string>();

  // ── Tier 1: Basics ──────────────────────────────────────────────────────────
  if (input.goals >= 1)                                  earned.add("first_blood");
  if (input.assists >= 1)                                earned.add("the_playmaker");
  if (input.cleanSheets >= 1)                            earned.add("safe_hands");
  if (input.apps >= 5)                                   earned.add("match_fit");
  if (input.goals >= 1)                                  earned.add("off_the_mark");

  // ── Tier 2: Grinders ────────────────────────────────────────────────────────
  if (input.goals >= 10)                                 earned.add("the_specialist");
  if (input.apps >= 10)                                  earned.add("the_engine");
  if (input.cleanSheets >= 5)                            earned.add("brick_wall");
  if (input.assists >= 5)                                earned.add("the_architect");

  // ── Milestones: Appearances ──────────────────────────────────────────────────
  if (input.apps >= 10)                                  earned.add("the_regular");
  if (input.apps >= 25)                                  earned.add("the_veteran");
  if (input.apps >= 75)                                  earned.add("the_stalwart");
  if (input.apps >= 100)                                 earned.add("the_centurion");

  // ── Milestones: Goals ────────────────────────────────────────────────────────
  if (input.goals >= 10)                                 earned.add("double_digits");
  if (input.goals >= 25)                                 earned.add("silver_boot");
  if (input.goals >= 50)                                 earned.add("golden_boot");

  // ── Milestones: Assists ───────────────────────────────────────────────────────
  if (input.assists >= 10)                               earned.add("helper");
  if (input.assists >= 25)                               earned.add("the_maestro");
  if (input.assists >= 50)                               earned.add("supply_line");

  // ── Milestones: Clean Sheets ──────────────────────────────────────────────────
  if (input.cleanSheets >= 10)                           earned.add("solid");
  if (input.cleanSheets >= 25)                           earned.add("lockdown");
  if (input.cleanSheets >= 50)                           earned.add("great_wall");

  // ── Tier 3: Elite ────────────────────────────────────────────────────────────
  if (input.apps >= 50)                                  earned.add("half_centurion");
  if (input.hatTrickCount >= 3)                          earned.add("the_natural");
  if (input.cleanSheets >= 20)                           earned.add("golden_glove");

  // ── Tier 4: Legendary ────────────────────────────────────────────────────────
  if (input.momAwards >= 10)                             earned.add("club_icon");
  if (input.baseLevel >= 50)                             earned.add("statue_outside");

  // ── Tier 5: Secrets ───────────────────────────────────────────────────────────
  if (input.isPhoenix)                                   earned.add("the_phoenix");
  if (input.isJoker)                                     earned.add("the_joker");
  if (input.apps >= 10 && input.muppetAwards === 0)      earned.add("the_professional");
  if (input.isGhost)                                     earned.add("the_ghost");

  // ── Meta: Completionist (two-pass — count non-meta earned first) ──────────────
  const nonMetaEarnedCount = NON_META_IDS.filter(id => earned.has(id)).length;
  if (nonMetaEarnedCount >= 5)                           earned.add("getting_started");
  if (nonMetaEarnedCount >= 15)                          earned.add("the_collector");
  if (nonMetaEarnedCount >= 25)                          earned.add("bont_sloots_elite");

  return ACHIEVEMENT_DEFS.map(def => ({ ...def, earned: earned.has(def.id) }));
}

export function totalAchievementXp(achievements: EarnedAchievement[]): number {
  return achievements.filter(a => a.earned).reduce((sum, a) => sum + a.xp, 0);
}
