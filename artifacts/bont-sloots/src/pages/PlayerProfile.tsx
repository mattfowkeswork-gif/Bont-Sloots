import {
  useGetPlayer,
  getGetPlayerQueryKey,
  useListPlayerComments,
  getListPlayerCommentsQueryKey,
} from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Star, AlertTriangle, ArrowLeft, Calendar, MessageSquare, Target, Shield, TrendingUp, TrendingDown, Minus, Crown, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { JerseyCircle } from "@/components/JerseyCircle";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState } from "react";

function getLevelColor(level: number): string {
  if (level >= 20) return "text-yellow-400";
  if (level >= 10) return "text-purple-400";
  if (level >= 5) return "text-blue-400";
  return "text-primary";
}

function getLevelBorderColor(level: number): string {
  if (level >= 20) return "border-yellow-500/30";
  if (level >= 10) return "border-purple-500/30";
  if (level >= 5) return "border-blue-500/30";
  return "border-primary/30";
}

function XpProgressBar({ xpIntoLevel, xpForNextLevel, level }: { xpIntoLevel: number; xpForNextLevel: number; level: number }) {
  const safeXpIntoLevel = Number.isFinite(xpIntoLevel) ? Math.max(0, xpIntoLevel) : 0;
  const safeXpForNextLevel = Number.isFinite(xpForNextLevel) && xpForNextLevel > 0 ? xpForNextLevel : 500;
  const pct = Math.min(100, Math.max(0, Math.round((safeXpIntoLevel / safeXpForNextLevel) * 100)));
  const color = getLevelColor(level);
  const barColor = level >= 20 ? "bg-yellow-400" : level >= 10 ? "bg-purple-400" : level >= 5 ? "bg-blue-400" : "bg-primary";

  return (
    <div className="w-full space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className={`font-bold ${color}`}>Level {level}</span>
        <span className="text-muted-foreground font-mono">{safeXpIntoLevel} / {safeXpForNextLevel} XP</span>
      </div>
      <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground text-right">{pct}% to Level {level + 1}</p>
    </div>
  );
}

type AchievementTier = "basic" | "milestone" | "elite" | "legendary" | "meta" | "secret";
type AchievementVariant = "bronze" | "silver" | "gold" | "diamond";
type AchievementGroup = "appearances" | "goals" | "assists" | "clean_sheets";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  xp: number;
  secret?: boolean;
  variant?: AchievementVariant;
  group?: AchievementGroup;
  earned: boolean;
}

const TIER_LABELS: Record<AchievementTier, string> = {
  basic: "Basics",
  milestone: "Career Milestones",
  elite: "Elite",
  legendary: "Legendary",
  meta: "The Completionist",
  secret: "Dark Sloots",
};

const TIER_COLORS: Record<AchievementTier, string> = {
  basic: "text-muted-foreground",
  milestone: "text-orange-400",
  elite: "text-purple-400",
  legendary: "text-yellow-400",
  meta: "text-cyan-400",
  secret: "text-pink-400",
};

const MILESTONE_GROUP_LABELS: Record<AchievementGroup, string> = {
  appearances: "Appearances",
  goals: "Goals",
  assists: "Assists",
  clean_sheets: "Clean Sheets",
};

const TIER_ORDER: AchievementTier[] = ["basic", "milestone", "elite", "legendary", "meta", "secret"];

const VARIANT_STYLES: Record<AchievementVariant, { border: string; bg: string; text: string; shadow?: string }> = {
  bronze:  { border: "border-orange-600/60", bg: "bg-orange-700/15",  text: "text-orange-400" },
  silver:  { border: "border-slate-400/60",  bg: "bg-slate-400/10",   text: "text-slate-300"  },
  gold:    { border: "border-yellow-500/60", bg: "bg-yellow-500/10",  text: "text-yellow-400", shadow: "shadow-[0_0_8px_1px] shadow-yellow-500/25" },
  diamond: { border: "border-cyan-400/60",   bg: "bg-cyan-400/10",    text: "text-cyan-300",   shadow: "shadow-[0_0_12px_2px] shadow-cyan-400/30" },
};

