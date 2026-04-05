import { useState } from "react";
import { useListFixtures, useListPlayers, useCreateAward, getListStatsQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Star, AlertTriangle } from "lucide-react";

export function AdminAwards() {
  const { data: fixtures } = useListFixtures();
  const { data: players } = useListPlayers();
  const createAward = useCreateAward();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [fixtureId, setFixtureId] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [awardType, setAwardType] = useState<"mom" | "motm">("mom");

  const playedFixtures = fixtures?.filter(f => f.played) || [];

  const handleAddAward = () => {
    if (!fixtureId || !playerId) {
      toast({ title: "Please select both fixture and player", variant: "destructive" });
      return;
    }

    createAward.mutate({
      data: {
        fixtureId: Number(fixtureId),
        playerId: Number(playerId),
        type: awardType
      }
    }, {
      onSuccess: () => {
        toast({ title: `${awardType === 'mom' ? 'MOM' : 'MOTM'} awarded successfully` });
        queryClient.invalidateQueries({ queryKey: getListStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Assign Awards</h2>
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
              <Label>Award Type</Label>
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant={awardType === "mom" ? "default" : "outline"}
                  className={`flex-1 ${awardType === 'mom' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}`}
                  onClick={() => setAwardType("mom")}
                >
                  <Star className={`w-4 h-4 mr-2 ${awardType === 'mom' ? 'text-white' : 'text-yellow-500'}`} fill={awardType === 'mom' ? 'currentColor' : 'none'} /> 
                  MOM
                </Button>
                <Button 
                  type="button"
                  variant={awardType === "motm" ? "default" : "outline"}
                  className={`flex-1 ${awardType === 'motm' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                  onClick={() => setAwardType("motm")}
                >
                  <AlertTriangle className={`w-4 h-4 mr-2 ${awardType === 'motm' ? 'text-white' : 'text-red-500'}`} /> 
                  MOTM
                </Button>
              </div>
            </div>

            <Button 
              onClick={handleAddAward} 
              className="w-full mt-4"
              disabled={!fixtureId || !playerId || createAward.isPending}
            >
              {createAward.isPending ? "Saving..." : "Assign Award"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}