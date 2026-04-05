import { useState, useRef } from "react";
import {
  useListPlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer, getListPlayersQueryKey,
  useListPlayerComments, useAddPlayerComment, useDeletePlayerComment, getListPlayerCommentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, MessageSquare, X, Camera, Loader2 } from "lucide-react";

function getColorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 55%, 20%)`;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

function PlayerComments({ playerId }: { playerId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: comments, isLoading } = useListPlayerComments(playerId, {
    query: { queryKey: getListPlayerCommentsQueryKey(playerId) }
  });
  const addComment = useAddPlayerComment();
  const deleteComment = useDeletePlayerComment();
  const [text, setText] = useState("");

  const handleAdd = () => {
    if (!text.trim()) return;
    addComment.mutate({ id: playerId, data: { comment: text.trim() } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlayerCommentsQueryKey(playerId) });
        setText("");
        toast({ title: "Comment added" });
      }
    });
  };

  const handleDelete = (commentId: number) => {
    deleteComment.mutate({ commentId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlayerCommentsQueryKey(playerId) });
        toast({ title: "Comment deleted" });
      }
    });
  };

  return (
    <div className="space-y-3 pt-3 border-t border-border/50">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <MessageSquare className="w-3 h-3" /> Teammate Comments
      </div>

      {isLoading ? <div className="text-xs text-muted-foreground">Loading...</div> : null}

      {comments && comments.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {comments.map(comment => (
            <div key={comment.id} className="flex items-start gap-2 text-xs bg-background rounded-lg p-2">
              <p className="flex-1 text-muted-foreground italic">"{comment.comment}"</p>
              <button onClick={() => handleDelete(comment.id)} className="text-red-400 hover:text-red-300 shrink-0 mt-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a quote from the lads..."
          className="text-xs h-8"
          onKeyDown={e => e.key === "Enter" && handleAdd()}
        />
        <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={addComment.isPending || !text.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

function PhotoUploader({ playerId, playerName, currentPhotoUrl, onUploaded }: {
  playerId: number;
  playerName: string;
  currentPhotoUrl?: string | null;
  onUploaded: (photoUrl: string) => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch(`/api/players/${playerId}/photo`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      onUploaded(data.photoUrl);
      toast({ title: "Photo uploaded!", description: "Profile picture updated successfully." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setPreview(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const displaySrc = preview
    || (currentPhotoUrl ? `/api/storage${currentPhotoUrl}` : null);

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* Photo preview */}
      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30 bg-zinc-800 flex items-center justify-center">
        {displaySrc ? (
          <img src={displaySrc} alt={playerName} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white font-black text-2xl"
            style={{ backgroundColor: getColorFromName(playerName) }}
          >
            {getInitials(playerName)}
          </div>
        )}
      </div>

      {/* Upload button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
        ) : (
          <><Camera className="w-4 h-4" /> {currentPhotoUrl || preview ? "Change Photo" : "Upload Profile Photo"}</>
        )}
      </Button>

      <p className="text-[11px] text-muted-foreground text-center">
        Photo will be automatically cropped to a square and resized to 500×500px.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

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
  const [commentsPlayerId, setCommentsPlayerId] = useState<number | null>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPlayer.mutate({
      data: {
        name: formData.get("name") as string,
        position: (formData.get("position") as string) || null,
        scoutingProfile: (formData.get("scoutingProfile") as string) || null,
      }
    }, {
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
    updatePlayer.mutate({
      id: editingPlayer.id,
      data: {
        name: formData.get("name") as string,
        position: (formData.get("position") as string) || null,
        scoutingProfile: (formData.get("scoutingProfile") as string) || null,
      }
    }, {
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

  const handlePhotoUploaded = (playerId: number, photoUrl: string) => {
    queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
    if (editingPlayer?.id === playerId) {
      setEditingPlayer((prev: any) => ({ ...prev, photoUrl }));
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
                <Label htmlFor="position">Position</Label>
                <Input id="position" name="position" placeholder="GK / DEF / MID / FWD" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scoutingProfile">Scouting Profile</Label>
                <Textarea id="scoutingProfile" name="scoutingProfile" placeholder="A brief description of the player..." rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={createPlayer.isPending}>
                {createPlayer.isPending ? "Adding..." : "Add Player"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          players?.map(player => (
            <Card key={player.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Mini avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-primary/20 flex-shrink-0">
                      {(player as any).photoUrl ? (
                        <img
                          src={`/api/storage${(player as any).photoUrl}`}
                          alt={player.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white font-black text-sm"
                          style={{ backgroundColor: getColorFromName(player.name) }}
                        >
                          {getInitials(player.name)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold">{player.name}</div>
                      <div className="text-xs text-muted-foreground">{player.position || "No position"}</div>
                      {player.scoutingProfile && (
                        <div className="text-xs text-muted-foreground mt-1 italic truncate">"{player.scoutingProfile}"</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCommentsPlayerId(commentsPlayerId === player.id ? null : player.id)}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </Button>

                    <Dialog open={editingPlayer?.id === player.id} onOpenChange={(open) => !open && setEditingPlayer(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditingPlayer(player)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Player</DialogTitle>
                        </DialogHeader>
                        {editingPlayer && (
                          <div className="space-y-4 pt-2">
                            {/* Photo upload section */}
                            <div className="border border-border/50 rounded-lg p-3 bg-background/50">
                              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
                                <Camera className="w-3 h-3" /> Profile Photo
                              </div>
                              <PhotoUploader
                                playerId={editingPlayer.id}
                                playerName={editingPlayer.name}
                                currentPhotoUrl={editingPlayer.photoUrl}
                                onUploaded={(photoUrl) => handlePhotoUploaded(editingPlayer.id, photoUrl)}
                              />
                            </div>

                            {/* Player details form */}
                            <form onSubmit={handleUpdate} className="space-y-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-name">Full Name</Label>
                                <Input id="edit-name" name="name" defaultValue={editingPlayer.name} required />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-position">Position</Label>
                                <Input id="edit-position" name="position" defaultValue={editingPlayer.position || ""} placeholder="GK / DEF / MID / FWD" />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-scoutingProfile">Scouting Profile</Label>
                                <Textarea
                                  id="edit-scoutingProfile"
                                  name="scoutingProfile"
                                  defaultValue={editingPlayer.scoutingProfile || ""}
                                  placeholder="A brief description of the player..."
                                  rows={3}
                                />
                              </div>
                              <Button type="submit" className="w-full" disabled={updatePlayer.isPending}>
                                {updatePlayer.isPending ? "Updating..." : "Update Player"}
                              </Button>
                            </form>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(player.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {commentsPlayerId === player.id && <PlayerComments playerId={player.id} />}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
