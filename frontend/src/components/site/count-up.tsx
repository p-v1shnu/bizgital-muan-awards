'use client';

import { useEffect, useRef } from 'react';
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react';

/**
 * Counts up from 0 to `value` the first time it scrolls into view. Anyone
 * with prefers-reduced-motion set (PRD §6.0.3) sees the final number
 * immediately instead — Motion's useReducedMotion() reads the same media
 * query globals.css does for every CSS transition on the site.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toString());

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration: 1.4, ease: 'easeOut' });
    return () => controls.stop();
  }, [inView, value, reduceMotion, count]);

  return (
    <motion.span ref={ref} className={className}>
      {rounded}
    </motion.span>
  );
}
