const POSITION_BG: Record<string, string> = {
  GK:  "#1d4ed8",
  DEF: "#15803d",
  MID: "#ca8a04",
  FWD: "#dc2626",
};

const DEFAULT_BG = "#52525b";

function getInitials(name: string) {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

interface JerseyCircleProps {
  name: string;
  position?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  grayscale?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<string, string> = {
  xs: "w-7 h-7 text-[10px]",
  sm: "w-10 h-10 text-sm",
  md: "w-14 h-14 text-lg",
  lg: "w-28 h-28 text-3xl",
};

export function JerseyCircle({ name, position, size = "md", grayscale = false, className = "" }: JerseyCircleProps) {
  const pos = position?.toUpperCase() ?? "";
  const bg = POSITION_BG[pos] ?? DEFAULT_BG;
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div
      className={`rounded-full flex items-center justify-center font-black text-white flex-shrink-0 select-none border-2 border-white/10 shadow-md shadow-black/40 ${sizeClass} ${className}`}
      style={{
        backgroundColor: bg,
        filter: grayscale ? "grayscale(100%)" : undefined,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