function AchievementBadge({ ach }: { ach: Achievement }) {
  const [showTip, setShowTip] = useState(false);
  const isSecretLocked = ach.secret && !ach.earned;
  const isLegendary = ach.tier === "legendary";
  const variantStyle = ach.variant ? VARIANT_STYLES[ach.variant] : null;

  let iconClass = "text-2xl w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all";
  let labelColor = "text-muted-foreground";

  if (!ach.earned) {
    iconClass += " opacity-25 grayscale border-border/30 bg-card";
  } else if (variantStyle) {
    iconClass += ` ${variantStyle.border} ${variantStyle.bg} ${variantStyle.shadow ?? ""}`;
    labelColor = variantStyle.text;
  } else if (isLegendary) {
    iconClass += " border-yellow-500/60 bg-yellow-500/10 shadow-[0_0_14px_2px] shadow-yellow-500/30 ring-1 ring-yellow-400/40";
    labelColor = "text-yellow-400";
  } else if (ach.tier === "meta") {
    iconClass += " border-cyan-400/40 bg-cyan-400/10";
    labelColor = "text-cyan-300";
  } else {
    iconClass += " border-primary/30 bg-primary/10";
    labelColor = "text-white";
  }

  return (
    <div
      className="relative flex flex-col items-center gap-1 cursor-pointer select-none"
      onClick={() => setShowTip(s => !s)}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div className={iconClass}>
        {isSecretLocked ? "❓" : ach.icon}
      </div>
      <span className={`text-[9px] font-bold text-center leading-tight max-w-[56px] ${ach.earned ? labelColor : "text-muted-foreground"}`}>
        {isSecretLocked ? "???" : ach.name}
      </span>
      {ach.earned && (
        <span className="text-[8px] font-mono text-primary">+{ach.xp} XP</span>
      )}
      {showTip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-44 bg-popover border border-border rounded-lg p-2 shadow-xl text-center pointer-events-none">
          <p className="text-[11px] font-bold text-white mb-0.5">
            {isSecretLocked ? "???" : ach.name}
          </p>
          <p className="text-[10px] text-muted-foreground leading-snug">
            {isSecretLocked ? "Keep playing to discover this secret achievement" : ach.description}
          </p>
          {!isSecretLocked && (
            <p className={`text-[10px] font-mono mt-1 ${ach.earned ? "text-primary" : "text-muted-foreground/50"}`}>
              {ach.earned ? `+${ach.xp} XP earned` : `+${ach.xp} XP locked`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const MILESTONE_GROUP_ORDER: AchievementGroup[] = ["appearances", "goals", "assists", "clean_sheets"];

function MilestoneSection({ items }: { items: Achievement[] }) {
  return (
    <div className="space-y-3">
      {MILESTONE_GROUP_ORDER.map(group => {
        const groupItems = items.filter(a => a.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group}>
            <p className="text-[9px] uppercase tracking-widest text-orange-400/60 font-bold mb-2">
              {MILESTONE_GROUP_LABELS[group]}
            </p>
            <div className="flex flex-wrap gap-3">
              {groupItems.map(ach => <AchievementBadge key={ach.id} ach={ach} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrophyRoom({ achievements }: { achievements: Achievement[] }) {
  const totalEarned = achievements.filter(a => a.earned).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="font-bold text-white">Trophy Room</span>
        </div>
        <span className="text-xs text-muted-foreground">{totalEarned} / {achievements.length} unlocked</span>
      </div>
      {TIER_ORDER.map(tier => {
        const items = achievements.filter(a => a.tier === tier);
        if (items.length === 0) return null;
        return (
          <div key={tier}>
            <p className={`text-[10px] uppercase tracking-widest font-bold mb-3 ${TIER_COLORS[tier]}`}>
              {TIER_LABELS[tier]}
            </p>
            {tier === "milestone" ? (
              <MilestoneSection items={items} />
            ) : (
              <div className="flex flex-wrap gap-3">
                {items.map(ach => <AchievementBadge key={ach.id} ach={ach} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getColorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 70%, 25%)`;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

function formatValue(v: number) {
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `£${Math.round(v / 1_000)}k`;
  return `£${v}`;
}

function TrendIcon({ form }: { form: number[] }) {
  if (!form || form.length === 0) return <Minus className="w-4 h-4 text-muted-foreground" />;
  const net = form.reduce((s, v) => s + v, 0);
  if (net > 0) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (net < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function MilestoneBadges({ goals, apps, motmVotes }: { goals: number; apps: number; motmVotes: number }) {
  const badges: { label: string; Icon: any; color: string; bg: string }[] = [];
  if (goals >= 5) badges.push({ label: `${goals} Goals`, Icon: Target, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" });
  if (apps >= 5) badges.push({ label: `${apps} Apps`, Icon: Shield, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" });
  if (motmVotes >= 3) badges.push({ label: `${motmVotes} MOTMs`, Icon: Star, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" });
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-3">
      {badges.map(({ label, Icon, color, bg }) => (
        <span key={label} className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${bg} ${color}`}>
          <Icon className="w-3 h-3" />
          {label}
        </span>
      ))}
    </div>
  );
}

function formatValueChange(n: number) {
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "-";
  if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}£${Math.round(abs / 1_000)}k`;
  return `${sign}£${abs}`;
}

export function PlayerProfile() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const { data: player, isLoading } = useGetPlayer(Number(id), {
    query: { queryKey: getGetPlayerQueryKey(Number(id)) }
  });
  const { data: comments } = useListPlayerComments(Number(id), {
    query: { queryKey: getListPlayerCommentsQueryKey(Number(id)) }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl bg-card" />
        <Skeleton className="h-32 w-full rounded-xl bg-card" />
        <Skeleton className="h-64 w-full rounded-xl bg-card" />
      </div>
    );
  }

  if (!player) return <div className="text-center py-10">Player not found</div>;

  const mvColor = player.marketValue >= 7_000_000 ? "text-yellow-400"
    : player.marketValue >= 6_000_000 ? "text-emerald-400"
    : player.marketValue >= 5_000_000 ? "text-white"
    : "text-red-400";

  const isMuppet = (player as any).isMuppet === true;

  return (
    <div className="space-y-6 pb-4">
      <Button
        variant="ghost"
        size="sm"
        className="pl-0 text-muted-foreground hover:text-white hover:bg-transparent"
        onClick={() => setLocation("/players")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Squad
      </Button>

      {/* Hero Profile */}
      <div className="bg-card border border-border/50 rounded-xl p-6 relative overflow-hidden shadow-xl shadow-black/50">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

        {/* Muppet banner */}
        {isMuppet && (
          <div className="relative mb-4 bg-red-950/60 border border-red-800/50 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-xs font-bold text-red-400">Current Muppet of the Match 🤡</span>
          </div>
        )}

        <div className="relative flex flex-col items-center text-center">
          {/* Jersey Circle avatar */}
          <JerseyCircle
            name={player.name}
            position={player.position}
            size="lg"
            grayscale={isMuppet}
            className="mb-4"
          />

          <h1 className="text-2xl font-black text-white">{(player as any).displayName ?? player.name}</h1>
          <div className="text-primary font-medium mt-1">{player.position || "Squad Player"}</div>

          {/* Market Value + Trend */}
          <div className="flex items-center gap-2 mt-3">
            <span className={`text-2xl font-black ${mvColor}`}>{formatValue(player.marketValue)}</span>
            <TrendIcon form={player.recentForm} />
          </div>

          <MilestoneBadges goals={player.totalGoals} apps={player.apps} motmVotes={player.motmCount} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Apps", value: player.apps, color: "text-white" },
          { label: "Goals", value: player.totalGoals, color: "text-primary" },
          { label: "Assists", value: player.totalAssists, color: "text-white" },
          { label: "Fan MOTMs", value: player.motmVotes, color: "text-purple-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-4xl font-black ${color}`}>{value}</div>
          </div>
        ))}
        <div className="col-span-2 bg-card border border-emerald-500/20 rounded-xl p-4 text-center">
          <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Clean Sheets</div>
          <div className="text-4xl font-black text-emerald-400">{player.totalCleanSheets}</div>
        </div>
        {(player as any).avgRating !== null && (player as any).avgRating !== undefined && (
          <div className="col-span-2 bg-card border border-yellow-500/20 rounded-xl p-4 text-center">
            <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Avg Match Rating</div>
            <div className="text-4xl font-black text-yellow-400">{Number((player as any).avgRating).toFixed(1)}</div>
          </div>
        )}
      </div>

      {/* XP & Level */}
      {(player as any).level !== undefined && (
        <div className={`bg-card border ${getLevelBorderColor((player as any).level)} rounded-xl p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className={`w-5 h-5 ${getLevelColor((player as any).level)}`} />
            <span className="font-bold text-white">Player Level</span>
            <span className={`ml-auto text-3xl font-black ${getLevelColor((player as any).level)}`}>
              LVL {(player as any).level}
            </span>
          </div>

          <XpProgressBar
            xpIntoLevel={(player as any).xpIntoLevel ?? 0}
            xpForNextLevel={(player as any).xpForNextLevel ?? 500}
            level={(player as any).level ?? 0}
          />

          <div className="mt-4 pt-3 border-t border-border/30">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Total XP</span>
              <span className={`font-black font-mono text-sm ${(player as any).totalXp >= 0 ? "text-white" : "text-red-400"}`}>
                {(player as any).totalXp > 0 ? "+" : ""}{(player as any).totalXp ?? 0} XP
              </span>
            </div>
            {(player as any).xpBreakdown && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                {(player as any).xpBreakdown.appearances > 0 && <span className="flex justify-between"><span>Appearances</span><span className="text-white font-mono">+{(player as any).xpBreakdown.appearances}</span></span>}
                {(player as any).xpBreakdown.goals > 0 && <span className="flex justify-between"><span>Goals</span><span className="text-primary font-mono">+{(player as any).xpBreakdown.goals}</span></span>}
                {(player as any).xpBreakdown.assists > 0 && <span className="flex justify-between"><span>Assists</span><span className="text-white font-mono">+{(player as any).xpBreakdown.assists}</span></span>}
                {(player as any).xpBreakdown.cleanSheets > 0 && <span className="flex justify-between"><span>Clean Sheets</span><span className="text-emerald-400 font-mono">+{(player as any).xpBreakdown.cleanSheets}</span></span>}
                {(player as any).xpBreakdown.mom > 0 && <span className="flex justify-between"><span>Man of Match</span><span className="text-yellow-400 font-mono">+{(player as any).xpBreakdown.mom}</span></span>}
                {(player as any).xpBreakdown.muppet < 0 && <span className="flex justify-between"><span>Muppet Awards</span><span className="text-red-400 font-mono">{(player as any).xpBreakdown.muppet}</span></span>}
                {((player as any).achievementXp ?? 0) > 0 && <span className="flex justify-between col-span-2"><span>🏆 Achievements</span><span className="text-yellow-400 font-mono">+{(player as any).achievementXp}</span></span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trophy Room */}
      {(player as any).achievements && (player as any).achievements.length > 0 && (
        <div className="bg-card border border-yellow-500/20 rounded-xl p-5">
          <TrophyRoom achievements={(player as any).achievements} />
        </div>
      )}

      {/* Special Commendations */}
      {(player as any).xpBonuses && (player as any).xpBonuses.length > 0 && (
        <div className="bg-card border border-yellow-500/20 rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-yellow-400 font-bold mb-3 flex items-center gap-2">
            ⭐ Special Commendations
          </div>
          <div className="space-y-2">
            {(player as any).xpBonuses.map((bonus: { id: number; amount: number; reason: string; createdAt: string }) => (
              <div key={bonus.id} className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground leading-snug">{bonus.reason}</p>
                <span className="text-xs text-yellow-400 font-mono whitespace-nowrap shrink-0">+{bonus.amount} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scouting Profile */}
      {player.scoutingProfile && (
        <div className="bg-card border border-primary/20 rounded-xl p-4">
          <div className="text-xs uppercase tracking-wider text-primary font-bold mb-2">Scouting Report</div>
          <p className="text-sm text-muted-foreground leading-relaxed">{player.scoutingProfile}</p>
        </div>
      )}

      {/* Teammate Comments */}
      {comments && comments.length > 0 && (
        <div>
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-muted-foreground" /> What the Lads Say
          </h3>
          <div className="space-y-2">
            {comments.map(comment => (
              <div key={comment.id} className="bg-card border border-border/50 rounded-xl p-3 relative">
                <div className="absolute -top-1 -left-1 text-3xl text-primary/20 font-black leading-none select-none">"</div>
                <p className="text-sm text-muted-foreground italic pl-3">{comment.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match History */}
      {(player as any).matchHistory && (player as any).matchHistory.length > 0 && (
        <div>
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" /> Match History
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Tap a match to see value breakdown</p>
          <div className="space-y-2">
            {(player as any).matchHistory.map((match: any) => {
              const ratingNum = match.rating ? parseFloat(match.rating) : null;
              const ratingColor = ratingNum == null ? "text-muted-foreground"
                : ratingNum >= 8 ? "text-emerald-400"
                : ratingNum >= 6 ? "text-yellow-400"
                : ratingNum >= 4 ? "text-orange-400"
                : "text-red-400";
              const hasValue = match.valueChange != null;
              const valueColor = match.valueChange > 0 ? "text-green-400"
                : match.valueChange < 0 ? "text-red-400"
                : "text-muted-foreground";
              const isExpanded = expandedMatch === match.fixtureId;

              return (
                <div key={match.fixtureId} className="rounded-xl border border-border/50 overflow-hidden">
                  {/* Main row */}
                  <div
                    className={`flex items-center gap-2 p-3 bg-card ${hasValue ? "cursor-pointer hover:bg-secondary/30 active:bg-secondary/50" : ""} transition-colors`}
                    onClick={() => hasValue && setExpandedMatch(isExpanded ? null : match.fixtureId)}
                  >
                    {/* Date + opponent */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-white text-xs whitespace-nowrap">vs {match.opponent}</span>
                        {match.isKing && (
                          <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {format(new Date(match.matchDate), "d MMM yy")}
                        {match.homeScore != null && match.awayScore != null && (
                          <span className="ml-2 font-mono">{match.homeScore}–{match.awayScore}</span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-[11px] font-mono flex-shrink-0">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-muted-foreground uppercase">Gls</span>
                        <span className={match.goals > 0 ? "text-primary font-bold" : "text-muted-foreground"}>{match.goals}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-muted-foreground uppercase">Ast</span>
                        <span className={match.assists > 0 ? "text-white font-bold" : "text-muted-foreground"}>{match.assists}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-muted-foreground uppercase">Rtg</span>
                        <span className={`font-bold ${ratingColor}`}>{ratingNum != null ? ratingNum.toFixed(1) : "–"}</span>
                      </div>
                    </div>

                    {/* Value change */}
                    {hasValue && (
                      <div className={`flex items-center gap-1 text-xs font-black flex-shrink-0 min-w-[60px] justify-end ${valueColor}`}>
                        {match.valueChange > 0 ? <TrendingUp className="w-3 h-3" /> : match.valueChange < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {formatValueChange(match.valueChange)}
                      </div>
                    )}

                    {/* Expand chevron */}
                    {hasValue && (
                      <div className="text-muted-foreground flex-shrink-0">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    )}
                  </div>

                  {/* Expanded breakdown */}
                  {isExpanded && match.valueBreakdown && (
                    <div className="border-t border-border/30 bg-zinc-900 p-3 space-y-1.5">
                      {(match.valueBreakdown as any[]).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className={item.amount >= 0 ? "text-green-400 font-mono" : "text-red-400 font-mono"}>
                            {item.amount >= 0 ? "+" : ""}£{Math.abs(item.amount / 1000).toFixed(0)}k
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-black pt-1.5 border-t border-border/30">
                        <span className="text-white">Net Change</span>
                        <span className={valueColor}>{formatValueChange(match.valueChange)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Award History */}
      <div>
        <h3 className="font-bold text-lg mb-3">Award History</h3>
        <div className="space-y-3">
          {player.awardHistory && player.awardHistory.length > 0 ? (
            player.awardHistory.map((award) => (
              <div key={award.id} className="bg-card border border-border/50 rounded-xl p-3 flex items-center gap-4">
                <div className="bg-background rounded-full p-2">
                  {award.type === "mom" ? (
                    <Star className="w-5 h-5 text-yellow-500" fill="currentColor" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white text-sm">
                    {award.type === "mom" ? "Player of the Match" : "Muppet of the Match"}
                  </div>
                  <div className="text-xs text-muted-foreground">vs {award.fixtureOpponent}</div>
                </div>
                <div className="text-xs text-muted-foreground text-right flex flex-col items-end">
                  <Calendar className="w-3 h-3 mb-1" />
                  {format(new Date(award.createdAt), "MMM do, yy")}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm bg-card rounded-xl border border-border/50">
              No awards yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
