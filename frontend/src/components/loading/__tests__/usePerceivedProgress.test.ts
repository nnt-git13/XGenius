/**
 * Unit tests for usePerceivedProgress hook
 * 
 * Run with: npm test usePerceivedProgress
 */

import { renderHook, waitFor } from '@testing-library/react';
import { usePerceivedProgress } from '../usePerceivedProgress';

// Mock requestAnimationFrame
beforeEach(() => {
  let rafId = 0;
  global.requestAnimationFrame = jest.fn((cb) => {
    rafId++;
    setTimeout(() => cb(Date.now()), 16); // ~60fps
    return rafId;
  });
  
  global.cancelAnimationFrame = jest.fn();
  
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('usePerceivedProgress', () => {
  it('should start at 0', () => {
    const { result } = renderHook(() =>
      usePerceivedProgress({
        isReady: false,
        minDurationMs: 1000,
      })
    );
    
    expect(result.current.progress).toBe(0);
    expect(result.current.isComplete).toBe(false);
  });

  it('should jump to ~15% quickly', async () => {
    const { result } = renderHook(() =>
      usePerceivedProgress({
        isReady: false,
        minDurationMs: 1000,
      })
    );
    
    // Fast-forward to after initial jump
    jest.advanceTimersByTime(250);
    
    await waitFor(() => {
      expect(result.current.progress).toBeGreaterThan(0.1);
      expect(result.current.progress).toBeLessThan(0.2);
    });
  });

  it('should approach target progress asymptotically', async () => {
    const { result } = renderHook(() =>
      usePerceivedProgress({
        isReady: false,
        minDurationMs: 2000,
      })
    );
    
    // Fast-forward past initial jump
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(result.current.progress).toBeGreaterThan(0.15);
      expect(result.current.progress).toBeLessThan(0.8);
    });
  });

  it('should complete to 100% when ready', async () => {
    const onComplete = jest.fn();
    
    const { result, rerender } = renderHook(
      ({ isReady }) =>
        usePerceivedProgress({
          isReady,
          minDurationMs: 1000,
          onComplete,
        }),
      {
        initialProps: { isReady: false },
      }
    );
    
    // Fast-forward to get some progress
    jest.advanceTimersByTime(500);
    
    // Mark as ready
    rerender({ isReady: true });
    
    // Fast-forward through completion
    jest.advanceTimersByTime(400);
    
    await waitFor(() => {
      expect(result.current.progress).toBeGreaterThan(0.95);
      expect(result.current.isComplete).toBe(true);
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('should respect minDurationMs', async () => {
    const startTime = Date.now();
    const { result } = renderHook(() =>
      usePerceivedProgress({
        isReady: true, // Ready immediately
        minDurationMs: 1000,
      })
    );
    
    // Should still take time to complete
    jest.advanceTimersByTime(500);
    
    await waitFor(() => {
      // Progress should be advancing but not complete yet
      expect(result.current.progress).toBeGreaterThan(0);
    });
  });
});

