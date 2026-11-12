import { useEffect, useState } from 'react';

// Shows a message for a few seconds, then clears it.
export function useDuckMessage(duration = 2600) {
  const [message, setMessage] = useState(null);
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(null), duration);
    return () => clearTimeout(t);
  }, [message, duration]);
  return [message, setMessage];
}
