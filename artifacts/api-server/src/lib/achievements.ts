export type AchievementTier = "basic" | "grinder" | "elite" | "legendary" | "secret";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  xp: number;
  secret?: boolean;
}

export interface EarnedAchievement extends AchievementDef {
  earned: boolean;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Tier 1: Basics
  { id: "first_blood",    name: "First Blood",    description: "Score your 1st career goal",                     icon: "🆕", tier: "basic",     xp: 100  },
  { id: "the_playmaker",  name: "The Playmaker",  description: "Register your 1st career assist",               icon: "🅰️", tier: "basic",     xp: 100  },
  { id: "safe_hands",     name: "Safe Hands",     description: "Keep your 1st career clean sheet",              icon: "🧤", tier: "basic",     xp: 100  },
  { id: "match_fit",      name: "Match Fit",      description: "Make 5 total career appearances",               icon: "🏃", tier: "basic",     xp: 250  },
  { id: "off_the_mark",   name: "Off the Mark",   description: "Score your 1st career goal or assist",          icon: "🎯", tier: "basic",     xp: 150  },
  // Tier 2: Grinders
  { id: "the_specialist", name: "The Specialist", description: "Score 10 career goals",                        icon: "⚽", tier: "grinder",   xp: 750  },
  { id: "the_engine",     name: "The Engine",     description: "Make 10 career appearances",                   icon: "⚙️", tier: "grinder",   xp: 750  },
  { id: "brick_wall",     name: "Brick Wall",     description: "Keep 5 career clean sheets",                   icon: "🛡️", tier: "grinder",   xp: 750  },
  { id: "the_architect",  name: "The Architect",  description: "Register 5 career assists",                    icon: "📐", tier: "grinder",   xp: 500  },
  // Tier 3: Elite
  { id: "half_centurion", name: "The Half-Centurion", description: "Make 50 total career appearances",         icon: "🎖️", tier: "elite",     xp: 2500 },
  { id: "the_natural",    name: "The Natural",    description: "Score 3 career hat-tricks",                    icon: "🎩", tier: "elite",     xp: 2000 },
  { id: "golden_glove",   name: "Golden Glove Elite", description: "Keep 20 career clean sheets",             icon: "✨", tier: "elite",     xp: 2500 },
  // Tier 4: Legendary
  { id: "club_icon",      name: "Club Icon",      description: "Win 10 Man of the Match awards",               icon: "👑", tier: "legendary", xp: 4000 },
  { id: "statue_outside", name: "Statue Outside the Ground", description: "Reach Level 50",                   icon: "🗿", tier: "legendary", xp: 7500 },
  // Tier 5: Secrets
  { id: "the_phoenix",    name: "The Phoenix",    description: "Win MOTM immediately after receiving a Muppet award", icon: "🔥", tier: "secret", xp: 800,  secret: true },
  { id: "the_joker",      name: "The Joker",      description: "Get an assist and a Muppet in the same match",       icon: "🃏", tier: "secret", xp: 300,  secret: true },
  { id: "the_professional", name: "The Professional", description: "Make 10 appearances with zero Muppet awards",   icon: "👔", tier: "secret", xp: 1500, secret: true },
  { id: "the_ghost",      name: "The Ghost",      description: "Make 3 consecutive appearances with zero stats",     icon: "👻", tier: "secret", xp: 50,   secret: true },
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

  // Phoenix: mom award in match immediately after a motm award (by fixture date)
  let isPhoenix = false;
  // Build chronological list of award-bearing matches
  const awardMatches = sorted.filter(m => m.hasMomAward || m.hasMuppetAward);
  for (let i = 1; i < awardMatches.length; i++) {
    if (awardMatches[i - 1].hasMuppetAward && awardMatches[i].hasMomAward) {
      isPhoenix = true;
      break;
    }
  }

  // Joker: assist AND muppet in the same fixture
  const isJoker = matchData.some(m => m.assists > 0 && m.hasMuppetAward);

  // Ghost: 3 consecutive appearances with 0 goals + 0 assists + 0 clean sheets
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

export function computeAchievements(input: AchievementInput): EarnedAchievement[] {
  const earned = new Set<string>();

  // Tier 1: Basics
  if (input.goals >= 1)                                        earned.add("first_blood");
  if (input.assists >= 1)                                      earned.add("the_playmaker");
  if (input.cleanSheets >= 1)                                  earned.add("safe_hands");
  if (input.apps >= 5)                                         earned.add("match_fit");
  if (input.goals >= 1 || input.assists >= 1)                  earned.add("off_the_mark");

  // Tier 2: Grinders
  if (input.goals >= 10)                                       earned.add("the_specialist");
  if (input.apps >= 10)                                        earned.add("the_engine");
  if (input.cleanSheets >= 5)                                  earned.add("brick_wall");
  if (input.assists >= 5)                                      earned.add("the_architect");

  // Tier 3: Elite
  if (input.apps >= 50)                                        earned.add("half_centurion");
  if (input.hatTrickCount >= 3)                                earned.add("the_natural");
  if (input.cleanSheets >= 20)                                 earned.add("golden_glove");

  // Tier 4: Legendary
  if (input.momAwards >= 10)                                   earned.add("club_icon");
  if (input.baseLevel >= 50)                                   earned.add("statue_outside");

  // Tier 5: Secrets
  if (input.isPhoenix)                                         earned.add("the_phoenix");
  if (input.isJoker)                                           earned.add("the_joker");
  if (input.apps >= 10 && input.muppetAwards === 0)            earned.add("the_professional");
  if (input.isGhost)                                           earned.add("the_ghost");

  return ACHIEVEMENT_DEFS.map(def => ({ ...def, earned: earned.has(def.id) }));
}

export function totalAchievementXp(achievements: EarnedAchievement[]): number {
  return achievements.filter(a => a.earned).reduce((sum, a) => sum + a.xp, 0);
}
