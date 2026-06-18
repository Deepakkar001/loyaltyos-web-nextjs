import Image from "next/image";

import { cn } from "@/lib/utils";

export const LOGO_IMAGE_SRC = "/images/loyalty_logo_removebg.png";
export const LOGO_ALT = "LoyaltyOS";

const sizeMap = {
  sm: { width: 160, height: 44, className: "h-9 w-auto max-w-[10rem]" },
  md: { width: 200, height: 56, className: "h-11 w-auto max-w-[12.5rem]" },
  lg: { width: 240, height: 68, className: "h-14 w-auto max-w-[15rem]" },
} as const;

export type LogoSize = keyof typeof sizeMap;

export type LogoProps = {
  size?: LogoSize;
  /** Optional line below the logo (e.g. tenant name). */
  subtitle?: string;
  className?: string;
  imageClassName?: string;
  subtitleClassName?: string;
  /** @deprecated Wordmark is included in the logo image. */
  showWordmark?: boolean;
  /** @deprecated Use imageClassName instead. */
  markClassName?: string;
  /** @deprecated Wordmark is included in the logo image. */
  wordmarkClassName?: string;
};

/** Full LoyaltyOS brand image with optional subtitle. */
export function Logo({
  size = "lg",
  subtitle,
  className,
  imageClassName,
  subtitleClassName,
}: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn("flex min-w-0 flex-col items-start gap-2", className)}>
      <Image
        src={LOGO_IMAGE_SRC}
        alt={LOGO_ALT}
        width={s.width}
        height={s.height}
        className={cn("object-contain object-left", s.className, imageClassName)}
        priority
      />
      {subtitle ? (
        <p
          className={cn(
            "truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground",
            subtitleClassName,
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
