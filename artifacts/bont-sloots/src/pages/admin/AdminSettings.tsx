import { useRef, useState } from "react";
import { useGetSetting, useSetSetting, getGetSettingQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Image, Upload, X, Link } from "lucide-react";

function compressImage(file: File, maxWidth = 1400, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AdminSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: photoSetting } = useGetSetting("squad_photo_url", {
    query: { queryKey: getGetSettingQueryKey("squad_photo_url") }
  });
  const setSetting = useSetSetting();

  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"upload" | "url">("upload");

  const currentPhoto = photoSetting?.value ?? null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      setSetting.mutate({ key: "squad_photo_url", data: { value: dataUrl } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingQueryKey("squad_photo_url") });
          toast({ title: "Squad photo uploaded" });
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
        onError: () => {
          toast({ title: "Upload failed", variant: "destructive" });
          setUploading(false);
        }
      });
    } catch {
      toast({ title: "Failed to process image", variant: "destructive" });
      setUploading(false);
    }
  };

  const handleSetUrl = () => {
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
            Shown as a banner at the top of the Home page.
          </p>

          {currentPhoto && currentPhoto !== "" ? (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border border-border/50 max-h-48">
                <img src={currentPhoto} alt="Current squad photo" className="w-full object-cover object-center max-h-48" />
              </div>
              <Button variant="destructive" size="sm" onClick={handleRemovePhoto} disabled={setSetting.isPending}>
                <X className="w-3.5 h-3.5 mr-1" /> Remove Photo
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card rounded-lg p-4 border border-border/50">
              <Image className="w-8 h-8 opacity-30" />
              <span>No squad photo set yet.</span>
            </div>
          )}

          <div className="flex gap-1 p-1 bg-muted rounded-lg w-full">
            <button
              onClick={() => setMode("upload")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === "upload" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <Upload className="w-3.5 h-3.5" /> Upload File
            </button>
            <button
              onClick={() => setMode("url")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === "url" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <Link className="w-3.5 h-3.5" /> Paste URL
            </button>
          </div>

          {mode === "upload" ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                className="w-full"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || setSetting.isPending}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Choose Photo from Device"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="photo-url">Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="photo-url"
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-sm"
                />
                <Button onClick={handleSetUrl} disabled={setSetting.isPending || !photoUrl.trim()}>
                  {setSetting.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
