import { useGetDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, MapPin, Calendar, Clock, Trophy, Star, AlertTriangle, ThumbsUp, TrendingUp, ExternalLink, Search, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInSeconds } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { MotmVotingDialog } from "@/components/MotmVotingDialog";

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const target = new Date(targetDate);
      const totalSeconds = differenceInSeconds(target, now);

      if (totalSeconds <= 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="grid grid-cols-4 gap-2 text-center mt-4">
      {[
        { val: timeLeft.days, label: "Days" },
        { val: timeLeft.hours, label: "Hours" },
        { val: timeLeft.minutes, label: "Mins" },
        { val: timeLeft.seconds, label: "Secs" },
      ].map(({ val, label }) => (
        <div key={label} className="bg-secondary/50 rounded-lg p-2 border border-border/50">
          <div className="text-2xl font-bold font-mono text-primary">{String(val).padStart(2, "0")}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
        </div>
      ))}
    </div>
  );
}

function HallOfFame({ hof }: { hof: { topScorer: any; topRated?: any; mostMotms: any; muppetKing: any } }) {
  const entries = [
    {
      label: "Top Scorer",
      player: hof.topScorer,
      suffix: (v: number) => `${v} goal${v !== 1 ? "s" : ""}`,
      Icon: Trophy,
      iconClass: "text-yellow-400",
      borderClass: "border-yellow-500/20",
      bgClass: "from-yellow-500/5",
    },
    {
      label: "Player of the Match",
      player: hof.topRated ?? null,
      suffix: (v: number) => `${v} MOM${v !== 1 ? "s" : ""}`,
      Icon: Star,
      iconClass: "text-yellow-400",
      borderClass: "border-yellow-500/20",
      bgClass: "from-yellow-500/5",
    },
    {
      label: "Fan Favourite",
      player: hof.mostMotms,
      suffix: (v: number) => `${v} fan vote${v !== 1 ? "s" : ""}`,
      Icon: Star,
      iconClass: "text-purple-400",
      borderClass: "border-purple-500/20",
      bgClass: "from-purple-500/5",
    },
    {
      label: "Muppet King",
      player: hof.muppetKing,
      suffix: (v: number) => `${v} award${v !== 1 ? "s" : ""}`,
      Icon: AlertTriangle,
      iconClass: "text-red-400",
      borderClass: "border-red-500/20",
      bgClass: "from-red-500/5",
    },
  ];

  const filled = entries.filter(e => e.player !== null);
  if (filled.length === 0) return null;

  return (
    <div>
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-400" /> Hall of Fame
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {entries.map(({ label, player, suffix, Icon, iconClass, borderClass, bgClass }) => (
          <div
            key={label}
            className={`bg-card border ${borderClass} rounded-xl p-3 flex items-center gap-3 overflow-hidden relative`}
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${bgClass} to-transparent pointer-events-none`} />
            <div className={`relative bg-background rounded-full p-2.5 shrink-0`}>
              <Icon className={`w-5 h-5 ${iconClass}`} />
            </div>
            <div className="relative flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
              {player ? (
                <Link href={`/players/${player.playerId}`}>
                  <div className="font-black text-white text-sm truncate hover:text-primary transition-colors">
                    {player.playerName}
                  </div>
                  <div className={`text-xs font-medium ${iconClass}`}>{suffix(player.value)}</div>
                </Link>
              ) : (
                <div className="text-sm text-muted-foreground">No data yet</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeagueTable({ table }: { table?: any[] }) {
  if (!table || table.length === 0) return null;

  const ourTeam = table.find(t => t.isUs);

  return (
    <Card className="bg-card border-primary/20 overflow-hidden relative shadow-xl shadow-black/30">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-yellow-500/5 pointer-events-none" />
      <CardHeader className="pb-2 relative">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              League Table
            </CardTitle>
            {ourTeam && (
              <p className="text-xs text-muted-foreground mt-1">
                Real Sosobad are #{ourTeam.rank} with {ourTeam.points} points
              </p>
            )}
          </div>
          <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px] uppercase tracking-wide">
            Auto updated
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-2 relative">
        <div className="grid grid-cols-[28px_1fr_28px_28px_36px_44px] gap-2 px-2 pb-2 text-[9px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
          <span>#</span>
          <span>Club</span>
          <span className="text-center">P</span>
          <span className="text-center">W</span>
          <span className="text-center">GD</span>
          <span className="text-right">Pts</span>
        </div>

        <div className="space-y-1 mt-2">
          {table.slice(0, 8).map((team) => (
            <div
              key={`${team.rank}-${team.name}`}
              className={`grid grid-cols-[28px_1fr_28px_28px_36px_44px] items-center gap-2 rounded-xl px-2 py-2 text-xs transition-all ${
                team.isUs
                  ? "bg-primary/20 border border-primary/40 shadow-lg shadow-primary/10"
                  : "bg-black/20 border border-white/5"
              }`}
            >
              <div className={`font-black text-center ${team.isUs ? "text-primary" : "text-muted-foreground"}`}>
                {team.rank}
              </div>
              <div className={`truncate font-bold ${team.isUs ? "text-white" : "text-white/80"}`}>
                {team.name}
              </div>
              <div className="text-center font-mono text-muted-foreground">{team.played}</div>
              <div className="text-center font-mono text-white">{team.wins}</div>
              <div className={`text-center font-mono font-bold ${team.gd >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {team.gd > 0 ? "+" : ""}{team.gd}
              </div>
              <div className={`text-right font-black ${team.isUs ? "text-primary" : "text-white"}`}>
                {team.points}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ScoutData {
  name: string;
  rank: number;
  gf: number;
  ga: number;
  form: string;
  verdicts: string[];
  teamUrl: string;
  isOverride: boolean;
}

function FormDot({ result }: { result: string }) {
  const classes =
    result === "W" ? "bg-emerald-500 text-white" :
    result === "D" ? "bg-yellow-500 text-black" :
    "bg-red-500 text-white";
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${classes}`}>
      {result}
    </span>
  );
}

function ScoutReport({ opponent }: { opponent: string }) {
  const { data: scout, isLoading, isError } = useQuery<ScoutData>({
    queryKey: ["scout", opponent],
    queryFn: async () => {
      const res = await fetch(`/api/scout?opponent=${encodeURIComponent(opponent)}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="mt-4 pt-4 border-t border-border/30">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-3.5 h-3.5 text-primary/60" />
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Scout Report</span>
        </div>
        <Skeleton className="h-4 w-3/4 bg-white/5 mb-2" />
        <Skeleton className="h-4 w-1/2 bg-white/5" />
      </div>
    );
  }

  if (isError || !scout) {
    return (
      <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-primary/60" />
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Scout Report</span>
        </div>
        <p className="text-xs text-muted-foreground">No league data found for this opponent.</p>
      </div>
    );
  }

  const lastThree = scout.form.slice(-3).split("");

  return (
    <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
      <div className="flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-primary/60" />
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Scout Report</span>
        {scout.isOverride && (
          <span className="text-[9px] uppercase tracking-wider text-yellow-500/70 font-semibold ml-auto">Manual Override</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/5 rounded-lg py-2 px-1">
          <div className="text-lg font-black text-white">#{scout.rank}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Rank</div>
        </div>
        <div className="bg-white/5 rounded-lg py-2 px-1">
          <div className="text-lg font-black text-emerald-400">{scout.gf}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Goals For</div>
        </div>
        <div className="bg-white/5 rounded-lg py-2 px-1">
          <div className="text-lg font-black text-red-400">{scout.ga}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Goals Against</div>
        </div>
      </div>

      {lastThree.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Form</span>
          <div className="flex gap-1.5">
            {lastThree.map((r, i) => <FormDot key={i} result={r} />)}
          </div>
          {scout.form.length > 3 && (
            <span className="text-[10px] text-muted-foreground ml-1">(last 3 of {scout.form.length})</span>
          )}
        </div>
      )}

      {scout.verdicts.length > 0 && (
        <div className="space-y-1.5">
          {scout.verdicts.map((v) => (
            <div
              key={v}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                v.includes("Contenders")
                  ? "bg-red-500/15 text-red-300 border border-red-500/20"
                  : v.includes("Defensive")
                  ? "bg-orange-500/15 text-orange-300 border border-orange-500/20"
                  : "bg-primary/10 text-primary border border-primary/20"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {v}
            </div>
          ))}
        </div>
      )}

      {scout.notes && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-white/75 leading-relaxed">{scout.notes}</p>
        </div>
      )}

      <a
        href={scout.teamUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs text-muted-foreground hover:text-white border border-white/10"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        View full season history on LeagueRepublic
      </a>
    </div>
  );
}

export function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() }
  });
  const [voteOpen, setVoteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full rounded-xl bg-card" />
        <Skeleton className="h-64 w-full rounded-xl bg-card" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-xl bg-card" />
          <Skeleton className="h-32 rounded-xl bg-card" />
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-6 pb-4">
      {/* Squad Photo Banner */}
      {dashboard.squadPhotoUrl && (
        <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-black/40 bg-card" style={{ maxHeight: 240 }}>
          <img
            src={dashboard.squadPhotoUrl}
            alt="Bont Sloots FC Squad"
            className="w-full object-cover object-center"
            style={{ maxHeight: 240 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
          <div className="absolute left-4 bottom-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-primary font-black">Bont Sloots FC</div>
            <div className="text-2xl font-black text-white leading-tight">Matchday Hub</div>
          </div>
        </div>
      )}

      {/* Hero: Voting Open banner OR Next Fixture */}
      {(dashboard as any).votingOpenFixture ? (() => {
        const vf = (dashboard as any).votingOpenFixture;
        return (
          <>
            <Card className="border-yellow-500/40 bg-card overflow-hidden relative shadow-lg shadow-yellow-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/15 via-transparent to-transparent pointer-events-none" />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <Badge className="bg-yellow-500 text-black font-bold border-0 uppercase tracking-wide text-[11px]">
                    Voting Open
                  </Badge>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(vf.matchDate), "MMM do, yyyy")}
                  </div>
                </div>
                <CardTitle className="text-3xl font-black mt-2 text-white">
                  vs {vf.opponent}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Who was your Man of the Match?</p>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-yellow-400/80 mb-3 font-medium uppercase tracking-wide">Voting closes in</p>
                <Countdown targetDate={vf.votingClosesAt} />
                <Button
                  className="w-full mt-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-base h-12"
                  onClick={() => setVoteOpen(true)}
                >
                  <ThumbsUp className="w-5 h-5 mr-2" />
                  Cast Your Vote
                </Button>
              </CardContent>
            </Card>
            <MotmVotingDialog
              fixtureId={vf.id}
              opponent={vf.opponent}
              open={voteOpen}
              onOpenChange={setVoteOpen}
            />
          </>
        );
      })() : dashboard.nextFixture ? (
        <Card className="border-primary/20 bg-card overflow-hidden relative shadow-lg shadow-primary/5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Next Match</Badge>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(dashboard.nextFixture.matchDate), "MMM do, yyyy")}
              </div>
            </div>
            <CardTitle className="text-3xl font-black mt-2 text-white">
              vs {dashboard.nextFixture.opponent}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground mt-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-foreground font-medium">
                  {dashboard.nextFixture.kickoffTbc ? "TBC" : dashboard.nextFixture.kickoffTime || "TBC"}
                </span>
              </div>
              {dashboard.nextFixture.venue && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{dashboard.nextFixture.venue}</span>
                </div>
              )}
            </div>
            {dashboard.nextFixture.matchDate && (
              <Countdown targetDate={dashboard.nextFixture.matchDate} />
            )}
            <ScoutReport opponent={dashboard.nextFixture.opponent} />
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No upcoming fixtures.</p>
          </CardContent>
        </Card>
      )}
      {/* Club Snapshot */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-emerald-500/20 relative overflow-hidden shadow-lg shadow-black/20">
          <div className="absolute -right-5 -bottom-5 opacity-10">
            <ShieldAlert className="w-24 h-24 text-emerald-400" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Season Form</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">
              {dashboard.seasonRecord.wins}
              <span className="text-emerald-400 text-base mx-1">W</span>
              {dashboard.seasonRecord.draws}
              <span className="text-yellow-400 text-base mx-1">D</span>
              {dashboard.seasonRecord.losses}
              <span className="text-red-400 text-base mx-1">L</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              GD <span className={(dashboard.seasonRecord.goalsFor - dashboard.seasonRecord.goalsAgainst) >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                {dashboard.seasonRecord.goalsFor - dashboard.seasonRecord.goalsAgainst > 0 ? "+" : ""}{dashboard.seasonRecord.goalsFor - dashboard.seasonRecord.goalsAgainst}
              </span>
              <span className="ml-1">({dashboard.seasonRecord.goalsFor}F / {dashboard.seasonRecord.goalsAgainst}A)</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary/20 relative overflow-hidden shadow-lg shadow-black/20">
          <div className="absolute -right-5 -bottom-5 opacity-10">
            <Zap className="w-24 h-24 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Highest Level</CardTitle>
          </CardHeader>
          <CardContent>
            {(dashboard as any).topLevel ? (
              <>
                <Link href={`/players/${(dashboard as any).topLevel.playerId}`}>
                  <div className="text-lg font-black text-white truncate hover:text-primary transition-colors">
                    {(dashboard as any).topLevel.playerName}
                  </div>
                </Link>
                <div className="text-3xl font-black text-primary mt-1">
                  LVL {(dashboard as any).topLevel.level}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {(dashboard as any).topLevel.totalXp} XP
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* League Table */}
      <LeagueTable table={(dashboard as any).leagueTable} />

      {/* Hall of Fame */}
      {dashboard.hallOfFame && <HallOfFame hof={dashboard.hallOfFame} />}

      {/* Recent Results */}
      <Card className="bg-card border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-black text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Recent Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dashboard.recentResults.length > 0 ? (
            dashboard.recentResults.map((fixture) => {
              const isWin = (fixture.isHome && fixture.homeScore! > fixture.awayScore!) || (!fixture.isHome && fixture.awayScore! > fixture.homeScore!);
              const isDraw = fixture.homeScore === fixture.awayScore;
              const bsScore = fixture.isHome ? fixture.homeScore : fixture.awayScore;
              const oppScore = fixture.isHome ? fixture.awayScore : fixture.homeScore;

              return (
                <Card key={fixture.id} className="bg-black/20 border-white/5 overflow-hidden">
                  <div className="flex items-center">
                    <div className={`w-1.5 self-stretch ${isWin ? "bg-green-500" : isDraw ? "bg-yellow-500" : "bg-red-500"}`} />
                    <div className="flex-1 p-3 flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold text-white">vs {fixture.opponent}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(fixture.matchDate), "MMM d")}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-lg">{bsScore} - {oppScore}</span>
                        <Badge variant="outline" className={
                          isWin ? "text-green-500 border-green-500/20 bg-green-500/10" :
                          isDraw ? "text-yellow-500 border-yellow-500/20 bg-yellow-500/10" :
                          "text-red-500 border-red-500/20 bg-red-500/10"
                        }>
                          {isWin ? "W" : isDraw ? "D" : "L"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm bg-card rounded-xl border border-border/50">
              No recent results
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
