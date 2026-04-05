import { ShieldHalf } from "lucide-react";
import { Link, useLocation } from "wouter";

export function Header() {
  const [_, setLocation] = useLocation();
  let clicks = 0;
  
  const handleLogoClick = () => {
    clicks += 1;
    if (clicks >= 3) {
      setLocation("/admin");
      clicks = 0;
    }
    setTimeout(() => {
      clicks = 0;
    }, 1000);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4">
        <div className="flex flex-1 items-center justify-between">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg flex items-center justify-center">
              <ShieldHalf className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight uppercase">Bont Sloots <span className="text-primary">FC</span></span>
          </div>
        </div>
      </div>
    </header>
  );
}