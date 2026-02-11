import { Mode } from "./mode.js";
import { Transition } from "./transition.js";

const minToMs = m => m * 60 * 1000;

export function createTimer(state) {
    let tick = null;

    function stopTick() {
        if (tick) clearInterval(tick);
        tick = null;
    }

    function remainingFromEndsAt() {
        const s = state.get();
        if (!s.intervalEndsAt) return 0;
        return Math.max(0, s.intervalEndsAt - Date.now());
    }

    function startTicking() {
        stopTick();
        tick = setInterval(() => {
            const s = state.get();
            if (s.mode === Mode.IDLE || !s.intervalEndsAt) return;

            const remaining = remainingFromEndsAt();
            state.set({ remainingMs: remaining });

            if (remaining === 0) {
                stopTick();

                const isLastWorkBlock = (s.completedWorkBlocks + 1) >= s.config.blocksTotal;
                if (s.mode === Mode.WORK && isLastWorkBlock) {
                    state.set({
                        mode: Mode.IDLE,
                        intervalEndsAt: null,
                        awaitingTransition: Transition.DAY_COMPLETE,
                        completedWorkBlocks: s.config.blocksTotal,
                    });
                } else {
                    state.set({
                        mode: Mode.IDLE,
                        intervalEndsAt: null,
                        awaitingTransition: s.mode === Mode.WORK ? Transition.TO_BREAK : Transition.TO_WORK,
                    });
                }
            }
        }, 250);
    }

    function startCountdown(ms) {
        const intervalEndsAt = Date.now() + ms;
        state.set({ remainingMs: ms, intervalEndsAt });
        startTicking();
    }

    function startWork() {
        const s = state.get();
        if (s.completedWorkBlocks >= s.config.blocksTotal) return;

        state.set({ mode: Mode.WORK, awaitingTransition: null });
        startCountdown(minToMs(s.config.workMinutes));
    }

    function startShortBreak() {
        const s = state.get();
        state.set({
            mode: Mode.BREAK,
            awaitingTransition: null,
            completedWorkBlocks: Math.min(s.completedWorkBlocks + 1, s.config.blocksTotal),
        });
        startCountdown(minToMs(s.config.shortBreakMinutes));
    }

    function startLongBreak() {
        const s = state.get();
        state.set({
            mode: Mode.BREAK,
            awaitingTransition: null,
            completedWorkBlocks: Math.min(s.completedWorkBlocks + 1, s.config.blocksTotal),
        });
        startCountdown(minToMs(s.config.longBreakMinutes));
    }

    function pause() {
        const s = state.get();
        if (s.mode !== Mode.WORK && s.mode !== Mode.BREAK) return;

        const remaining = remainingFromEndsAt();
        stopTick();
        state.set({
            mode: Mode.PAUSED,
            pausedFromMode: s.mode,
            intervalEndsAt: null,
            remainingMs: remaining,
            awaitingTransition: null,
        });
    }

    function resume() {
        const s = state.get();

        if (s.mode !== Mode.PAUSED) return;

        if (s.pausedFromMode !== Mode.WORK && s.pausedFromMode !== Mode.BREAK) {
            state.set({ mode: Mode.IDLE, pausedFromMode: null });
            return;
        }

        state.set({
            mode: s.pausedFromMode,
            pausedFromMode: null,
            intervalEndsAt: Date.now() + (s.remainingMs || 0),
        });
        startTicking();
    }

    function resetDay() {
        stopTick();
        state.set({
            mode: null,
            completedWorkBlocks: 0,
            remainingMs: 0,
            awaitingTransition: null,
            intervalEndsAt: null,
            pausedFromMode: null,
        });
    }

    function resumeIfNeeded() {
        const s = state.get();

        if (s.mode === Mode.PAUSED) return;

        if (s.mode === Mode.WORK || s.mode === Mode.BREAK) {
            const remaining = remainingFromEndsAt();
            state.set({ remainingMs: remaining });
            if (remaining === 0) {
                state.set({
                    mode: Mode.IDLE,
                    endsAt: null,
                    awaitingTransition: s.mode === Mode.WORK ? Transition.TO_BREAK : Transition.TO_WORK,
                });
            } else {
                startTicking();
            }
        }
    }

    function skipBreak() {
        const s = state.get();

        if (s.mode !== Mode.BREAK) return;

        stopTick();

        state.set({
            mode: Mode.IDLE,
            intervalEndsAt: null,
            awaitingTransition: Transition.TO_WORK,
            remainingMs: 0,
        });
    }

    return {
        startWork,
        startShortBreak,
        startLongBreak,
        stopTick,
        pause,
        resume,
        resetDay,
        resumeIfNeeded,
        skipBreak,
    };
}
