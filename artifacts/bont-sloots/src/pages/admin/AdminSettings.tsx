import { useState } from "react";
import { useGetSetting, useSetSetting, getGetSettingQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Image, X } from "lucide-react";

export function AdminSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: photoSetting } = useGetSetting("squad_photo_url", {
    query: { queryKey: getGetSettingQueryKey("squad_photo_url") }
  });
  const setSetting = useSetSetting();

  const [photoUrl, setPhotoUrl] = useState("");

  const currentPhoto = photoSetting?.value ?? null;

  const handleSetPhoto = () => {
    if (!photoUrl.trim()) return;
    setSetting.mutate({ key: "squad_photo_url", data: { value: photoUrl.trim() } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingQueryKey("squad_photo_url") });
        setPhotoUrl("");
        toast({ title: "Squad photo updated" });
      }
    });
  };

  const handleRemovePhoto = () => {
    setSetting.mutate({ key: "squad_photo_url", data: { value: "" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingQueryKey("squad_photo_url") });
        toast({ title: "Squad photo removed" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Club Settings</h2>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="w-4 h-4 text-primary" /> Squad Photo Banner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            This photo is displayed as a banner at the top of the Home page. Paste a direct image URL (e.g. from Google Photos, Imgur, or Dropbox).
          </p>

          {currentPhoto && currentPhoto !== "" ? (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border border-border/50 max-h-48">
                <img src={currentPhoto} alt="Current squad photo" className="w-full object-cover object-center max-h-48" />
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleRemovePhoto} disabled={setSetting.isPending}>
                  <X className="w-3.5 h-3.5 mr-1" /> Remove Photo
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card rounded-lg p-4 border border-border/50">
              <Image className="w-8 h-8 opacity-30" />
              <span>No squad photo set yet.</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="photo-url">New Photo URL</Label>
            <div className="flex gap-2">
              <Input
                id="photo-url"
                value={photoUrl}
                onChange={e => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="text-sm"
              />
              <Button onClick={handleSetPhoto} disabled={setSetting.isPending || !photoUrl.trim()}>
                {setSetting.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
