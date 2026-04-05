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
        <TabsList className="grid w-full grid-cols-4 bg-card border border-border/50 h-auto p-1 mb-6">
          <TabsTrigger value="fixtures" className="py-2 text-xs">Fixtures</TabsTrigger>
          <TabsTrigger value="players" className="py-2 text-xs">Players</TabsTrigger>
          <TabsTrigger value="stats" className="py-2 text-xs">Stats</TabsTrigger>
          <TabsTrigger value="awards" className="py-2 text-xs">Awards</TabsTrigger>
        </TabsList>
        <TabsContent value="fixtures" className="mt-0">
          <AdminFixtures />
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
      </Tabs>
    </div>
  );
}