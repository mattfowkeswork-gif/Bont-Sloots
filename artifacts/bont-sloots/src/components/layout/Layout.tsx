import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground pb-16 md:pb-0">
      <Header />
      <main className="flex-1 container max-w-md mx-auto px-4 py-6 md:max-w-2xl relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {!isAdmin && (
        <footer className="mt-auto pb-20 md:pb-4 text-center px-4">
          <div className="text-[11px] text-muted-foreground/50 flex items-center justify-center gap-1.5">
            <span>Bont Sloots</span>
            <span>&middot;</span>
            <a
              href="https://staveley6aside.leaguerepublic.com/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted-foreground transition-colors underline-offset-2 underline decoration-muted-foreground/30"
            >
              Real Sosobad (Official)
            </a>
          </div>
        </footer>
      )}

      {!isAdmin && <BottomNav />}
    </div>
  );
}
