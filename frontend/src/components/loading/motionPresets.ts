/**
 * Production-grade motion presets for load-in animations
 * 
 * Principles:
 * - Human-feeling easing (no default overshoot)
 * - GPU-friendly transforms
 * - Subtle, intentional motion
 * - Respects prefers-reduced-motion
 */

export const easings = {
  // Smooth, natural deceleration (like Apple/Linear)
  easeOut: [0.16, 1, 0.3, 1] as const,
  
  // Gentle acceleration (for entrances)
  easeIn: [0.4, 0, 1, 1] as const,
  
  // Balanced (for most transitions)
  easeInOut: [0.4, 0, 0.2, 1] as const,
  
  // Subtle spring (for micro-interactions)
  springGentle: { type: "spring" as const, stiffness: 300, damping: 30 },
  
  // Medium spring (for larger elements)
  springMedium: { type: "spring" as const, stiffness: 400, damping: 35 },
  
  // Quick snap (for feedback)
  snap: { type: "spring" as const, stiffness: 600, damping: 25 },
} as const;

export const durations = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
  slowest: 1.2,
} as const;

/**
 * Stagger delays for sequential animations
 */
export const staggers = {
  tight: 0.05,
  normal: 0.1,
  loose: 0.15,
  veryLoose: 0.25,
} as const;

/**
 * Common animation variants
 */
export const variants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  
  fadeInScale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  },
  
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
} as const;

/**
 * Transition presets for common use cases
 */
export const transitions = {
  smooth: {
    duration: durations.normal,
    ease: easings.easeOut,
  },
  
  gentle: {
    duration: durations.slow,
    ease: easings.easeInOut,
  },
  
  quick: {
    duration: durations.fast,
    ease: easings.easeOut,
  },
  
  spring: easings.springGentle,
} as const;

