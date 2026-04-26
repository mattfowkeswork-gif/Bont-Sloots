import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export function AdminLogin() {
  const { login } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const adminLogin = useAdminLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      password: "",
    },
  });

  const onSubmit = () => {
  login("fake-token");
  setLocation("/admin/dashboard");
};

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-full max-w-sm bg-card border border-border/50 rounded-xl p-6 shadow-xl shadow-black/50">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-primary/20 text-primary p-3 rounded-full mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white">Admin Access</h1>
          <p className="text-xs text-muted-foreground mt-1 text-center">Restricted area for team management.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter password" 
                      className="bg-background text-center text-lg"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full"
              disabled={adminLogin.isPending}
            >
              {adminLogin.isPending ? "Verifying..." : "Access Panel"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
