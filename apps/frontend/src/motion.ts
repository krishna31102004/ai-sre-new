/** Shared motion constants. Spec section 1. */
export const EASE = [0.23, 1, 0.32, 1] as const;

export const DUR = { press: 0.12, fast: 0.16, base: 0.2, slow: 0.3 } as const;

/** Scroll entrance: opacity 0 to 1, y 12 to 0, once. Spread onto a motion element. */
export const SCROLL_IN = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: DUR.slow, ease: EASE },
} as const;

/** Delay between staggered siblings, in seconds. */
export const STAGGER = 0.06;
