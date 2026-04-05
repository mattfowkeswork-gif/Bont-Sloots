import { useState } from "react";
import { useListFixtures, useCreateFixture, useUpdateFixture, useDeleteFixture, getListFixturesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Calendar as CalendarIcon, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";

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
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold">vs {fixture.opponent}</div>
                  <div className="text-sm text-muted-foreground flex gap-3 mt-1">
                    <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {format(new Date(fixture.matchDate), "MMM d, yyyy")}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fixture.kickoffTbc ? "TBC" : fixture.kickoffTime || "TBC"}</span>
                  </div>
                  {fixture.played && (
                    <div className="text-sm font-bold mt-1 text-primary">
                      Score: {fixture.homeScore} - {fixture.awayScore}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
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
                              <Label htmlFor="edit-played">Match Played</Label>
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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}