export const REALTIME_FAILURE_WARNING_THRESHOLD = 3;
export const REALTIME_STALE_WARNING_MS = 12_000;
export const REALTIME_BASE_RETRY_MS = 4_000;
export const REALTIME_MAX_RETRY_MS = 30_000;

export type RealtimeHealthState = {
  consecutiveFailures: number;
  lastSuccessAt: number;
};

export function createRealtimeHealthState(now: number): RealtimeHealthState {
  return { consecutiveFailures: 0, lastSuccessAt: now };
}

export function recordRealtimeSuccess(state: RealtimeHealthState, now: number): RealtimeHealthState {
  return { consecutiveFailures: 0, lastSuccessAt: now };
}

export function recordRealtimeFailure(state: RealtimeHealthState): RealtimeHealthState {
  return { ...state, consecutiveFailures: state.consecutiveFailures + 1 };
}

export function shouldShowRealtimeWarning(state: RealtimeHealthState, now: number) {
  return (
    state.consecutiveFailures >= REALTIME_FAILURE_WARNING_THRESHOLD &&
    now - state.lastSuccessAt >= REALTIME_STALE_WARNING_MS
  );
}

export function getRealtimeRetryDelay(consecutiveFailures: number) {
  if (consecutiveFailures <= 0) return REALTIME_BASE_RETRY_MS;
  return Math.min(REALTIME_BASE_RETRY_MS * 2 ** Math.min(consecutiveFailures - 1, 3), REALTIME_MAX_RETRY_MS);
}
