import { interpolate, spring as remotionSpring } from 'remotion';

export function easeOutCubic(
  frame: number,
  start: number,
  end: number,
  fromVal: number,
  toVal: number
): number {
  return interpolate(frame, [start, end], [fromVal, toVal], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
}

export function easeInOutQuart(
  frame: number,
  start: number,
  end: number,
  fromVal: number,
  toVal: number
): number {
  return interpolate(frame, [start, end], [fromVal, toVal], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  });
}

export function spring(
  frame: number,
  fps: number,
  config?: { damping?: number; stiffness?: number; mass?: number }
): number {
  return remotionSpring({
    frame,
    fps,
    config: {
      damping: config?.damping ?? 14,
      stiffness: config?.stiffness ?? 120,
      mass: config?.mass ?? 1,
    },
  });
}
