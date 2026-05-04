import { useState } from "react";
import { useListFixtures, getListFixturesQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, CalendarDays, Trophy, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { MotmVotingDialog } from "@/components/MotmVotingDialog";
import { PublicMatchReportDialog } from "@/components/MatchReportDialog";

export function Fixtures() {
  const { data: fixtures, isLoading } = useListFixtures({
    query: { queryKey: getListFixturesQueryKey() }
  });

  const [votingFixture, setVotingFixture] = useState<{ id: number; opponent: string } | null>(null);
  const [reportFixture, setReportFixture] = useState<{ id: number; opponent: string } | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 w-full rounded-xl bg-card" />
        ))}
      </div>
    );
  }

  if (!fixtures || fixtures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <CalendarDays className="w-12 h-12 mb-4 opacity-50" />
        <p>No fixtures found for this season.</p>
      </div>
    );
  }

  const upcoming = fixtures.filter(f => !f.played);
  const played = fixtures.filter(f => f.played);
  const latestResults = [...played].reverse().slice(0, 5);
  const visibleResults = showFullHistory ? [...played].reverse() : latestResults;

  const isVotingOpen = (fixture: typeof fixtures[0]) => {
    if (!fixture.votingClosesAt || !fixture.played) return false;
    return new Date(fixture.votingClosesAt) > new Date();
  };

  const renderFixture = (fixture: typeof fixtures[0]) => {
    const bsScore = fixture.isHome ? fixture.homeScore : fixture.awayScore;
    const oppScore = fixture.isHome ? fixture.awayScore : fixture.homeScore;
    const votingOpen = isVotingOpen(fixture);

    let resultClass = "";
    let resultText = "";

    if (fixture.played) {
      if (bsScore! > oppScore!) {
        resultClass = "bg-green-500/10 text-green-500 border-green-500/20";
        resultText = "W";
      } else if (bsScore === oppScore) {
        resultClass = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
        resultText = "D";
      } else {
        resultClass = "bg-red-500/10 text-red-500 border-red-500/20";
        resultText = "L";
      }
    }

    return (
      <div key={fixture.id} className={`relative overflow-hidden bg-card border rounded-2xl p-4 shadow-lg shadow-black/20 ${
        fixture.played ? "border-white/10" : "border-primary/25"
      }`}>
        <div className={`absolute inset-0 pointer-events-none ${
          fixture.played ? "bg-gradient-to-br from-white/5 via-transparent to-transparent" : "bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/5"
        }`} />
        <div className="relative flex gap-4">
          <div className="flex flex-col items-center justify-center text-center w-16 rounded-xl bg-black/25 border border-white/10 py-2 flex-shrink-0">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{format(new Date(fixture.matchDate), "MMM")}</span>
            <span className="text-2xl font-black text-white leading-none">{format(new Date(fixture.matchDate), "d")}</span>
          </div>

          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="font-black text-lg text-white truncate">vs {fixture.opponent}</div>
              {!fixture.played && (
                <Badge className="bg-primary/15 text-primary border border-primary/25 text-[10px] uppercase tracking-wide">
                  Upcoming
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" />
                {fixture.played ? "FT" : (fixture.kickoffTbc ? "TBC" : fixture.kickoffTime || "TBC")}
              </span>
              {fixture.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  {fixture.venue}
                </span>
              )}
            </div>
          </div>

          {fixture.played && (
            <div className="flex flex-col items-end justify-center flex-shrink-0">
              <div className="font-mono font-bold text-xl">{bsScore} - {oppScore}</div>
              <Badge variant="outline" className={`mt-1 text-[10px] h-5 px-1.5 ${resultClass}`}>
                {resultText}
              </Badge>
            </div>
          )}
        </div>

        {(votingOpen || fixture.played) && (
          <div className="mt-3 pt-3 border-t border-border/30 flex flex-col gap-2">
            {votingOpen && (
              <Button
                size="sm"
                className="w-full gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300"
                variant="outline"
                onClick={() => setVotingFixture({ id: fixture.id, opponent: fixture.opponent })}
              >
                <Trophy className="w-3.5 h-3.5" />
                Vote for Man of the Match
              </Button>
            )}

            {fixture.played && (
              <Button
                size="sm"
                className="w-full gap-2 bg-secondary/80 border border-border/50 text-white/80 hover:bg-secondary"
                variant="outline"
                onClick={() => setReportFixture({ id: fixture.id, opponent: fixture.opponent })}
              >
                <FileText className="w-3.5 h-3.5" />
                Match Report
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-8 pb-4">
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-5 shadow-xl shadow-black/25">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-[0.22em]">
              <CalendarDays className="w-4 h-4" />
              Fixtures
            </div>
            <h1 className="mt-2 text-4xl font-black text-white tracking-tight">Match Centre</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Upcoming matches and the latest Bont Sloots FC results.
            </p>
          </div>
        </section>

        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">Upcoming</h2>
            <div className="space-y-3">
              {upcoming.map(renderFixture)}
            </div>
          </section>
        )}

        {visibleResults.length > 0 && (
          <section>
            <div className="flex items-end justify-between gap-3 mb-4 px-1">
              <div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  {showFullHistory ? "Full Season History" : "Latest Results"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {showFullHistory ? `Showing all ${played.length} completed matches.` : "Showing the last 5 completed matches."}
                </p>
              </div>
              {played.length > 5 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs border-border/60 bg-card/80"
                  onClick={() => setShowFullHistory(!showFullHistory)}
                >
                  {showFullHistory ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Full history
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {visibleResults.map(renderFixture)}
            </div>
          </section>
        )}
      </div>

      {votingFixture && (
        <MotmVotingDialog
          fixtureId={votingFixture.id}
          opponent={votingFixture.opponent}
          open={true}
          onOpenChange={(open) => !open && setVotingFixture(null)}
        />
      )}

      {reportFixture && (
        <PublicMatchReportDialog
          fixtureId={reportFixture.id}
          opponent={reportFixture.opponent}
          open={true}
          onOpenChange={(open) => !open && setReportFixture(null)}
        />
      )}
    </>
  );
}
