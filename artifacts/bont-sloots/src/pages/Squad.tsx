import { useListStats, getListStatsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Star, AlertTriangle, Users } from "lucide-react";

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

export function Squad() {
  const { data: players, isLoading } = useListStats({
    query: { queryKey: getListStatsQueryKey() }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-xl bg-card" />
        ))}
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Users className="w-12 h-12 mb-4 opacity-50" />
        <p>No players found in the squad.</p>
      </div>
    );
  }

  // Sort alphabetically
  const sortedPlayers = [...players].sort((a, b) => a.playerName.localeCompare(b.playerName));

  return (
    <div className="pb-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {sortedPlayers.map((player) => (
          <Link key={player.playerId} href={`/players/${player.playerId}`}>
            <div className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/50 transition-colors flex flex-col items-center text-center h-full">
              <Avatar className="h-16 w-16 border-2 border-primary/20 mb-3 shadow-lg shadow-black/50">
                <AvatarFallback 
                  className="text-white text-xl font-bold"
                  style={{ backgroundColor: getColorFromName(player.playerName) }}
                >
                  {getInitials(player.playerName)}
                </AvatarFallback>
              </Avatar>
              <div className="font-bold text-white leading-tight mb-3 flex-1">{player.playerName}</div>
              
              <div className="w-full grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-3 mt-auto">
                <div className="flex flex-col items-center">
                  <span className="text-muted-foreground">Goals</span>
                  <span className="font-mono font-bold text-primary">{player.totalGoals}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-muted-foreground">Assists</span>
                  <span className="font-mono font-bold text-white">{player.totalAssists}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}