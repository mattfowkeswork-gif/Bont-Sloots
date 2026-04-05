import {
  useGetPlayer,
  getGetPlayerQueryKey,
  useListPlayerComments,
  getListPlayerCommentsQueryKey,
} from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Star, AlertTriangle, ArrowLeft, Calendar, MessageSquare, Target, Shield, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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
  const last = form[form.length - 1];
  const first = form[0];
  if (last > first) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (last < first) return <TrendingDown className="w-4 h-4 text-red-400" />;
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

export function PlayerProfile() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();
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
        <div className="relative flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 border-4 border-background mb-4 shadow-lg">
            <AvatarFallback
              className="text-white text-3xl font-black"
              style={{ backgroundColor: getColorFromName(player.name) }}
            >
              {getInitials(player.name)}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-black text-white">{player.name}</h1>
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
          { label: "Fan MOTMs", value: player.motmCount, color: "text-purple-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-4xl font-black ${color}`}>{value}</div>
          </div>
        ))}
        {(player as any).avgRating !== null && (player as any).avgRating !== undefined && (
          <div className="col-span-2 bg-card border border-yellow-500/20 rounded-xl p-4 text-center">
            <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Avg Match Rating</div>
            <div className="text-4xl font-black text-yellow-400">{Number((player as any).avgRating).toFixed(1)}</div>
          </div>
        )}
      </div>

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
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-card border-b border-border/50">
                  <th className="text-left p-2 pl-3 text-xs font-semibold text-muted-foreground">Opponent</th>
                  <th className="text-right p-2 text-xs font-semibold text-muted-foreground">Score</th>
                  <th className="text-right p-2 text-xs font-semibold text-muted-foreground">Gls</th>
                  <th className="text-right p-2 text-xs font-semibold text-muted-foreground">Ast</th>
                  <th className="text-right p-2 pr-3 text-xs font-semibold text-muted-foreground">Rtg</th>
                </tr>
              </thead>
              <tbody>
                {(player as any).matchHistory.map((match: any) => {
                  const ratingNum = match.rating ? parseFloat(match.rating) : null;
                  const ratingColor = ratingNum == null ? "text-muted-foreground"
                    : ratingNum >= 8 ? "text-emerald-400"
                    : ratingNum >= 6 ? "text-yellow-400"
                    : ratingNum >= 4 ? "text-orange-400"
                    : "text-red-400";
                  return (
                    <tr key={match.fixtureId} className="border-b border-border/20 hover:bg-secondary/20">
                      <td className="p-2 pl-3">
                        <div className="font-medium text-white text-xs whitespace-nowrap">vs {match.opponent}</div>
                        <div className="text-[10px] text-muted-foreground">{format(new Date(match.matchDate), "d MMM yy")}</div>
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {match.homeScore != null && match.awayScore != null
                          ? `${match.homeScore}–${match.awayScore}`
                          : "–"}
                      </td>
                      <td className="p-2 text-right font-mono text-xs">
                        {match.goals > 0
                          ? <span className="text-primary font-bold">{match.goals}</span>
                          : <span className="text-muted-foreground">0</span>}
                      </td>
                      <td className="p-2 text-right font-mono text-xs">
                        {match.assists > 0
                          ? <span className="text-white font-bold">{match.assists}</span>
                          : <span className="text-muted-foreground">0</span>}
                      </td>
                      <td className={`p-2 pr-3 text-right font-mono text-xs font-bold ${ratingColor}`}>
                        {ratingNum != null ? ratingNum.toFixed(1) : "–"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
