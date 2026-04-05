import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, RefreshCw, Save } from "lucide-react";

interface ScoutData {
  name?: string;
  rank: number;
  gf: number;
  ga: number;
  form: string;
  teamUrl?: string;
  verdicts?: string[];
  isOverride?: boolean;
}

export function AdminScout() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [opponentInput, setOpponentInput] = useState("");
  const [previewOpponent, setPreviewOpponent] = useState("");
  const [overrideForm, setOverrideForm] = useState({
    rank: "",
    gf: "",
    ga: "",
    form: "",
    teamUrl: "",
  });

  const { data: liveData, isLoading: liveLoading, isError: liveError, refetch: refetchLive } = useQuery<ScoutData>({
    queryKey: ["scout-preview", previewOpponent],
    queryFn: async () => {
      if (!previewOpponent) throw new Error("no opponent");
      const res = await fetch(`/api/scout?opponent=${encodeURIComponent(previewOpponent)}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    enabled: !!previewOpponent,
    retry: false,
    staleTime: 0,
  });

  const { data: existingOverride, refetch: refetchOverride } = useQuery<ScoutData | null>({
    queryKey: ["scout-override", previewOpponent],
    queryFn: async () => {
      if (!previewOpponent) return null;
      const res = await fetch(`/api/admin/scout-override?opponent=${encodeURIComponent(previewOpponent)}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!previewOpponent,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        opponent: previewOpponent,
        rank: parseInt(overrideForm.rank) || 1,
        gf: parseInt(overrideForm.gf) || 0,
        ga: parseInt(overrideForm.ga) || 0,
        form: overrideForm.form.toUpperCase().replace(/[^WDL]/g, ""),
        teamUrl: overrideForm.teamUrl,
      };
      const res = await fetch("/api/admin/scout-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Override saved", description: `Scout data saved for ${previewOpponent}` });
      queryClient.invalidateQueries({ queryKey: ["scout", previewOpponent] });
      queryClient.invalidateQueries({ queryKey: ["scout-override", previewOpponent] });
      refetchOverride();
    },
    onError: () => toast({ title: "Error", description: "Failed to save override", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/scout-override?opponent=${encodeURIComponent(previewOpponent)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Override cleared", description: `Live data will now be used for ${previewOpponent}` });
      queryClient.invalidateQueries({ queryKey: ["scout", previewOpponent] });
      queryClient.invalidateQueries({ queryKey: ["scout-override", previewOpponent] });
      setOverrideForm({ rank: "", gf: "", ga: "", form: "", teamUrl: "" });
      refetchOverride();
    },
    onError: () => toast({ title: "Error", description: "Failed to clear override", variant: "destructive" }),
  });

  function handleSearch() {
    if (!opponentInput.trim()) return;
    setPreviewOpponent(opponentInput.trim());
    setOverrideForm({ rank: "", gf: "", ga: "", form: "", teamUrl: "" });
  }

  function populateFromLive() {
    if (!liveData) return;
    setOverrideForm({
      rank: String(liveData.rank),
      gf: String(liveData.gf),
      ga: String(liveData.ga),
      form: liveData.form,
      teamUrl: liveData.teamUrl ?? "",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Scout Report Override</h2>
        <p className="text-xs text-muted-foreground">
          If the scraper can't match an opponent's name, set the data manually here.
        </p>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Look Up Opponent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Getting Old FC"
              value={opponentInput}
              onChange={e => setOpponentInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="bg-background border-border/50"
            />
            <Button onClick={handleSearch} size="icon" variant="outline">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewOpponent && (
        <>
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Live LeagueRepublic Data
                </CardTitle>
                <Button size="icon" variant="ghost" onClick={() => refetchLive()} disabled={liveLoading}>
                  <RefreshCw className={`w-4 h-4 ${liveLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {liveLoading && <p className="text-sm text-muted-foreground">Fetching from LeagueRepublic...</p>}
              {liveError && (
                <p className="text-sm text-red-400">
                  Could not find "{previewOpponent}" in the standings. Use the manual override below.
                </p>
              )}
              {liveData && !liveError && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-white">
                    Matched: <span className="text-primary">{liveData.name}</span>
                    {liveData.isOverride && (
                      <span className="ml-2 text-xs text-yellow-500">(using override)</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/5 rounded-lg py-2">
                      <div className="text-lg font-black text-white">#{liveData.rank}</div>
                      <div className="text-[10px] text-muted-foreground">Rank</div>
                    </div>
                    <div className="bg-white/5 rounded-lg py-2">
                      <div className="text-lg font-black text-emerald-400">{liveData.gf}</div>
                      <div className="text-[10px] text-muted-foreground">GF</div>
                    </div>
                    <div className="bg-white/5 rounded-lg py-2">
                      <div className="text-lg font-black text-red-400">{liveData.ga}</div>
                      <div className="text-[10px] text-muted-foreground">GA</div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Form: </span>
                    <span className="font-mono font-bold text-white">{liveData.form || "N/A"}</span>
                  </div>
                  {liveData.verdicts && liveData.verdicts.length > 0 && (
                    <div className="space-y-1">
                      {liveData.verdicts.map(v => (
                        <div key={v} className="text-xs text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-1">{v}</div>
                      ))}
                    </div>
                  )}
                  <Button size="sm" variant="outline" onClick={populateFromLive} className="w-full text-xs">
                    Copy to Override Form
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Manual Override for "{previewOpponent}"
                </CardTitle>
                {existingOverride && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {existingOverride && (
                <div className="mb-4 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-400">
                  An override is currently active for this opponent.
                </div>
              )}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Rank (Position)</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g. 2"
                      value={overrideForm.rank}
                      onChange={e => setOverrideForm(f => ({ ...f, rank: e.target.value }))}
                      className="bg-background border-border/50"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Form (W/D/L chars)</Label>
                    <Input
                      placeholder="e.g. WWDLL"
                      value={overrideForm.form}
                      onChange={e => setOverrideForm(f => ({ ...f, form: e.target.value.toUpperCase().replace(/[^WDLwdl]/g, "") }))}
                      className="bg-background border-border/50 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Goals For (GF)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 12"
                      value={overrideForm.gf}
                      onChange={e => setOverrideForm(f => ({ ...f, gf: e.target.value }))}
                      className="bg-background border-border/50"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Goals Against (GA)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 7"
                      value={overrideForm.ga}
                      onChange={e => setOverrideForm(f => ({ ...f, ga: e.target.value }))}
                      className="bg-background border-border/50"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">LeagueRepublic Team URL (optional)</Label>
                  <Input
                    placeholder="https://staveley6aside.leaguerepublic.com/team/..."
                    value={overrideForm.teamUrl}
                    onChange={e => setOverrideForm(f => ({ ...f, teamUrl: e.target.value }))}
                    className="bg-background border-border/50 text-xs"
                  />
                </div>
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !overrideForm.rank}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? "Saving..." : "Save Override"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
