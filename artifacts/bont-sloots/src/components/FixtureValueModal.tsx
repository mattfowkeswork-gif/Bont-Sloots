import { useGetFixtureValueChanges } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Minus, Crown } from "lucide-react";

function formatAmount(n: number) {
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "-";
  if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}£${Math.round(abs / 1_000)}k`;
  return `${sign}£${abs}`;
}

function formatTotal(n: number) {
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "-";
  if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}£${Math.round(abs / 1_000)}k`;
  return `${sign}£${abs}`;
}

interface Props {
  fixtureId: number;
  opponent: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function FixtureValueModal({ fixtureId, opponent, open, onOpenChange }: Props) {
  const { data: entries, isLoading } = useGetFixtureValueChanges(fixtureId, {
    query: { enabled: open },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-zinc-900 border-border/50">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-black">
            Value Report — vs {opponent}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
        )}

        {!isLoading && entries && entries.length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No value data yet — add ratings first.
          </div>
        )}

        {!isLoading && entries && entries.length > 0 && (
          <div className="space-y-3">
            {entries.map((entry) => {
              const isPositive = entry.totalChange >= 0;
              const TrendIcon = entry.totalChange > 0 ? TrendingUp : entry.totalChange < 0 ? TrendingDown : Minus;
              const trendColor = entry.totalChange > 0 ? "text-green-400" : entry.totalChange < 0 ? "text-red-400" : "text-muted-foreground";

              return (
                <div key={entry.playerId} className="bg-zinc-800 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{entry.playerName}</span>
                      {entry.isKing && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          <Crown className="w-2.5 h-2.5" />
                          KING
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 font-black text-sm ${trendColor}`}>
                      <TrendIcon className="w-3.5 h-3.5" />
                      {formatTotal(entry.totalChange)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {(entry.breakdown as any[]).map((item, i) => (
                      <div key={i} className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={item.amount >= 0 ? "text-green-400/80" : "text-red-400/80"}>
                          {formatAmount(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
