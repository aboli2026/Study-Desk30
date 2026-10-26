import { useState, useEffect, useRef } from 'react';

export interface DisplayPerfStats {
  refreshRate: number;
  fps: number;
  isSynced: boolean;
}

/**
 * Hook that accurately monitors real-time display refresh rate and frame-per-second (FPS)
 * using high-precision requestAnimationFrame timestamps.
 */
export function useDisplayRefreshRate(): DisplayPerfStats {
  const [stats, setStats] = useState<DisplayPerfStats>({
    refreshRate: 60,
    fps: 60,
    isSynced: true,
  });

  const frameTimesRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const detectedRateRef = useRef<number>(60);

  useEffect(() => {
    let active = true;

    const tick = (now: number) => {
      if (!active) return;

      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Ignore abnormal drops (like tab hidden/unfocused)
      if (delta > 0 && delta < 250) {
        frameTimesRef.current.push(delta);
        if (frameTimesRef.current.length > 40) {
          frameTimesRef.current.shift();
        }

        // Calculate average delta over sample window
        if (frameTimesRef.current.length >= 10) {
          const sum = frameTimesRef.current.reduce((a, b) => a + b, 0);
          const avgDelta = sum / frameTimesRef.current.length;
          const instantaneousFps = Math.min(240, Math.round(1000 / avgDelta));

          // Determine closest standard monitor refresh rate
          let targetRate = 60;
          if (instantaneousFps >= 135) targetRate = 144;
          else if (instantaneousFps >= 110) targetRate = 120;
          else if (instantaneousFps >= 85) targetRate = 90;
          else if (instantaneousFps >= 50) targetRate = 60;
          else targetRate = Math.max(30, instantaneousFps);

          detectedRateRef.current = targetRate;

          // Check frame stability (isSynced)
          const variance =
            frameTimesRef.current.reduce((acc, dt) => acc + Math.pow(dt - avgDelta, 2), 0) /
            frameTimesRef.current.length;
          const stdDev = Math.sqrt(variance);
          const isSynced = stdDev < 4.5; // low jitter means smooth display sync

          setStats({
            refreshRate: targetRate,
            fps: instantaneousFps,
            isSynced,
          });
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return stats;
}
