import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Sparkles } from "lucide-react";

const honours = [
  {
    name: "Staveley 6-a-side Division 2",
    count: "x1",
    date: "14th December 2025",
  },
  {
    name: "Staveley 6-a-side Division 1",
    count: "x1",
    date: "15th March 2026",
  },
  {
    name: "Ryan Holmes Memorial Charity Tournament",
    count: "x1",
    date: "16th July 2022",
  },
];

export function TrophyRoom() {
  return (
    <div className="space-y-6 pb-4">
      <div className="relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-card p-5 shadow-xl shadow-black/30">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/15 via-transparent to-primary/10 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-black uppercase tracking-[0.22em]">
            <Sparkles className="w-4 h-4" />
            Club Honours
          </div>
          <h1 className="mt-2 text-4xl font-black text-white tracking-tight">Trophy Room</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The official Bont Sloots FC cabinet.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-4 shadow-2xl shadow-black/40">
        <div className="grid grid-cols-1 gap-4">
          {honours.map((honour) => (
            <Card key={honour.name} className="relative overflow-hidden border-yellow-500/20 bg-black/40 shadow-lg shadow-black/30">
              <div className="absolute inset-x-6 top-10 h-px bg-yellow-500/20" />
              <CardContent className="relative p-5 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-yellow-500/30 bg-yellow-500/10 shadow-lg shadow-yellow-500/10">
                  <Trophy className="h-14 w-14 text-yellow-400 drop-shadow" />
                </div>

                <div className="mt-4 text-[11px] font-black uppercase tracking-[0.25em] text-yellow-400">
                  {honour.count}
                </div>
                <h2 className="mt-1 text-xl font-black leading-tight text-white">
                  {honour.name}
                </h2>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  {honour.date}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
