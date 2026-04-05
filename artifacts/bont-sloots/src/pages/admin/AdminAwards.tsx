import { useListFixtures, useListPlayers, useCreateAward, useDeleteAward, useListAwards, getListStatsQueryKey, getGetDashboardQueryKey, getListAwardsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Info, Trash2 } from "lucide-react";
import { useState } from "react";

export function AdminAwards() {
  const { data: fixtures } = useListFixtures();
  const { data: players } = useListPlayers();
  const { data: awards } = useListAwards();
  const createAward = useCreateAward();
  const deleteAward = useDeleteAward();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [fixtureId, setFixtureId] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");

  const playedFixtures = fixtures?.filter(f => f.played) || [];

  const muppetAwards = awards?.filter(a => a.type === "motm") || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListAwardsQueryKey() });
  };

  const handleAddAward = () => {
    if (!fixtureId || !playerId) {
      toast({ title: "Please select both fixture and player", variant: "destructive" });
      return;
    }

    createAward.mutate({
      data: {
        fixtureId: Number(fixtureId),
        playerId: Number(playerId),
        type: "motm",
      }
    }, {
      onSuccess: () => {
        toast({ title: "Muppet of the Match awarded" });
        invalidate();
        setFixtureId("");
        setPlayerId("");
      }
    });
  };

  const handleRemoveAward = (awardId: number, playerName: string) => {
    deleteAward.mutate({ id: awardId }, {
      onSuccess: () => {
        toast({ title: `Removed muppet award for ${playerName}` });
        invalidate();
      },
      onError: () => {
        toast({ title: "Failed to remove award", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-300">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Man of the Match is automatically awarded to the highest-rated player when match ratings are saved.</span>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Muppet of the Match</h2>
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

            <Button
              onClick={handleAddAward}
              className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white"
              disabled={!fixtureId || !playerId || createAward.isPending}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              {createAward.isPending ? "Saving..." : "Assign Muppet Award"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {muppetAwards.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Existing Muppet Awards</h2>
          <div className="space-y-2">
            {muppetAwards.map(award => (
              <div
                key={award.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-card border border-border"
              >
                <div className="text-sm">
                  <span className="font-semibold">{award.playerName}</span>
                  <span className="text-muted-foreground ml-2">vs {award.fixtureOpponent}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => handleRemoveAward(award.id, award.playerName)}
                  disabled={deleteAward.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
