import { useState } from "react";
import { useBulkCreateFixtures, useListSeasons, getListFixturesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, HelpCircle } from "lucide-react";

export function AdminBulkFixtures() {
  const [text, setText] = useState("");
  const [seasonId, setSeasonId] = useState<string>("none");
  const [defaultYear, setDefaultYear] = useState<string>(String(new Date().getFullYear()));
  const [showHelp, setShowHelp] = useState(false);

  const { data: seasons } = useListSeasons({});
  const bulkCreate = useBulkCreateFixtures();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!text.trim()) {
      toast({ title: "Please enter fixture details", variant: "destructive" });
      return;
    }

    bulkCreate.mutate(
      {
        data: {
          text: text.trim(),
          seasonId: seasonId !== "none" ? parseInt(seasonId) : null,
          defaultYear: parseInt(defaultYear),
        }
      },
      {
        onSuccess: (created) => {
          queryClient.invalidateQueries({ queryKey: getListFixturesQueryKey() });
          toast({ title: `${created.length} fixture${created.length !== 1 ? "s" : ""} created` });
          setText("");
        },
        onError: () => {
          toast({ title: "Failed to create fixtures", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Bulk Import Fixtures
          </div>
          <button
            onClick={() => setShowHelp(h => !h)}
            className="text-muted-foreground hover:text-white"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showHelp && (
          <div className="rounded-lg bg-secondary/50 border border-border/30 p-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-white">Accepted formats (one per line):</p>
            <p><code className="text-primary">12/04 vs Real Sosobad</code></p>
            <p><code className="text-primary">12/04/2026 vs Steel City FC</code></p>
            <p><code className="text-primary">12 Apr vs Staveley Wanderers</code></p>
            <p className="text-xs">Kickoff time defaults to TBC. Edit fixtures to add times.</p>
          </div>
        )}

        <div className="grid gap-2">
          <Label>Fixture List</Label>
          <Textarea
            placeholder={"12/04 vs Real Sosobad\n19/04 vs Steel City FC\n26/04 vs Staveley Wanderers"}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="bulk-year">Default Year</Label>
            <Select value={defaultYear} onValueChange={setDefaultYear}>
              <SelectTrigger id="bulk-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2025, 2026, 2027].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bulk-season">Season</Label>
            <Select value={seasonId} onValueChange={setSeasonId}>
              <SelectTrigger id="bulk-season">
                <SelectValue placeholder="No season" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No season</SelectItem>
                {seasons?.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          className="w-full"
          disabled={bulkCreate.isPending || !text.trim()}
        >
          {bulkCreate.isPending ? "Importing..." : "Import Fixtures"}
        </Button>
      </CardContent>
    </Card>
  );
}
