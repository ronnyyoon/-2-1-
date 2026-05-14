import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateGrade(midterm: number, final: number, performance: number, weights: { midterm: number, final: number, performance: number }) {
  const score = (midterm * (weights.midterm / 100)) + (final * (weights.final / 100)) + (performance * (weights.performance / 100));
  return Math.round(score * 100) / 100;
}
