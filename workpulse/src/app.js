import { CONFIG } from "./config.js"
import { createState } from "./state.js";
import { createTimer } from "./timer.js";
import { createUI } from "./ui.js";
import { loadState, saveState } from "./storage.js";

const root = document.getElementById('app');

const saved = loadState();
const initialConfig = saved?.config ?? CONFIG;

const state = createState(initialConfig);

if (saved) {
    state.set({
        mode: saved.mode,
        completedWorkBlocks: saved.completedWorkBlocks ?? 0,
        remainingMs: saved.remainingMs ?? 0,
        awaitingTransition: saved.awaitingTransition ?? null,
        intervalEndsAt: saved.intervalEndsAt ?? null,
        pausedFromMode: saved.pausedFromMode ?? null,
    });
}

const timer = createTimer(state);
createUI(root, state, timer);

state.subscribe(s => saveState(s));

timer.resumeIfNeeded();
