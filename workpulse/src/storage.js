const KEY = "workpulse_state_v1";

export function loadState() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveState(state) {
    try {
        const data = {
            mode: state.mode,
            completedWorkBlocks: state.completedWorkBlocks,
            remainingMs: state.remainingMs,
            awaitingTransition: state.awaitingTransition,
            intervalEndsAt: state.intervalEndsAt,
            pausedFromMode: state.pausedFromMode,
            config: state.config,
        };
        localStorage.setItem(KEY, JSON.stringify(data));
    } catch {

    }
}
