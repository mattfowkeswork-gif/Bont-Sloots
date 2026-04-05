import { useState } from "react";
import {
  useListFixtures, useListPlayers, useCreateStat,
  useSetFixturePlayers,
  getListStatsQueryKey, getGetDashboardQueryKey, getGetSquadStatsQueryKey,
  getGetFixturePlayersUrl,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type StatType = "goal" | "assist" | "appearance";

export function AdminStats() {
  const { data: fixtures } = useListFixtures();
  const { data: players } = useListPlayers();
  const createStat = useCreateStat();
  const setFixturePlayers = useSetFixturePlayers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [fixtureId, setFixtureId] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [statType, setStatType] = useState<StatType>("goal");
  const [isPending, setIsPending] = useState(false);

  const playedFixtures = fixtures?.filter(f => f.played) || [];

  const handleAddStat = async () => {
    if (!fixtureId || !playerId) {
      toast({ title: "Please select both fixture and player", variant: "destructive" });
      return;
    }

    if (statType === "appearance") {
      setIsPending(true);
      try {
        // Get current player presence for this fixture
        const res = await fetch(getGetFixturePlayersUrl(Number(fixtureId)));
        const current: { playerId: number; present: boolean }[] = await res.json();

        // Build updated present IDs — add the new player, keep existing present ones
        const presentIds = new Set(current.filter(p => p.present).map(p => p.playerId));
        presentIds.add(Number(playerId));

        setFixturePlayers.mutate(
          { id: Number(fixtureId), data: { playerIds: Array.from(presentIds) } },
          {
            onSuccess: () => {
              toast({ title: "Appearance recorded" });
              queryClient.invalidateQueries({ queryKey: getGetSquadStatsQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
              setIsPending(false);
            },
            onError: () => {
              toast({ title: "Failed to record appearance", variant: "destructive" });
              setIsPending(false);
            },
          }
        );
      } catch {
        toast({ title: "Failed to record appearance", variant: "destructive" });
        setIsPending(false);
      }
      return;
    }

    createStat.mutate(
      {
        data: {
          fixtureId: Number(fixtureId),
          playerId: Number(playerId),
          type: statType,
        },
      },
      {
        onSuccess: () => {
          toast({ title: `${statType === "goal" ? "Goal" : "Assist"} added successfully` });
          queryClient.invalidateQueries({ queryKey: getListStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSquadStatsQueryKey() });
        },
      }
    );
  };

  const typeLabel = statType === "goal" ? "Goal" : statType === "assist" ? "Assist" : "Appearance";
  const loading = isPending || createStat.isPending || setFixturePlayers.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Add Match Stats</h2>
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={statType === "goal" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setStatType("goal")}
                >
                  Goal
                </Button>
                <Button
                  type="button"
                  variant={statType === "assist" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setStatType("assist")}
                >
                  Assist
                </Button>
                <Button
                  type="button"
                  variant={statType === "appearance" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setStatType("appearance")}
                >
                  Appearance
                </Button>
              </div>
            </div>

            <Button
              onClick={handleAddStat}
              className="w-full mt-4"
              disabled={!fixtureId || !playerId || loading}
            >
              {loading ? "Saving..." : `Record ${typeLabel}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
