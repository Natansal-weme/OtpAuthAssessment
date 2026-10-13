import { useCallback, useEffect, useState } from 'react';

/** Seconds left until a deadline, ticking every second. `restart(n)` sets a new deadline. */
export function useCountdown(initialSeconds: number) {
  const [deadline, setDeadline] = useState(() => Date.now() + initialSeconds * 1000);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const restart = useCallback((seconds: number) => setDeadline(Date.now() + seconds * 1000), []);

  return { secondsLeft, restart };
}
