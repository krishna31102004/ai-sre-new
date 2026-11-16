import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../primitives";

const badgeVariants = cva(
  "inline-flex min-h-[22px] items-center gap-1.5 rounded-md px-2 font-sans text-label font-medium",
  {
    variants: {
      variant: {
        default: "bg-white/[0.06] text-ink-2",
        accent: "bg-accent/[0.12] text-accent",
        success: "bg-healthy/[0.12] text-healthy",
        danger: "bg-firing/[0.12] text-firing",
        warning: "bg-warning/[0.12] text-warning",
        muted: "bg-white/[0.06] text-ink-3",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
