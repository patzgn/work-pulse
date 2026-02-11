export function createState(config) {
    let state = {
        mode: null,
        completedWorkBlocks: 0,
        remainingMs: 0,
        awaitingTransition: null,
        intervalEndsAt: null,
        pausedFromMode: null,
        config,
    };

    const subs = new Set();

    function get() {
        return state;
    }

    function set(patch) {
        state = { ...state, ...patch };
        subs.forEach(fn => fn(state));
    }

    function subscribe(fn) {
        subs.add(fn);
        fn(state);
        return () => subs.delete(fn);
    }

    return { get, set, subscribe };
}
