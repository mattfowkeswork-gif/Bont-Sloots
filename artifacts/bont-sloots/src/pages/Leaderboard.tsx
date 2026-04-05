import { useState } from "react";
import { useGetSquadStats, useListSeasons, getGetSquadStatsQueryKey } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp } from "lucide-react";

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

function formatMarketValue(value: number) {
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `£${(value / 1_000).toFixed(0)}k`;
  return `£${value}`;
}

type SortKey = "playerName" | "apps" | "goals" | "assists" | "motmVotes" | "muppetAwards" | "marketValue" | "avgRating";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; shortLabel: string }[] = [
  { key: "playerName", label: "Name", shortLabel: "Name" },
  { key: "apps", label: "Apps", shortLabel: "Apps" },
  { key: "goals", label: "Goals", shortLabel: "Gls" },
  { key: "assists", label: "Assists", shortLabel: "Ast" },
  { key: "avgRating", label: "Avg Rating", shortLabel: "Rtg" },
  { key: "motmVotes", label: "MOTM", shortLabel: "MOTM" },
  { key: "muppetAwards", label: "Muppet", shortLabel: "Mup" },
  { key: "marketValue", label: "Market Value", shortLabel: "Value" },
];

export function Leaderboard() {
  const [seasonId, setSeasonId] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("marketValue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: seasons } = useListSeasons({});
  const { data: squadStats, isLoading } = useGetSquadStats(
    seasonId === "all" ? {} : { seasonId: parseInt(seasonId) },
    { query: { queryKey: getGetSquadStatsQueryKey(seasonId === "all" ? {} : { seasonId: parseInt(seasonId) }) } }
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "playerName" ? "asc" : "desc");
    }
  };

  const sorted = squadStats ? [...squadStats].sort((a, b) => {
    const aVal = (a as any)[sortKey];
    const bVal = (b as any)[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    const aNum = aVal ?? -Infinity;
    const bNum = bVal ?? -Infinity;
    return sortDir === "asc" ? aNum - bNum : bNum - aNum;
  }) : [];

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 inline ml-1 text-primary" />
      : <ArrowDown className="w-3 h-3 inline ml-1 text-primary" />;
  };

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Squad Stats</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Tap a column to sort</p>
        </div>
        {seasons && seasons.length > 1 && (
          <Select value={seasonId} onValueChange={setSeasonId}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {seasons.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl bg-card" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-card">
                <th className="text-left p-2 pl-3 font-semibold text-xs text-muted-foreground w-8">#</th>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`text-xs font-semibold text-muted-foreground p-2 cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap ${col.key === "playerName" ? "text-left" : "text-right"}`}
                  >
                    {col.shortLabel}
                    <SortIcon col={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((player, index) => (
                <tr
                  key={player.playerId}
                  className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                >
                  <td className="p-2 pl-3 text-xs text-muted-foreground font-mono">{index + 1}</td>
                  <td className="p-2">
                    <Link href={`/players/${player.playerId}`}>
                      <div className="flex items-center gap-2 hover:text-primary transition-colors">
                        <Avatar className="h-7 w-7 border border-border flex-shrink-0">
                          <AvatarFallback
                            className="text-white font-semibold text-[10px]"
                            style={{ backgroundColor: getColorFromName(player.playerName) }}
                          >
                            {getInitials(player.playerName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-white whitespace-nowrap">{player.playerName}</span>
                      </div>
                    </Link>
                  </td>
                  <td className="p-2 text-right font-mono text-white">{player.apps}</td>
                  <td className="p-2 text-right font-mono text-white">{player.goals}</td>
                  <td className="p-2 text-right font-mono text-white">{player.assists}</td>
                  <td className="p-2 text-right font-mono text-yellow-400">
                    {(player as any).avgRating != null ? Number((player as any).avgRating).toFixed(1) : <span className="text-muted-foreground text-xs">–</span>}
                  </td>
                  <td className="p-2 text-right font-mono text-yellow-400">{player.motmVotes}</td>
                  <td className="p-2 text-right font-mono text-red-400">{player.muppetAwards}</td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <span className={`font-bold font-mono ${player.marketValue >= 5_000_000 ? "text-green-400" : "text-red-400"}`}>
                      {formatMarketValue(player.marketValue)}
                    </span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-muted-foreground text-sm">
                    No squad data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 p-3 rounded-lg bg-card border border-border/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-semibold text-white mb-1">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          Market Value Formula
        </div>
        <div className="space-y-0.5">
          <div>Base: £5M &nbsp;|&nbsp; +£100k per App &nbsp;|&nbsp; +£500k per Goal/Assist/MOTM</div>
          <div className="text-red-400">-£1M per Muppet Award</div>
        </div>
      </div>
    </div>
  );
}
