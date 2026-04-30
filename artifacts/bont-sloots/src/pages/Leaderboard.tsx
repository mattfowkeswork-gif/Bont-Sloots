import { useEffect, useState } from "react";
import { useGetSquadStats, useListSeasons, getGetSquadStatsQueryKey } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { JerseyCircle } from "@/components/JerseyCircle";

type SortKey = "playerName" | "apps" | "goals" | "assists" | "momAwards" | "muppetAwards" | "avgRating";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; shortLabel: string }[] = [
  { key: "playerName", label: "Name", shortLabel: "Name" },
  { key: "apps", label: "Apps", shortLabel: "Apps" },
  { key: "goals", label: "Goals", shortLabel: "Gls" },
  { key: "assists", label: "Assists", shortLabel: "Ast" },
  { key: "avgRating", label: "Avg Rating", shortLabel: "Rtg" },
  { key: "momAwards", label: "Man of Match", shortLabel: "MOM" },
  { key: "muppetAwards", label: "Muppet", shortLabel: "Mup" },
];

export function Leaderboard() {
  const [seasonId, setSeasonId] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("goals");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: seasons } = useListSeasons({});

  const uniqueSeasons = seasons
    ? seasons.filter((season, index, array) =>
        array.findIndex(s => s.name === season.name) === index
      )
    : [];

  useEffect(() => {
    if (!seasonId && uniqueSeasons.length > 0) {
      const current = uniqueSeasons.find(s => s.isCurrent) ?? uniqueSeasons[uniqueSeasons.length - 1];
      setSeasonId(String(current.id));
    }
  }, [seasonId, uniqueSeasons]);

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
        {uniqueSeasons.length > 0 && (
          <Select value={seasonId} onValueChange={setSeasonId}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {uniqueSeasons.map(s => (
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
                        <JerseyCircle name={player.playerName} position={player.position} size="xs" />
                        <span className="font-medium text-white whitespace-nowrap">{player.displayName ?? player.playerName}</span>
                      </div>
                    </Link>
                  </td>
                  <td className="p-2 text-right font-mono text-white">{player.apps}</td>
                  <td className="p-2 text-right font-mono text-white">{player.goals}</td>
                  <td className="p-2 text-right font-mono text-white">{player.assists}</td>
                  <td className="p-2 text-right font-mono text-yellow-400">
                    {(player as any).avgRating != null ? Number((player as any).avgRating).toFixed(1) : <span className="text-muted-foreground text-xs">–</span>}
                  </td>
                  <td className="p-2 text-right font-mono text-green-400">{(player as any).momAwards ?? 0}</td>
                  <td className="p-2 text-right font-mono text-red-400">{player.muppetAwards}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                    No squad data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
