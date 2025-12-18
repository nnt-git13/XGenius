/**
 * Perceived progress hook for realistic loading experience
 * 
 * Model:
 * - Quick jump to ~15%
 * - Asymptotic ease toward 70-85% until ready
 * - Fast completion to 100% when ready
 */

import { useEffect, useState, useRef, useCallback } from "react";

export interface UsePerceivedProgressOpts {
  isReady: boolean;
  minDurationMs?: number;
  onComplete?: () => void;
}

export interface UsePerceivedProgressReturn {
  progress: number;
  isComplete: boolean;
}

const INITIAL_JUMP = 0.15;
const TARGET_PROGRESS = 0.75; // Target before ready
const COMPLETE_DURATION = 350; // ms to complete when ready
const JUMP_DURATION = 200; // ms for initial jump

export function usePerceivedProgress({
  isReady,
  minDurationMs = 2000,
  onComplete,
}: UsePerceivedProgressOpts): UsePerceivedProgressReturn {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const readyTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number>();
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Track when ready state changes
  useEffect(() => {
    if (isReady && readyTimeRef.current === null) {
      readyTimeRef.current = Date.now();
    }
  }, [isReady]);

  useEffect(() => {
    const startTime = startTimeRef.current;
    let lastProgress = 0;
    let rafId: number;

    const updateProgress = () => {
      const now = Date.now();
      const elapsed = now - startTime;

      if (!isReady) {
        // Phase 1: Quick jump to INITIAL_JUMP
        if (elapsed < JUMP_DURATION) {
          const quickProgress = (elapsed / JUMP_DURATION) * INITIAL_JUMP;
          lastProgress = quickProgress;
          setProgress(quickProgress);
        } else {
          // Phase 2: Asymptotic approach to TARGET_PROGRESS
          const timeSinceJump = elapsed - JUMP_DURATION;
          // Exponential approach: progress approaches target asymptotically
          const approachRate = 0.0015; // Controls how fast we approach target
          const distanceToTarget = TARGET_PROGRESS - INITIAL_JUMP;
          const newProgress = INITIAL_JUMP + distanceToTarget * (1 - Math.exp(-timeSinceJump * approachRate));
          
          // Clamp to prevent going over target
          lastProgress = Math.min(0.95, Math.max(INITIAL_JUMP, newProgress));
          setProgress(lastProgress);
        }
      } else {
        // Phase 3: Complete to 100%
        const readyTime = readyTimeRef.current || now;
        const readyElapsed = now - readyTime;
        
        if (readyElapsed < COMPLETE_DURATION) {
          // Smooth completion
          const completionRatio = readyElapsed / COMPLETE_DURATION;
          // Use ease-out curve for completion
          const easedRatio = 1 - Math.pow(1 - completionRatio, 3);
          const completeProgress = lastProgress + (1 - lastProgress) * easedRatio;
          
          lastProgress = Math.min(1, completeProgress);
          setProgress(lastProgress);
        } else {
          // Ensure we hit 100%
          if (lastProgress < 1) {
            lastProgress = 1;
            setProgress(1);
          }
          
          // Trigger completion once
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            setIsComplete(true);
            onCompleteRef.current?.();
          }
        }
      }

      rafId = requestAnimationFrame(updateProgress);
    };

    rafId = requestAnimationFrame(updateProgress);
    rafIdRef.current = rafId;

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isReady, minDurationMs]);

  return { progress, isComplete };
}

