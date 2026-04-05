import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, CheckCircle2, Clock } from "lucide-react";
import { useGetVoteStatus, useCastVote, getGetVoteStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

function getColorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 70%, 25%)`;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

function getOrCreateDeviceId() {
  let id = localStorage.getItem("bsfc_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("bsfc_device_id", id);
  }
  return id;
}

interface Props {
  fixtureId: number;
  opponent: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MotmVotingDialog({ fixtureId, opponent, open, onOpenChange }: Props) {
  const deviceId = getOrCreateDeviceId();
  const queryClient = useQueryClient();
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [voted, setVoted] = useState(false);

  const { data: status, isLoading } = useGetVoteStatus(
    fixtureId,
    { deviceId },
    { query: { queryKey: getGetVoteStatusQueryKey(fixtureId, { deviceId }), enabled: open } }
  );

  const castVote = useCastVote();

  useEffect(() => {
    if (status?.hasVoted) setVoted(true);
  }, [status?.hasVoted]);

  const handleVote = () => {
    if (!selectedPlayer) return;
    castVote.mutate(
      { id: fixtureId, data: { playerId: selectedPlayer, deviceId } },
      {
        onSuccess: () => {
          setVoted(true);
          queryClient.invalidateQueries({ queryKey: getGetVoteStatusQueryKey(fixtureId, { deviceId }) });
        },
      }
    );
  };

  const sortedResults = status?.results ? [...status.results].sort((a, b) => b.votes - a.votes) : [];
  const maxVotes = sortedResults[0]?.votes ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Man of the Match
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs text-muted-foreground mb-3">vs {opponent}</div>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : !status?.isOpen && !voted ? (
          <div className="py-6 text-center text-muted-foreground text-sm">
            Voting has closed for this match.
          </div>
        ) : (
          <>
            {status?.votingClosesAt && status.isOpen && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 bg-card rounded-lg px-3 py-2 border border-border/30">
                <Clock className="w-3 h-3" />
                Voting closes {formatDistanceToNow(new Date(status.votingClosesAt), { addSuffix: true })}
              </div>
            )}

            {(voted || status?.hasVoted) ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Your vote has been recorded
                </div>
                <div className="space-y-2">
                  {sortedResults.map((p, i) => (
                    <div key={p.playerId} className="flex items-center gap-3">
                      <Avatar className="h-7 w-7 border border-border flex-shrink-0">
                        <AvatarFallback
                          className="text-white font-semibold text-[10px]"
                          style={{ backgroundColor: getColorFromName(p.playerName) }}
                        >
                          {getInitials(p.playerName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className={i === 0 && maxVotes > 0 ? "font-bold text-yellow-400" : "text-white"}>
                            {p.playerName}
                          </span>
                          <span className="text-muted-foreground text-xs">{p.votes} vote{p.votes !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-border/50 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${i === 0 && maxVotes > 0 ? "bg-yellow-400" : "bg-primary/50"}`}
                            style={{ width: maxVotes > 0 ? `${(p.votes / maxVotes) * 100}%` : "0%" }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {sortedResults.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-4">No votes yet.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Select a player to vote for Man of the Match:</p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {status?.eligiblePlayers.map(p => (
                    <button
                      key={p.playerId}
                      onClick={() => setSelectedPlayer(p.playerId)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selectedPlayer === p.playerId
                          ? "border-primary bg-primary/10"
                          : "border-border/50 bg-card hover:border-primary/50"
                      }`}
                    >
                      <Avatar className="h-8 w-8 border border-border flex-shrink-0">
                        <AvatarFallback
                          className="text-white font-semibold text-xs"
                          style={{ backgroundColor: getColorFromName(p.playerName) }}
                        >
                          {getInitials(p.playerName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-white">{p.playerName}</span>
                      {selectedPlayer === p.playerId && (
                        <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                      )}
                    </button>
                  ))}
                  {(!status?.eligiblePlayers || status.eligiblePlayers.length === 0) && (
                    <div className="text-center text-muted-foreground text-sm py-4">
                      No eligible players. Mark players as present in admin first.
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleVote}
                  disabled={!selectedPlayer || castVote.isPending}
                  className="w-full"
                >
                  {castVote.isPending ? "Submitting..." : "Cast Vote"}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
