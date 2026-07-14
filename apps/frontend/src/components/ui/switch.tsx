import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/utils";

export function Switch({
  className,
  checked,
  ...props
}: ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      className={cn(
        "peer inline-flex h-8 w-[62px] shrink-0 cursor-pointer items-center rounded-full border p-1 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-firing/45 bg-firing/20" : "border-white/10 bg-white/8",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-6 w-6 rounded-full bg-slate-100 shadow-lg transition-transform duration-150 ease-out",
          checked ? "translate-x-[29px]" : "translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
