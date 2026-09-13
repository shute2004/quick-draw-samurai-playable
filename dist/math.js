export const TAU = Math.PI * 2;
export const randomBetween = (a, b) => a + Math.random() * (b - a);
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, k) => a + (b - a) * k;
