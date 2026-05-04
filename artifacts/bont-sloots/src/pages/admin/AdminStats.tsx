import { useState, useEffect } from "react";
import {
  useListFixtures, useListPlayers, useCreateStat, useDeleteStat,
  useGetFixturePlayers,
  getListStatsQueryKey, getGetDashboardQueryKey, getGetSquadStatsQueryKey, getGetPlayerQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

type MatchStat = { id: number; playerId: number; fixtureId: number; type: string };
type EmergencyGkStat = { id: number; playerId: number };

export function AdminStats() {
  const { data: fixtures } = useListFixtures();
  const { data: players } = useListPlayers();
  const createStat = useCreateStat();
  const deleteStat = useDeleteStat();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [fixtureId, setFixtureId] = useState<string>("");
  const [fixtureStats, setFixtureStats] = useState<MatchStat[]>([]);
  const [emergencyGkStats, setEmergencyGkStats] = useState<EmergencyGkStat[]>([]);
  const [loadingEmergencyGk, setLoadingEmergencyGk] = useState<Set<number>>(new Set());

  const [bonusPlayerId, setBonusPlayerId] = useState<string>("");
  const [bonusAmount, setBonusAmount] = useState<string>("");
  const [bonusReason, setBonusReason] = useState<string>("");
  const [savingBonus, setSavingBonus] = useState(false);

  const playedFixtures = fixtures?.filter(f => f.played) || [];

  const { data: fixturePlayers } = useGetFixturePlayers(
    fixtureId ? Number(fixtureId) : 0,
    { query: { queryKey: ["fixture-players", fixtureId], enabled: !!fixtureId } }
  );

  const refreshFixtureStats = async () => {
    if (!fixtureId) {
      setFixtureStats([]);
      setEmergencyGkStats([]);
      return;
    }

    try {
      const res = await fetch(`/api/fixtures/${fixtureId}/stats`);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      setFixtureStats(rows);
      setEmergencyGkStats(rows.filter((r: MatchStat) => r.type === "emergency_gk"));
    } catch {
      setFixtureStats([]);
      setEmergencyGkStats([]);
    }
  };

  useEffect(() => {
    refreshFixtureStats();
  }, [fixtureId]);

  const presentPlayers = fixturePlayers?.filter(fp => fp.present) ?? [];

  const invalidateStatViews = () => {
    queryClient.invalidateQueries({ queryKey: getListStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSquadStatsQueryKey() });
  };

  const handleQuickStat = async (playerIdNum: number, playerName: string, type: "goal" | "assist") => {
    if (!fixtureId) return;

    try {
      await new Promise<void>((resolve, reject) =>
        createStat.mutate(
          { data: { fixtureId: Number(fixtureId), playerId: playerIdNum, type } },
          { onSuccess: () => resolve(), onError: reject }
        )
      );
      await refreshFixtureStats();
      invalidateStatViews();
      toast({ title: `${type === "goal" ? "Goal" : "Assist"} added for ${playerName}` });
    } catch {
      toast({ title: `Failed to add ${type}`, variant: "destructive" });
    }
  };

  const handleUndoStat = async (playerIdNum: number, playerName: string, type: "goal" | "assist") => {
    const stat = [...fixtureStats].reverse().find(s => s.playerId === playerIdNum && s.type === type);
    if (!stat) return;

    try {
      await new Promise<void>((resolve, reject) =>
        deleteStat.mutate({ id: stat.id }, { onSuccess: () => resolve(), onError: reject })
      );
      await refreshFixtureStats();
      invalidateStatViews();
      toast({ title: `${type === "goal" ? "Goal" : "Assist"} removed for ${playerName}` });
    } catch {
      toast({ title: `Failed to undo ${type}`, variant: "destructive" });
    }
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

  const handleSaveBonus = async () => {
    const amount = Number(bonusAmount);
    if (!bonusPlayerId || isNaN(amount) || amount <= 0 || !bonusReason.trim()) {
      toast({ title: "Please fill in all fields with valid values", variant: "destructive" });
      return;
    }
    setSavingBonus(true);
    try {
      const res = await fetch(`/api/stats?action=xp-bonus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: Number(bonusPlayerId), amount, reason: bonusReason.trim() }),
      });
      if (!res.ok) {
  const text = await res.text();
  console.error("XP BONUS ERROR:", text);
  throw new Error(text || "Failed");
}
      const playerName = players?.find(p => p.id.toString() === bonusPlayerId)?.name ?? "Player";
      toast({ title: `+${amount} XP awarded to ${playerName} ⭐` });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetSquadStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPlayerQueryKey(Number(bonusPlayerId)) });
      setBonusPlayerId("");
      setBonusAmount("");
      setBonusReason("");
    } catch {
      toast({ title: "Failed to save XP bonus", variant: "destructive" });
    } finally {
      setSavingBonus(false);
    }
  };

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-bold mb-1">Match Stats (Quick Edit)</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Select a match, then tap + to quickly add goals or assists.
        </p>

        <div className="mb-4">
          <Label className="text-xs mb-1 block">Fixture</Label>
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

        {!fixtureId ? (
          <p className="text-sm text-muted-foreground">Select a fixture above.</p>
        ) : presentPlayers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No players marked present.</p>
        ) : (
          <div className="space-y-3">
            {presentPlayers.map(p => {
              const goals = fixtureStats.filter(s => s.playerId === p.playerId && s.type === "goal").length;
              const assists = fixtureStats.filter(s => s.playerId === p.playerId && s.type === "assist").length;

              return (
                <div key={p.playerId} className="bg-card border border-border/50 rounded-xl p-3 space-y-3">
                  <div className="font-semibold text-white">{p.playerName}</div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-green-400 font-bold">⚽ Goals</span>
                        <span className="text-lg font-black text-white">{goals}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20"
                          variant="outline"
                          onClick={() => handleQuickStat(p.playerId, p.playerName, "goal")}
                        >
                          +1
                        </Button>
                        <Button
                          size="sm"
                          className="w-10"
                          variant="outline"
                          disabled={goals === 0}
                          onClick={() => handleUndoStat(p.playerId, p.playerName, "goal")}
                        >
                          −
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-blue-400 font-bold">🎯 Assists</span>
                        <span className="text-lg font-black text-white">{assists}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                          variant="outline"
                          onClick={() => handleQuickStat(p.playerId, p.playerName, "assist")}
                        >
                          +1
                        </Button>
                        <Button
                          size="sm"
                          className="w-10"
                          variant="outline"
                          disabled={assists === 0}
                          onClick={() => handleUndoStat(p.playerId, p.playerName, "assist")}
                        >
                          −
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual XP Bonus Section */}
      <div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              ⭐ Manual XP Bonus
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Award one-off bonus XP to a player. This appears in their XP total immediately.
            </p>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="grid gap-2">
              <Label>Player</Label>
              <Select value={bonusPlayerId} onValueChange={setBonusPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {players?.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>XP Amount</Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 250"
                value={bonusAmount}
                onChange={e => setBonusAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Bonus Reason</Label>
              <Input
                type="text"
                placeholder="e.g. Match-winning performance"
                value={bonusReason}
                onChange={e => setBonusReason(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSaveBonus}
              className="w-full"
              disabled={savingBonus || !bonusPlayerId || !bonusAmount || !bonusReason.trim()}
            >
              {savingBonus ? "Saving..." : "Award XP Bonus"}
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
