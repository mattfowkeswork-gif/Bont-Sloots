import { useListStats, getListStatsQueryKey } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Star, AlertTriangle, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

export function Leaderboard() {
  const { data: players, isLoading } = useListStats({
    query: { queryKey: getListStatsQueryKey() }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg bg-card" />
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-xl bg-card" />
        ))}
      </div>
    );
  }

  if (!players) return null;

  const topScorers = [...players].sort((a, b) => b.totalGoals - a.totalGoals).filter(p => p.totalGoals > 0);
  const topAssists = [...players].sort((a, b) => b.totalAssists - a.totalAssists).filter(p => p.totalAssists > 0);
  const topMom = [...players].sort((a, b) => b.momCount - a.momCount).filter(p => p.momCount > 0);
  const topMotm = [...players].sort((a, b) => b.motmCount - a.motmCount).filter(p => p.motmCount > 0);

  const renderList = (list: typeof players, valueKey: keyof typeof players[0], icon: React.ReactNode, valueLabel: string) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground border border-border/50 rounded-xl bg-card">
          No stats recorded yet.
        </div>
      );
    }

    return (
      <div className="space-y-2 mt-4">
        {list.map((player, index) => (
          <Link key={player.playerId} href={`/players/${player.playerId}`}>
            <div className="flex items-center gap-4 bg-card border border-border/50 rounded-xl p-3 hover:bg-secondary/50 transition-colors">
              <div className="w-6 text-center font-bold text-muted-foreground text-sm">
                {index + 1}
              </div>
              <Avatar className="h-10 w-10 border border-border">
                <AvatarFallback 
                  className="text-white font-semibold"
                  style={{ backgroundColor: getColorFromName(player.playerName) }}
                >
                  {getInitials(player.playerName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 font-medium text-white">{player.playerName}</div>
              <div className="flex items-center gap-2 font-bold text-xl text-primary">
                {String(player[valueKey])}
                <div className="text-muted-foreground">
                  {icon}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="pb-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-1">Wall of Fame</h1>
        <p className="text-sm text-muted-foreground">Current season leaders</p>
      </div>

      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-card border border-border/50 h-12 p-1">
          <TabsTrigger value="goals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold">Goals</TabsTrigger>
          <TabsTrigger value="assists" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold">Assists</TabsTrigger>
          <TabsTrigger value="mom" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold">MOM</TabsTrigger>
          <TabsTrigger value="motm" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold">MOTM</TabsTrigger>
        </TabsList>
        <TabsContent value="goals">
          {renderList(topScorers, 'totalGoals', <Trophy className="w-4 h-4" />, 'Goals')}
        </TabsContent>
        <TabsContent value="assists">
          {renderList(topAssists, 'totalAssists', <User className="w-4 h-4" />, 'Assists')}
        </TabsContent>
        <TabsContent value="mom">
          {renderList(topMom, 'momCount', <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />, 'MOMs')}
        </TabsContent>
        <TabsContent value="motm">
          <div className="mb-2 text-center text-xs text-red-500 font-bold uppercase tracking-widest mt-4">Wall of Shame</div>
          {renderList(topMotm, 'motmCount', <AlertTriangle className="w-4 h-4 text-red-500" />, 'MOTMs')}
        </TabsContent>
      </Tabs>
    </div>
  );
}