import { describe, expect, it } from 'vitest';
import { LengthSpring, readSpring } from './shape-spring.js';

const waitFor = async (check: () => boolean, ms = 2000) => {
  const start = performance.now();
  while (!check()) {
    if (performance.now() - start > ms) throw new Error('timed out');
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
};

describe('LengthSpring', () => {
  it('jumps on the first value and when no spring is given', () => {
    const el = document.createElement('div');
    const spring = new LengthSpring(el, 'borderRadius');
    spring.to(20, { dampingRatio: 1, stiffness: 1600 });
    expect(el.style.borderRadius).toBe('20px');
    spring.to(8, null);
    expect(el.style.borderRadius).toBe('8px');
  });

  it('springs to the target and keeps moving when retargeted mid-flight', async () => {
    const el = document.createElement('div');
    const spring = new LengthSpring(el, 'borderRadius');
    spring.to(20, null);
    spring.to(8, { dampingRatio: 1, stiffness: 1600 });
    await waitFor(() => spring.value !== null && spring.value < 18);
    const midway = spring.value!;
    expect(midway).toBeGreaterThan(8);
    // Interrupt: the new spring starts where the old one is, not from a rest value.
    spring.to(20, { dampingRatio: 1, stiffness: 1600 });
    expect(spring.value).toBe(midway);
    await waitFor(() => el.style.borderRadius === '20px');
  });
});

describe('readSpring', () => {
  it('reads the resolved scheme tokens and treats a 0ms duration as a jump', () => {
    const el = document.createElement('div');
    el.style.setProperty('--m3e-sys-motion-spring-fast-spatial-damping-ratio', '0.6');
    el.style.setProperty('--m3e-sys-motion-spring-fast-spatial-stiffness', '800');
    el.style.setProperty('--m3e-sys-motion-spring-fast-spatial-duration', '350ms');
    document.body.append(el);
    expect(readSpring(el, 'fast-spatial')).toEqual({ dampingRatio: 0.6, stiffness: 800 });
    el.style.setProperty('--m3e-sys-motion-spring-fast-spatial-duration', '0ms');
    expect(readSpring(el, 'fast-spatial')).toBeNull();
    el.remove();
  });
});
