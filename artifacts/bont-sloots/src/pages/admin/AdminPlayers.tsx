import { useState } from "react";
import { useListPlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer, getListPlayersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

export function AdminPlayers() {
  const { data: players, isLoading } = useListPlayers({
    query: { queryKey: getListPlayersQueryKey() }
  });
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      position: formData.get("position") as string || null,
    };

    createPlayer.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
        setIsCreateOpen(false);
        toast({ title: "Player created" });
      }
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPlayer) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      position: formData.get("position") as string || null,
    };

    updatePlayer.mutate({ id: editingPlayer.id, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
        setEditingPlayer(null);
        toast({ title: "Player updated" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this player?")) {
      deletePlayer.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
          toast({ title: "Player deleted" });
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Squad Management</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Player</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Player</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="position">Position (Optional)</Label>
                <Input id="position" name="position" placeholder="e.g. Forward, Midfielder" />
              </div>
              <Button type="submit" className="w-full" disabled={createPlayer.isPending}>
                {createPlayer.isPending ? "Adding..." : "Add Player"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          players?.map(player => (
            <Card key={player.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold">{player.name}</div>
                  <div className="text-xs text-muted-foreground">{player.position || "No position"}</div>
                </div>
                <div className="flex gap-2">
                  <Dialog open={editingPlayer?.id === player.id} onOpenChange={(open) => !open && setEditingPlayer(null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => setEditingPlayer(player)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Edit Player</DialogTitle>
                      </DialogHeader>
                      {editingPlayer && (
                        <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                          <div className="grid gap-2">
                            <Label htmlFor="edit-name">Full Name</Label>
                            <Input id="edit-name" name="name" defaultValue={editingPlayer.name} required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit-position">Position</Label>
                            <Input id="edit-position" name="position" defaultValue={editingPlayer.position || ''} />
                          </div>
                          <Button type="submit" className="w-full" disabled={updatePlayer.isPending}>
                            {updatePlayer.isPending ? "Updating..." : "Update Player"}
                          </Button>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(player.id)}>
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