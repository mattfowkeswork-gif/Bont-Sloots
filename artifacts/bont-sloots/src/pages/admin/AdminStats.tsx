import { useState } from "react";
import {
  useListFixtures, useListPlayers, useCreateStat,
  getListStatsQueryKey, getGetDashboardQueryKey, getGetSquadStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type StatType = "goal" | "assist" | "clean_sheet";

export function AdminStats() {
  const { data: fixtures } = useListFixtures();
  const { data: players } = useListPlayers();
  const createStat = useCreateStat();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [fixtureId, setFixtureId] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [statType, setStatType] = useState<StatType>("goal");
  const [count, setCount] = useState(1);

  const playedFixtures = fixtures?.filter(f => f.played) || [];

  const handleAddStat = async () => {
    if (!fixtureId || !playerId) {
      toast({ title: "Please select both fixture and player", variant: "destructive" });
      return;
    }

    const data = { fixtureId: Number(fixtureId), playerId: Number(playerId), type: statType };

    // Fire one mutation per count sequentially
    for (let i = 0; i < count; i++) {
      await new Promise<void>((resolve, reject) =>
        createStat.mutate({ data }, { onSuccess: () => resolve(), onError: reject })
      );
    }

    const label = statType === "goal" ? (count === 1 ? "Goal" : "Goals") : statType === "assist" ? (count === 1 ? "Assist" : "Assists") : (count === 1 ? "Clean Sheet" : "Clean Sheets");
    toast({ title: `${count} ${label} added` });
    queryClient.invalidateQueries({ queryKey: getListStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSquadStatsQueryKey() });
    setCount(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Add Match Stats</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Appearances are counted automatically when you mark players as present on a fixture.
        </p>
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid gap-2">
              <Label>Select Fixture</Label>
              <Select value={fixtureId} onValueChange={setFixtureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a played fixture" />
                </SelectTrigger>
                <SelectContent>
                  {playedFixtures.map(f => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      vs {f.opponent} ({f.homeScore}-{f.awayScore})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Select Player</Label>
              <Select value={playerId} onValueChange={setPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {players?.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Stat Type</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={statType === "goal" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setStatType("goal")}
                >
                  ⚽ Goal
                </Button>
                <Button
                  type="button"
                  variant={statType === "assist" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setStatType("assist")}
                >
                  🎯 Assist
                </Button>
                <Button
                  type="button"
                  variant={statType === "clean_sheet" ? "default" : "outline"}
                  className="flex-1 min-w-full"
                  onClick={() => setStatType("clean_sheet")}
                >
                  🧤 Clean Sheet
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>How many?</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setCount(c => Math.max(1, c - 1))}
                  disabled={count <= 1}
                >
                  -
                </Button>
                <span className="text-xl font-bold w-8 text-center">{count}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setCount(c => Math.min(10, c + 1))}
                  disabled={count >= 10}
                >
                  +
                </Button>
              </div>
            </div>

            <Button
              onClick={handleAddStat}
              className="w-full mt-4"
              disabled={!fixtureId || !playerId || createStat.isPending}
            >
              {createStat.isPending
                ? "Saving..."
                : `Record ${count} ${statType === "goal" ? (count === 1 ? "Goal" : "Goals") : statType === "assist" ? (count === 1 ? "Assist" : "Assists") : (count === 1 ? "Clean Sheet" : "Clean Sheets")}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
