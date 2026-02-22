import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with clsx */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a duration value with its unit.
 * e.g. formatDuration(120, 'min') => "120 min"
 */
export function formatDuration(
  value: number,
  unit: 'sec' | 'min' | 'hour' = 'min',
): string {
  if (value === Infinity) return '\u221e';
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} ${unit}`;
}

/**
 * Format a number for display with locale-aware separators.
 * Large numbers get abbreviated (e.g. 1.2k, 3.4M).
 */
export function formatNumber(value: number, decimals = 2): string {
  if (value === Infinity) return '\u221e';
  if (value === -Infinity) return '-\u221e';
  if (Number.isNaN(value)) return '--';

  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return value.toFixed(decimals);
}

/**
 * Format a percentage (0-1 scale) for display.
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Generate a unique ID for nodes/edges.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
