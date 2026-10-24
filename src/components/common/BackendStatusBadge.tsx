import React from 'react';
import { useBackendKeepAlive } from '@/hooks/useBackendKeepAlive';
import { Activity, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackendStatusBadgeProps {
  showLatency?: boolean;
  className?: string;
}

export const BackendStatusBadge: React.FC<BackendStatusBadgeProps> = ({
  showLatency = false,
  className = '',
}) => {
  const { status, latencyMs, pingNow } = useBackendKeepAlive();

  if (status === 'connected') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 ${className}`}
        title={`Backend Alive & Connected${latencyMs ? ` (${latencyMs}ms)` : ''}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="hidden sm:inline">Backend Live</span>
        {showLatency && latencyMs !== null && (
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
            {latencyMs}ms
          </span>
        )}
      </div>
    );
  }

  if (status === 'reconnecting') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 animate-pulse ${className}`}
        title="Reconnecting to backend..."
      >
        <RefreshCw className="h-3 w-3 animate-spin text-amber-500" />
        <span className="hidden sm:inline">Reconnecting...</span>
      </div>
    );
  }

  // Disconnected status
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => pingNow()}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 h-auto text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 ${className}`}
      title="Backend disconnected. Click to reconnect."
    >
      <WifiOff className="h-3 w-3 text-red-500" />
      <span>Offline</span>
      <RefreshCw className="h-2.5 w-2.5 ml-0.5" />
    </Button>
  );
};

export default BackendStatusBadge;
