export const XP_VALUES = {
  appearance: 100,
  goal: 50,
  assist: 50,
  cleanSheetDefGk: 50,
  cleanSheetMidFwd: 10,
  mom: 200,
  muppet: -100,
};

/** Returns true for GK and DEF positions. Unlabelled players default to true (safe/higher rate). */
export function isGkOrDef(position?: string | null): boolean {
  if (!position) return true;
  return position === "GK" || position === "DEF";
}

export interface PlayerXpInput {
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  momAwards: number;
  muppetAwards: number;
  position?: string | null;
  achievementXp?: number;
}

export interface PlayerXpResult {
  totalXp: number;
  progressionXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpBreakdown: {
    appearances: number;
    goals: number;
    assists: number;
    cleanSheets: number;
    mom: number;
    muppet: number;
  };
}

/**
 * Returns the XP required to REACH a given level from level 0.
 * Level 0 = 0 XP (starting point). Level 1 requires 500 XP, etc.
 */
export function xpToReachLevel(level: number): number {
  if (level <= 0) return 0;
  let total = 0;
  for (let l = 1; l <= level; l++) {
    total += xpRequiredForLevel(l);
  }
  return total;
}

/**
 * Returns the XP cost of a single level (i.e. how much XP to go from l-1 to l).
 */
export function xpRequiredForLevel(level: number): number {
  if (level <= 5) return 500;
  if (level <= 15) return 1_000;
  if (level <= 30) return 2_500;
  return 5_000;
}

/**
 * Calculates the level from a given amount of progression XP.
 * Everyone starts at Level 1. Each subsequent level requires more XP.
 */
export function calculateLevel(progressionXp: number): number {
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

export function calculateXp(input: PlayerXpInput): PlayerXpResult {
  const csRate = isGkOrDef(input.position)
    ? XP_VALUES.cleanSheetDefGk
    : XP_VALUES.cleanSheetMidFwd;

  const xpBreakdown = {
    appearances: input.apps * XP_VALUES.appearance,
    goals: input.goals * XP_VALUES.goal,
    assists: input.assists * XP_VALUES.assist,
    cleanSheets: input.cleanSheets * csRate,
    mom: input.momAwards * XP_VALUES.mom,
    muppet: input.muppetAwards * XP_VALUES.muppet,
  };

  const baseProgressionXp =
    xpBreakdown.appearances +
    xpBreakdown.goals +
    xpBreakdown.assists +
    xpBreakdown.cleanSheets +
    xpBreakdown.mom;

  const achievementBonus = input.achievementXp ?? 0;
  const progressionXp = baseProgressionXp + achievementBonus;
  const totalXp = progressionXp + xpBreakdown.muppet;

  const level = calculateLevel(progressionXp);
  const xpAtCurrentLevel = xpToReachLevel(level) - xpRequiredForLevel(1);
  const xpIntoLevel = progressionXp - xpAtCurrentLevel;
  const xpForNextLevel = xpRequiredForLevel(level + 1);

  return {
    totalXp,
    progressionXp,
    level,
    xpIntoLevel,
    xpForNextLevel,
    xpBreakdown,
  };
}
