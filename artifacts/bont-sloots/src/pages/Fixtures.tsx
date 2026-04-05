import { useState } from "react";
import { useListFixtures, getListFixturesQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, CalendarDays, Trophy } from "lucide-react";
import { MotmVotingDialog } from "@/components/MotmVotingDialog";

export function Fixtures() {
  const { data: fixtures, isLoading } = useListFixtures({
    query: { queryKey: getListFixturesQueryKey() }
  });

  const [votingFixture, setVotingFixture] = useState<{ id: number; opponent: string } | null>(null);

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
      <div key={fixture.id} className="bg-card border border-border/50 rounded-xl p-4">
        <div className="flex gap-4">
          <div className="flex flex-col items-center justify-center text-center w-16 border-r border-border/50 pr-4 flex-shrink-0">
            <span className="text-xs text-muted-foreground uppercase">{format(new Date(fixture.matchDate), "MMM")}</span>
            <span className="text-xl font-bold text-white">{format(new Date(fixture.matchDate), "d")}</span>
          </div>

          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="font-bold text-lg text-white truncate">vs {fixture.opponent}</div>
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

        {votingOpen && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <Button
              size="sm"
              className="w-full gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300"
              variant="outline"
              onClick={() => setVotingFixture({ id: fixture.id, opponent: fixture.opponent })}
            >
              <Trophy className="w-3.5 h-3.5" />
              Vote for Man of the Match
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-8 pb-4">
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">Upcoming</h2>
            <div className="space-y-3">
              {upcoming.map(renderFixture)}
            </div>
          </section>
        )}

        {played.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">Played</h2>
            <div className="space-y-3">
              {[...played].reverse().map(renderFixture)}
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
    </>
  );
}
