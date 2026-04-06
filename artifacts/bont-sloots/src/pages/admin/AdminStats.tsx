import { useState, useEffect } from "react";
import {
  useListFixtures, useListPlayers, useCreateStat, useDeleteStat,
  useGetFixturePlayers,
  getListStatsQueryKey, getGetDashboardQueryKey, getGetSquadStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

type StatType = "goal" | "assist" | "clean_sheet";
type EmergencyGkStat = { id: number; playerId: number };

export function AdminStats() {
  const { data: fixtures } = useListFixtures();
  const { data: players } = useListPlayers();
  const createStat = useCreateStat();
  const deleteStat = useDeleteStat();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [fixtureId, setFixtureId] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [statType, setStatType] = useState<StatType>("goal");
  const [count, setCount] = useState(1);

  const [emergencyGkStats, setEmergencyGkStats] = useState<EmergencyGkStat[]>([]);
  const [loadingEmergencyGk, setLoadingEmergencyGk] = useState<Set<number>>(new Set());

  const playedFixtures = fixtures?.filter(f => f.played) || [];

  const { data: fixturePlayers } = useGetFixturePlayers(
    fixtureId ? Number(fixtureId) : 0,
    { query: { enabled: !!fixtureId } }
  );

  // Fetch current emergency GK stats for the selected fixture
  useEffect(() => {
    if (!fixtureId) {
      setEmergencyGkStats([]);
      return;
    }
    fetch(`/api/fixtures/${fixtureId}/stats?type=emergency_gk`)
      .then(r => r.json())
      .then(data => setEmergencyGkStats(Array.isArray(data) ? data : []))
      .catch(() => setEmergencyGkStats([]));
  }, [fixtureId]);

  const presentPlayers = fixturePlayers?.filter(fp => fp.present) ?? [];

  const handleAddStat = async () => {
    if (!fixtureId || !playerId) {
      toast({ title: "Please select both fixture and player", variant: "destructive" });
      return;
    }

    const data = { fixtureId: Number(fixtureId), playerId: Number(playerId), type: statType };

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

  const handleToggleEmergencyGk = async (playerIdNum: number, currentlyChecked: boolean) => {
    setLoadingEmergencyGk(prev => new Set(prev).add(playerIdNum));
    try {
      if (currentlyChecked) {
        const stat = emergencyGkStats.find(s => s.playerId === playerIdNum);
        if (stat) {
          await new Promise<void>((resolve, reject) =>
            deleteStat.mutate({ id: stat.id }, { onSuccess: () => resolve(), onError: reject })
          );
          setEmergencyGkStats(prev => prev.filter(s => s.playerId !== playerIdNum));
        }
      } else {
        const result = await new Promise<{ id: number; playerId: number }>((resolve, reject) =>
          createStat.mutate(
            { data: { playerId: playerIdNum, fixtureId: Number(fixtureId), type: "emergency_gk" as any } },
            { onSuccess: (data: any) => resolve(data), onError: reject }
          )
        );
        setEmergencyGkStats(prev => [...prev, { id: result.id, playerId: result.playerId }]);
      }
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetSquadStatsQueryKey() });
      toast({ title: currentlyChecked ? "Emergency GK removed" : "Emergency GK awarded 🧤" });
    } catch {
      toast({ title: "Failed to update Emergency GK", variant: "destructive" });
    } finally {
      setLoadingEmergencyGk(prev => {
        const next = new Set(prev);
        next.delete(playerIdNum);
        return next;
      });
    }
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

      {/* Emergency GK Section */}
      <div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              🧤 Emergency GK
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Award the "Emergency Number 1" achievement (+750 XP) to any outfield player who stepped up as goalkeeper.
            </p>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {!fixtureId ? (
              <p className="text-sm text-muted-foreground">Select a fixture above to see present players.</p>
            ) : presentPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No players marked as present for this fixture.</p>
            ) : (
              <div className="space-y-3">
                {presentPlayers.map(fp => {
                  const isChecked = emergencyGkStats.some(s => s.playerId === fp.playerId);
                  const isLoading = loadingEmergencyGk.has(fp.playerId);
                  return (
                    <div key={fp.playerId} className="flex items-center gap-3">
                      <Checkbox
                        id={`egk-${fp.playerId}`}
                        checked={isChecked}
                        disabled={isLoading}
                        onCheckedChange={() => handleToggleEmergencyGk(fp.playerId, isChecked)}
                      />
                      <label
                        htmlFor={`egk-${fp.playerId}`}
                        className="text-sm font-medium leading-none cursor-pointer select-none"
                      >
                        {fp.playerName}
                        {isChecked && <span className="ml-2 text-xs text-pink-400">Emergency GK ✓</span>}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
