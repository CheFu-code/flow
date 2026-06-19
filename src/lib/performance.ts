/**
 * Performance monitoring and optimization utilities
 */

export interface PerformanceMetrics {
  renderTime: number;
  searchTime: number;
  apiTime: number;
}

const metrics: PerformanceMetrics = {
  renderTime: 0,
  searchTime: 0,
  apiTime: 0,
};

export function measurePerformance(name: string, fn: () => void): number {
  const start = performance.now();
  fn();
  const end = performance.now();
  const duration = end - start;

  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }

  return duration;
}

export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;

  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }

  return result;
}

export function reportMetrics(): PerformanceMetrics {
  return metrics;
}
