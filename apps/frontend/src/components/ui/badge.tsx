import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-white/5 text-slate-300 ring-white/10",
        accent: "bg-accent/10 text-blue-200 ring-accent/25",
        success: "bg-healthy/10 text-emerald-300 ring-healthy/25",
        danger: "bg-firing/10 text-red-300 ring-firing/25",
        warning: "bg-warning/10 text-amber-200 ring-warning/25",
        muted: "bg-slate-500/10 text-slate-400 ring-white/10",
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
