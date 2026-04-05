import { useGetSquadStats, getGetSquadStatsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, TrendingDown, Minus, Target, Shield, Star } from "lucide-react";

const POSITION_COLORS: Record<string, string> = {
  GK: "bg-emerald-700 text-emerald-100",
  DEF: "bg-blue-700 text-blue-100",
  MID: "bg-amber-700 text-amber-100",
  FWD: "bg-red-700 text-red-100",
};

const POSITION_LABEL: Record<string, string> = {
  GK: "GK", DEF: "DEF", MID: "MID", FWD: "FWD",
};

function getColorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 55%, 20%)`;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

function formatValue(v: number) {
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `£${Math.round(v / 1_000)}k`;
  return `£${v}`;
}

function SparkLine({ data }: { data: number[] }) {
  if (!data || data.length < 2) {
    const net = data?.[0] ?? 0;
    return net > 100_000
      ? <TrendingUp className="w-3 h-3 text-emerald-400" />
      : net < 100_000
        ? <TrendingDown className="w-3 h-3 text-red-400" />
        : <Minus className="w-3 h-3 text-muted-foreground" />;
  }

  const h = 24;
  const w = 48;
  const pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + ((max - v) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  const last = data[data.length - 1];
  const first = data[0];
  const trend = last > first ? "#34d399" : last < first ? "#f87171" : "#6b7280";

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline fill="none" stroke={trend} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

function MilestoneBadges({ goals, apps, motmVotes }: { goals: number; apps: number; motmVotes: number }) {
  const badges: { label: string; Icon: any; color: string }[] = [];
  if (goals >= 5) badges.push({ label: `${goals} Goals`, Icon: Target, color: "text-yellow-400" });
  if (apps >= 5) badges.push({ label: `${apps} Apps`, Icon: Shield, color: "text-blue-400" });
  if (motmVotes >= 3) badges.push({ label: `${motmVotes} MOTMs`, Icon: Star, color: "text-purple-400" });
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2 justify-center">
      {badges.map(({ label, Icon, color }) => (
        <span key={label} className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 ${color} border border-white/10`}>
          <Icon className="w-2 h-2" />
          {label}
        </span>
      ))}
    </div>
  );
}

export function Squad() {
  const { data: players, isLoading } = useGetSquadStats({
    query: { queryKey: getGetSquadStatsQueryKey() }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-56 w-full rounded-xl bg-card" />
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

  const sorted = [...players].sort((a, b) => a.playerName.localeCompare(b.playerName));

  return (
    <div className="pb-4">
      <div className="grid grid-cols-2 gap-3">
        {sorted.map((player) => {
          const pos = player.position?.toUpperCase() ?? "";
          const posClass = POSITION_COLORS[pos] ?? "bg-zinc-700 text-zinc-100";
          const posLabel = (POSITION_LABEL[pos] ?? pos) || "—";
          const mv = player.marketValue;
          const mvColor = mv >= 7_000_000 ? "text-yellow-400" : mv >= 6_000_000 ? "text-emerald-400" : mv >= 5_000_000 ? "text-white" : "text-red-400";

          return (
            <Link key={player.playerId} href={`/players/${player.playerId}`}>
              <div className="relative bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/10 rounded-2xl p-3 hover:border-primary/50 transition-all flex flex-col items-center text-center overflow-hidden shadow-lg shadow-black/50 h-full cursor-pointer select-none">
                {/* Top glow */}
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />
                
                {/* Position badge */}
                <div className={`absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.5 rounded-full ${posClass}`}>
                  {posLabel}
                </div>

                {/* Market value trend (top right) */}
                <div className="absolute top-2 right-2 opacity-70">
                  <SparkLine data={player.recentForm} />
                </div>

                {/* Avatar */}
                <div
                  className="w-14 h-14 rounded-full border-2 border-primary/30 flex items-center justify-center mt-6 mb-2 shadow-md shadow-black/50 text-white font-black text-lg"
                  style={{ backgroundColor: getColorFromName(player.playerName) }}
                >
                  {getInitials(player.playerName)}
                </div>

                {/* Name */}
                <div className="font-black text-white text-xs leading-tight mb-1 uppercase tracking-wide line-clamp-2">
                  {player.playerName}
                </div>

                {/* Market value */}
                <div className={`font-black text-sm ${mvColor} mb-2`}>
                  {formatValue(mv)}
                </div>

                {/* Stats */}
                <div className="w-full grid grid-cols-3 gap-1 text-[10px] border-t border-white/10 pt-2 mt-auto">
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground">Gls</span>
                    <span className="font-mono font-bold text-primary">{player.goals}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground">Apps</span>
                    <span className="font-mono font-bold text-white">{player.apps}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground">MOTM</span>
                    <span className="font-mono font-bold text-purple-400">{player.motmVotes}</span>
                  </div>
                </div>

                {/* Milestone badges */}
                <MilestoneBadges goals={player.goals} apps={player.apps} motmVotes={player.motmVotes} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
