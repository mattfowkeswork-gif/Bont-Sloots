import { useGetPlayer, getGetPlayerQueryKey } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Star, AlertTriangle, ArrowLeft, Calendar } from "lucide-react";
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
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export function PlayerProfile() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();
  const { data: player, isLoading } = useGetPlayer(Number(id), {
    query: { queryKey: getGetPlayerQueryKey(Number(id)) }
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
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Goals</div>
          <div className="text-4xl font-black text-white">{player.totalGoals}</div>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Assists</div>
          <div className="text-4xl font-black text-white">{player.totalAssists}</div>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <Star className="w-3 h-3 text-yellow-500" fill="currentColor" /> MOM
          </div>
          <div className="text-4xl font-black text-white">{player.momCount}</div>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center border-t-red-500/20">
          <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-500" /> MOTM
          </div>
          <div className="text-4xl font-black text-red-500">{player.motmCount}</div>
        </div>
      </div>

      {/* Award History */}
      <div>
        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
          Award History
        </h3>
        <div className="space-y-3">
          {player.awardHistory && player.awardHistory.length > 0 ? (
            player.awardHistory.map((award) => (
              <div key={award.id} className="bg-card border border-border/50 rounded-xl p-3 flex items-center gap-4">
                <div className="bg-background rounded-full p-2">
                  {award.type === 'mom' ? (
                    <Star className="w-5 h-5 text-yellow-500" fill="currentColor" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white text-sm">
                    {award.type === 'mom' ? "Player of the Match" : "Muppet of the Match"}
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