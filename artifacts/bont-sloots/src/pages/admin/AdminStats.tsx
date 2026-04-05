import { useState } from "react";
import { useListFixtures, useListPlayers, useCreateStat, getListStatsQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function AdminStats() {
  const { data: fixtures } = useListFixtures();
  const { data: players } = useListPlayers();
  const createStat = useCreateStat();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [fixtureId, setFixtureId] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [statType, setStatType] = useState<"goal" | "assist">("goal");

  const playedFixtures = fixtures?.filter(f => f.played) || [];

  const handleAddStat = () => {
    if (!fixtureId || !playerId) {
      toast({ title: "Please select both fixture and player", variant: "destructive" });
      return;
    }

    createStat.mutate({
      data: {
        fixtureId: Number(fixtureId),
        playerId: Number(playerId),
        type: statType
      }
    }, {
      onSuccess: () => {
        toast({ title: `${statType === 'goal' ? 'Goal' : 'Assist'} added successfully` });
        queryClient.invalidateQueries({ queryKey: getListStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        // Don't reset selection to allow adding multiple quickly
      }
    });
  };

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
              </div>
            </div>

            <Button 
              onClick={handleAddStat} 
              className="w-full mt-4"
              disabled={!fixtureId || !playerId || createStat.isPending}
            >
              {createStat.isPending ? "Saving..." : `Record ${statType === 'goal' ? 'Goal' : 'Assist'}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}