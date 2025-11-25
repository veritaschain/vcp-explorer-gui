import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format date with milliseconds
 */
export function formatDatePrecise(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace('T', ' ').replace('Z', ' UTC');
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get event type color
 */
export function getEventTypeColor(type: string): string {
  const colors: Record<string, string> = {
    SIG: 'text-blue-400',
    ORD: 'text-yellow-400',
    ACK: 'text-cyan-400',
    EXE: 'text-green-400',
    PRT: 'text-lime-400',
    REJ: 'text-red-400',
    CXL: 'text-orange-400',
    MOD: 'text-purple-400',
    CLS: 'text-pink-400',
    ALG: 'text-indigo-400',
    RSK: 'text-amber-400',
    AUD: 'text-teal-400',
    HBT: 'text-gray-400',
    ERR: 'text-rose-400',
    REC: 'text-emerald-400',
    SNC: 'text-violet-400',
  };
  return colors[type] || 'text-gray-400';
}

/**
 * Get event type background color
 */
export function getEventTypeBgColor(type: string): string {
  const colors: Record<string, string> = {
    SIG: 'bg-blue-500/20',
    ORD: 'bg-yellow-500/20',
    ACK: 'bg-cyan-500/20',
    EXE: 'bg-green-500/20',
    PRT: 'bg-lime-500/20',
    REJ: 'bg-red-500/20',
    CXL: 'bg-orange-500/20',
    MOD: 'bg-purple-500/20',
    CLS: 'bg-pink-500/20',
    ALG: 'bg-indigo-500/20',
    RSK: 'bg-amber-500/20',
    AUD: 'bg-teal-500/20',
    HBT: 'bg-gray-500/20',
    ERR: 'bg-rose-500/20',
    REC: 'bg-emerald-500/20',
    SNC: 'bg-violet-500/20',
  };
  return colors[type] || 'bg-gray-500/20';
}

/**
 * Get anchor status color
 */
export function getAnchorStatusColor(status: string): string {
  switch (status) {
    case 'ANCHORED':
      return 'text-verify-400';
    case 'PENDING':
      return 'text-anomaly-400';
    case 'FAILED':
      return 'text-reject-400';
    default:
      return 'text-gray-400';
  }
}
