import { useEffect, useState, useCallback } from 'react';
import { keepAliveService, type KeepAliveState } from '@/services/keepAliveService';

/**
 * Hook to monitor backend connection health and keep HTTP/database connection alive.
 */
export function useBackendKeepAlive() {
  const [state, setState] = useState<KeepAliveState>(keepAliveService.getState());

  useEffect(() => {
    // Start keep-alive service
    keepAliveService.start();

    // Subscribe to state updates
    const unsubscribe = keepAliveService.subscribe(setState);

    return () => {
      unsubscribe();
    };
  }, []);

  const pingNow = useCallback(() => {
    return keepAliveService.ping();
  }, []);

  return {
    ...state,
    pingNow,
  };
}
