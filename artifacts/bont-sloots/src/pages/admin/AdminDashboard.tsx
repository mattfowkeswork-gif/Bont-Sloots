import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut } from "lucide-react";
import { AdminFixtures } from "./AdminFixtures";
import { AdminPlayers } from "./AdminPlayers";
import { AdminStats } from "./AdminStats";
import { AdminAwards } from "./AdminAwards";
import { AdminBulkFixtures } from "./AdminBulkFixtures";
import { AdminSettings } from "./AdminSettings";

export function AdminDashboard() {
  const { isAuthenticated, logout } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-xs text-muted-foreground">Manage Bont Sloots FC</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </div>

      <Tabs defaultValue="fixtures" className="w-full">
        <div className="overflow-x-auto mb-6">
          <TabsList className="inline-flex w-max bg-card border border-border/50 h-auto p-1 gap-1">
            <TabsTrigger value="fixtures" className="py-2 px-3 text-xs">Fixtures</TabsTrigger>
            <TabsTrigger value="bulk" className="py-2 px-3 text-xs">Import</TabsTrigger>
            <TabsTrigger value="players" className="py-2 px-3 text-xs">Players</TabsTrigger>
            <TabsTrigger value="stats" className="py-2 px-3 text-xs">Stats</TabsTrigger>
            <TabsTrigger value="awards" className="py-2 px-3 text-xs">Awards</TabsTrigger>
            <TabsTrigger value="settings" className="py-2 px-3 text-xs">Settings</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="fixtures" className="mt-0">
          <AdminFixtures />
        </TabsContent>
        <TabsContent value="bulk" className="mt-0">
          <AdminBulkFixtures />
        </TabsContent>
        <TabsContent value="players" className="mt-0">
          <AdminPlayers />
        </TabsContent>
        <TabsContent value="stats" className="mt-0">
          <AdminStats />
        </TabsContent>
        <TabsContent value="awards" className="mt-0">
          <AdminAwards />
        </TabsContent>
        <TabsContent value="settings" className="mt-0">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}