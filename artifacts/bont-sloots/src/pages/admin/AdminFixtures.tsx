import { useState, useEffect } from "react";
import {
  useListFixtures, useCreateFixture, useUpdateFixture, useDeleteFixture,
  getListFixturesQueryKey, useGetFixturePlayers, useSetFixturePlayers,
  getGetFixturePlayersQueryKey,
  useGetFixtureRatings, useSetFixtureRatings, getGetFixtureRatingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Calendar as CalendarIcon, Clock, Users, Star, Minus as MinusIcon } from "lucide-react";
import { format } from "date-fns";

// Player presence dialog for a single fixture
function PresenceDialog({ fixtureId, opponent }: { fixtureId: number; opponent: string }) {
  const [open, setOpen] = useState(false);
  const { data: players, isLoading } = useGetFixturePlayers(fixtureId, {
    query: { queryKey: getGetFixturePlayersQueryKey(fixtureId), enabled: open }
  });
  const setFixturePlayers = useSetFixturePlayers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o && players) {
      setSelected(new Set(players.filter(p => p.present).map(p => p.playerId)));
    }
  };

  const handleSave = () => {
    setFixturePlayers.mutate(
      { id: fixtureId, data: { playerIds: Array.from(selected) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFixturePlayersQueryKey(fixtureId) });
          toast({ title: "Presence saved" });
          setOpen(false);
        },
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      }
    );
  };

  const togglePlayer = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Sync selected with loaded players
  const handleDialogOpen = (o: boolean) => {
    if (o && players) {
      setSelected(new Set(players.filter(p => p.present).map(p => p.playerId)));
    }
    handleOpen(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Set players present">
          <Users className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle>Players Present – vs {opponent}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-6 text-center text-muted-foreground text-sm">Loading...</div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {players?.map(p => (
                <label key={p.playerId} className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors">
                  <Checkbox
                    checked={selected.has(p.playerId)}
                    onCheckedChange={() => togglePlayer(p.playerId)}
                    id={`player-${p.playerId}`}
                  />
                  <span className="text-sm text-white">{p.playerName}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {selected.has(p.playerId) ? "Present" : ""}
                  </span>
                </label>
              ))}
            </div>
            <div className="text-xs text-muted-foreground border-t border-border/30 pt-3">
              {selected.size} player{selected.size !== 1 ? "s" : ""} marked present
            </div>
            <Button onClick={handleSave} className="w-full" disabled={setFixturePlayers.isPending}>
              {setFixturePlayers.isPending ? "Saving..." : "Save Presence"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RatingsDialog({ fixtureId, opponent }: { fixtureId: number; opponent: string }) {
  const [open, setOpen] = useState(false);
  const { data: players, isLoading } = useGetFixtureRatings(fixtureId, {
    query: { queryKey: getGetFixtureRatingsQueryKey(fixtureId), enabled: open }
  });
  const setRatings = useSetFixtureRatings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [localRatings, setLocalRatings] = useState<Record<number, string>>({});

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (!o) setLocalRatings({});
  };

  // Populate ratings from loaded data whenever it arrives
  useEffect(() => {
    if (players && open) {
      const initial: Record<number, string> = {};
      players.forEach(p => { if (p.rating !== null && p.rating !== undefined) initial[p.playerId] = String(p.rating); });
      setLocalRatings(initial);
    }
  }, [players, open]);

  const handleSave = () => {
    const ratings = Object.entries(localRatings)
      .filter(([, v]) => v !== "")
      .map(([playerId, rating]) => ({ playerId: Number(playerId), rating: Number(rating) }));

    if (ratings.length === 0) {
      toast({ title: "No ratings to save", variant: "destructive" });
      return;
    }

    setRatings.mutate({ id: fixtureId, data: { ratings } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetFixtureRatingsQueryKey(fixtureId) });
        toast({ title: "Ratings saved" });
        setOpen(false);
      },
      onError: () => toast({ title: "Failed to save ratings", variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Rate players">
          <Star className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Match Ratings – vs {opponent}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-6 text-center text-muted-foreground text-sm">Loading players...</div>
        ) : !players || players.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">
            No players marked present for this fixture.
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">Tap – / + to set each player's rating.</p>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
              {players.map(p => {
                const current = localRatings[p.playerId] !== undefined ? Number(localRatings[p.playerId]) : null;
                const ratingColor = current == null ? "text-muted-foreground"
                  : current >= 8 ? "text-emerald-400"
                  : current >= 6 ? "text-yellow-400"
                  : current >= 4 ? "text-orange-400"
                  : "text-red-400";

                const step = (dir: 1 | -1) => {
                  const next = Math.round(((current ?? 5) + dir * 0.5) * 10) / 10;
                  if (next < 0 || next > 10) return;
                  setLocalRatings(prev => ({ ...prev, [p.playerId]: String(next) }));
                };

                return (
                  <div key={p.playerId} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-secondary/30">
                    <span className="text-sm text-white flex-1 truncate">{p.playerName}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => step(-1)}
                        disabled={current === 0}
                        className="w-9 h-9 rounded-lg border border-border bg-secondary flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <span className={`w-12 text-center font-bold font-mono text-base ${ratingColor}`}>
                        {current != null ? current.toFixed(1) : "–"}
                      </span>
                      <button
                        type="button"
                        onClick={() => step(1)}
                        disabled={current === 10}
                        className="w-9 h-9 rounded-lg border border-border bg-secondary flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button onClick={handleSave} className="w-full" disabled={setRatings.isPending}>
              {setRatings.isPending ? "Saving..." : "Save Ratings"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AdminFixtures() {
  const { data: fixtures, isLoading } = useListFixtures({
    query: { queryKey: getListFixturesQueryKey() }
  });
  const createFixture = useCreateFixture();
  const updateFixture = useUpdateFixture();
  const deleteFixture = useDeleteFixture();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFixture, setEditingFixture] = useState<any>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      opponent: formData.get("opponent") as string,
      matchDate: formData.get("matchDate") as string,
      kickoffTime: formData.get("kickoffTime") as string || null,
      kickoffTbc: formData.get("kickoffTbc") === "on",
      isHome: formData.get("isHome") === "home",
      venue: formData.get("venue") as string || null,
    };

    createFixture.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFixturesQueryKey() });
        setIsCreateOpen(false);
        toast({ title: "Fixture created" });
      }
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingFixture) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      opponent: formData.get("opponent") as string,
      matchDate: formData.get("matchDate") as string,
      kickoffTime: formData.get("kickoffTime") as string || null,
      kickoffTbc: formData.get("kickoffTbc") === "on",
      homeScore: formData.get("homeScore") ? Number(formData.get("homeScore")) : null,
      awayScore: formData.get("awayScore") ? Number(formData.get("awayScore")) : null,
      played: formData.get("played") === "on",
      isHome: formData.get("isHome") === "home",
      venue: formData.get("venue") as string || null,
    };

    updateFixture.mutate({ id: editingFixture.id, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFixturesQueryKey() });
        setEditingFixture(null);
        toast({ title: "Fixture updated" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this fixture?")) {
      deleteFixture.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFixturesQueryKey() });
          toast({ title: "Fixture deleted" });
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Fixtures</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Fixture</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Fixture</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="opponent">Opponent</Label>
                <Input id="opponent" name="opponent" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="matchDate">Date</Label>
                <Input id="matchDate" name="matchDate" type="date" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="kickoffTime">Time</Label>
                  <Input id="kickoffTime" name="kickoffTime" type="time" />
                </div>
                <div className="flex items-center gap-2 mt-8">
                  <Checkbox id="kickoffTbc" name="kickoffTbc" />
                  <Label htmlFor="kickoffTbc">Time TBC</Label>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="isHome">Home/Away</Label>
                <Select name="isHome" defaultValue="home">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="away">Away</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="venue">Venue</Label>
                <Input id="venue" name="venue" />
              </div>
              <Button type="submit" className="w-full" disabled={createFixture.isPending}>
                {createFixture.isPending ? "Creating..." : "Create Fixture"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          fixtures?.map(fixture => (
            <Card key={fixture.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">vs {fixture.opponent}</div>
                    <div className="text-sm text-muted-foreground flex gap-3 mt-1">
                      <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {format(new Date(fixture.matchDate), "MMM d, yyyy")}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fixture.kickoffTbc ? "TBC" : fixture.kickoffTime || "TBC"}</span>
                    </div>
                    {fixture.played && (
                      <div className="text-sm font-bold mt-1 text-primary">
                        Score: {fixture.homeScore} - {fixture.awayScore}
                        {fixture.votingClosesAt && new Date(fixture.votingClosesAt) > new Date() && (
                          <span className="ml-2 text-yellow-400 font-normal text-xs">Voting open</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {fixture.played && (
                      <PresenceDialog fixtureId={fixture.id} opponent={fixture.opponent} />
                    )}
                    {fixture.played && (
                      <RatingsDialog fixtureId={fixture.id} opponent={fixture.opponent} />
                    )}
                    <Dialog open={editingFixture?.id === fixture.id} onOpenChange={(open) => !open && setEditingFixture(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => setEditingFixture(fixture)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
                        <DialogHeader>
                          <DialogTitle>Edit Fixture</DialogTitle>
                        </DialogHeader>
                        {editingFixture && (
                          <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                            <div className="grid gap-2">
                              <Label htmlFor="edit-opponent">Opponent</Label>
                              <Input id="edit-opponent" name="opponent" defaultValue={editingFixture.opponent} required />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="edit-matchDate">Date</Label>
                              <Input id="edit-matchDate" name="matchDate" type="date" defaultValue={editingFixture.matchDate?.split('T')[0]} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-kickoffTime">Time</Label>
                                <Input id="edit-kickoffTime" name="kickoffTime" type="time" defaultValue={editingFixture.kickoffTime || ''} />
                              </div>
                              <div className="flex items-center gap-2 mt-8">
                                <Checkbox id="edit-kickoffTbc" name="kickoffTbc" defaultChecked={editingFixture.kickoffTbc} />
                                <Label htmlFor="edit-kickoffTbc">Time TBC</Label>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="edit-isHome">Home/Away</Label>
                              <Select name="isHome" defaultValue={editingFixture.isHome ? "home" : "away"}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="home">Home</SelectItem>
                                  <SelectItem value="away">Away</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="edit-venue">Venue</Label>
                              <Input id="edit-venue" name="venue" defaultValue={editingFixture.venue || ''} />
                            </div>

                            <div className="border-t border-border pt-4 mt-4">
                              <h3 className="font-bold mb-2 text-sm text-primary">Match Result</h3>
                              <div className="flex items-center gap-2 mb-4">
                                <Checkbox id="edit-played" name="played" defaultChecked={editingFixture.played} />
                                <Label htmlFor="edit-played">Match Finished</Label>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="edit-homeScore">Home Score</Label>
                                  <Input id="edit-homeScore" name="homeScore" type="number" defaultValue={editingFixture.homeScore ?? ''} />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="edit-awayScore">Away Score</Label>
                                  <Input id="edit-awayScore" name="awayScore" type="number" defaultValue={editingFixture.awayScore ?? ''} />
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                Marking as Finished opens a 48-hour MOTM voting window.
                              </p>
                            </div>

                            <Button type="submit" className="w-full" disabled={updateFixture.isPending}>
                              {updateFixture.isPending ? "Updating..." : "Update Fixture"}
                            </Button>
                          </form>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Button variant="destructive" size="icon" onClick={() => handleDelete(fixture.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
