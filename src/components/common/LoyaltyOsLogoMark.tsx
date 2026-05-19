import { cn } from "@/lib/utils";

type LoyaltyOsLogoMarkProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  showWordmark?: boolean;
};

const sizeMap = {
  sm: { box: "h-9 w-9 rounded-lg text-sm", word: "text-base" },
  md: { box: "h-12 w-12 rounded-xl text-lg", word: "text-xl" },
  lg: { box: "h-16 w-16 rounded-2xl text-2xl", word: "text-2xl" },
};

/** Brand mark used in loaders and auth screens (no external image asset required). */
export function LoyaltyOsLogoMark({
  size = "md",
  className,
  showWordmark = true,
}: LoyaltyOsLogoMarkProps) {
  const s = sizeMap[size];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/25",
          s.box
        )}
        aria-hidden
      >
        <span className="text-white font-bold leading-none">L</span>
      </div>
      {showWordmark ? (
        <span className={cn("font-semibold tracking-tight text-foreground", s.word)}>
          LoyaltyOS
        </span>
      ) : null}
    </div>
  );
}
