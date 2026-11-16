import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../primitives";

const badgeVariants = cva(
  "inline-flex min-h-[22px] items-center gap-1.5 rounded-md px-2 font-sans text-label font-medium",
  {
    variants: {
      variant: {
        default: "bg-ink/[0.06] text-ink-2",
        accent: "bg-ink/[0.06] text-ink",
        success: "bg-ink/[0.06] text-healthy",
        danger: "bg-ink/[0.06] text-firing",
        warning: "bg-ink/[0.06] text-ink-2",
        muted: "bg-ink/[0.06] text-ink-3",
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
