import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ImagePlus, Loader2 } from "lucide-react";

interface MatchReportPhoto {
  id: number;
  photoUrl: string;
  caption: string | null;
}

interface MatchReport {
  id: number;
  fixtureId: number;
  overview: string | null;
  photos: MatchReportPhoto[];
}

async function fetchReport(fixtureId: number): Promise<MatchReport | null> {
  const res = await fetch(`/api/fixtures/${fixtureId}/report`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch report");
  return res.json();
}

interface AdminMatchReportDialogProps {
  fixtureId: number;
  opponent: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminMatchReportDialog({ fixtureId, opponent, open, onOpenChange }: AdminMatchReportDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [overview, setOverview] = useState<string>("");
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reportKey = ["match-report", fixtureId];

  const { data: report, isLoading } = useQuery({
    queryKey: reportKey,
    queryFn: () => fetchReport(fixtureId),
    enabled: open,
    staleTime: 0,
  });

  // Populate overview when data loads
  if (report !== undefined && !initialized) {
    setOverview(report?.overview ?? "");
    setInitialized(true);
  }

  const resetState = () => {
    setInitialized(false);
    setOverview("");
  };

  const saveOverview = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/fixtures/${fixtureId}/report`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overview }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKey });
      toast({ title: "Report saved" });
    },
    onError: () => toast({ title: "Failed to save report", variant: "destructive" }),
  });

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/fixtures/${fixtureId}/report/photos`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKey });
      toast({ title: "Photo added" });
    },
    onError: () => toast({ title: "Failed to upload photo", variant: "destructive" }),
  });

  const deletePhoto = useMutation({
    mutationFn: async (photoId: number) => {
      const res = await fetch(`/api/fixtures/${fixtureId}/report/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKey });
      toast({ title: "Photo removed" });
    },
    onError: () => toast({ title: "Failed to remove photo", variant: "destructive" }),
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadPhoto.mutate(file);
    e.target.value = "";
  }, [uploadPhoto]);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Match Report — vs {opponent}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Match Overview</label>
            <Textarea
              value={overview}
              onChange={e => setOverview(e.target.value)}
              placeholder="Write a summary of how the match went..."
              className="min-h-[120px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={() => saveOverview.mutate()}
              disabled={saveOverview.isPending || isLoading}
              size="sm"
              className="w-full"
            >
              {saveOverview.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Overview"}
            </Button>
          </div>

          <div className="space-y-3 border-t border-border/30 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">Match Photos</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadPhoto.isPending}
              >
                {uploadPhoto.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                  : <><ImagePlus className="w-4 h-4 mr-2" />Add Photo</>}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : !report?.photos.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No photos yet. Add some!</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {report.photos.map(photo => (
                  <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-video bg-secondary">
                    <img
                      src={`/api/storage${photo.photoUrl}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => deletePhoto.mutate(photo.id)}
                      disabled={deletePhoto.isPending}
                      className="absolute top-1 right-1 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PublicMatchReportDialogProps {
  fixtureId: number;
  opponent: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublicMatchReportDialog({ fixtureId, opponent, open, onOpenChange }: PublicMatchReportDialogProps) {
  const reportKey = ["match-report", fixtureId];

  const { data: report, isLoading } = useQuery({
    queryKey: reportKey,
    queryFn: () => fetchReport(fixtureId),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Match Report — vs {opponent}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !report ? (
          <p className="text-sm text-muted-foreground text-center py-8">No report available.</p>
        ) : (
          <div className="space-y-5 pt-2">
            {report.overview && (
              <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">{report.overview}</p>
            )}

            {report.photos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Photos</p>
                <div className="grid grid-cols-2 gap-2">
                  {report.photos.map(photo => (
                    <div key={photo.id} className="rounded-lg overflow-hidden aspect-video bg-secondary">
                      <img
                        src={`/api/storage${photo.photoUrl}`}
                        alt={photo.caption ?? "Match photo"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export async function fixtureHasReport(fixtureId: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/fixtures/${fixtureId}/report`);
    return res.ok;
  } catch {
    return false;
  }
}
