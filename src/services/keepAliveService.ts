import { supabase } from '@/db/supabase';

export type BackendConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface KeepAliveState {
  status: BackendConnectionStatus;
  isAlive: boolean;
  lastPing: Date | null;
  latencyMs: number | null;
  consecutiveFailures: number;
}

type StateListener = (state: KeepAliveState) => void;

class BackendKeepAliveService {
  private static instance: BackendKeepAliveService;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<StateListener>();
  private pingInProgress = false;

  // Heartbeat every 3 minutes (180s) to keep TCP/TLS connection pool alive
  private readonly INTERVAL_MS = 3 * 60 * 1000;
  // Threshold to trigger immediate warm-up on focus/visible (e.g., if idle > 60s)
  private readonly WAKEUP_THRESHOLD_MS = 60 * 1000;

  private state: KeepAliveState = {
    status: 'connected',
    isAlive: true,
    lastPing: null,
    latencyMs: null,
    consecutiveFailures: 0,
  };

  private constructor() {
    this.setupLifecycleListeners();
  }

  public static getInstance(): BackendKeepAliveService {
    if (!BackendKeepAliveService.instance) {
      BackendKeepAliveService.instance = new BackendKeepAliveService();
    }
    return BackendKeepAliveService.instance;
  }

  public getState(): KeepAliveState {
    return { ...this.state };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('KeepAlive listener error:', err);
      }
    });
  }

  public start(): void {
    if (this.intervalId) return;

    // Run initial heartbeat warm-up
    this.ping();

    // Set periodic 3-minute heartbeat interval
    this.intervalId = setInterval(() => {
      // Only ping if tab is active, or if idle for longer than 3 minutes to keep connection alive
      this.ping();
    }, this.INTERVAL_MS);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public async ping(): Promise<boolean> {
    if (this.pingInProgress) return this.state.isAlive;
    this.pingInProgress = true;

    const startTime = performance.now();

    try {
      // 1. Check network connectivity
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.updateState({
          status: 'disconnected',
          isAlive: false,
          consecutiveFailures: this.state.consecutiveFailures + 1,
        });
        this.pingInProgress = false;
        return false;
      }

      // 2. Ultra-lightweight HEAD ping to Supabase Database
      const { error } = await supabase
        .from('profiles')
        .select('id', { head: true, count: 'exact' })
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const latencyMs = Math.round(performance.now() - startTime);

      this.updateState({
        status: 'connected',
        isAlive: true,
        lastPing: new Date(),
        latencyMs,
        consecutiveFailures: 0,
      });

      return true;
    } catch (err) {
      const failures = this.state.consecutiveFailures + 1;
      const status: BackendConnectionStatus = failures >= 2 ? 'disconnected' : 'reconnecting';

      this.updateState({
        status,
        isAlive: false,
        consecutiveFailures: failures,
      });

      // If disconnected, schedule a quick retry in 5 seconds
      if (failures <= 3) {
        setTimeout(() => this.ping(), 5000);
      }

      return false;
    } finally {
      this.pingInProgress = false;
    }
  }

  private updateState(partial: Partial<KeepAliveState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  private setupLifecycleListeners(): void {
    if (typeof window === 'undefined') return;

    // Tab visibility changes (waking up or switching back)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastPing = this.state.lastPing
          ? Date.now() - this.state.lastPing.getTime()
          : Infinity;

        if (timeSinceLastPing > this.WAKEUP_THRESHOLD_MS) {
          this.ping();
        }
      }
    });

    // Window focus
    window.addEventListener('focus', () => {
      const timeSinceLastPing = this.state.lastPing
        ? Date.now() - this.state.lastPing.getTime()
        : Infinity;

      if (timeSinceLastPing > this.WAKEUP_THRESHOLD_MS) {
        this.ping();
      }
    });

    // Online & Offline browser events
    window.addEventListener('online', () => {
      this.updateState({ status: 'reconnecting' });
      this.ping();
    });

    window.addEventListener('offline', () => {
      this.updateState({
        status: 'disconnected',
        isAlive: false,
      });
    });
  }
}

export const keepAliveService = BackendKeepAliveService.getInstance();
