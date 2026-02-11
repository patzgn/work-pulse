import { Mode } from './mode.js';
import { Transition } from './transition.js';
import { ensureNotificationPermission, notify, clearAttentionSignals } from "./notifications.js";


const formatTimeFromMs = ms => {
    const s = Math.ceil(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

function renderBlocks({ blocksTotal, completedWorkBlocks, mode, awaitingTransition }) {
    const currentBlock = Math.min(completedWorkBlocks + 1, blocksTotal);

    let html = `<div class="blocks" aria-label="Work blocks">`;
    for (let i = 1; i <= blocksTotal; i++) {
        let blockClass = "block";

        if (i <= completedWorkBlocks) blockClass += " done";
        else if (i === currentBlock && completedWorkBlocks < blocksTotal) blockClass += " current";
        else blockClass += " next";

        if (i === currentBlock
            && awaitingTransition
            && awaitingTransition !== Transition.DAY_COMPLETE) blockClass += " pending";

        const label =
            i <= completedWorkBlocks ? "done" :
                i === currentBlock ? (awaitingTransition ? "waiting" : "current") :
                    "upcoming";

        html += `<div class="${blockClass}" title="Block ${i}: ${label}"></div>`;
    }

    html += `</div>`;
    return html;
}

export function createUI(root, state, timer) {
    root.innerHTML = `
    <div class="layout">
        <h1>WorkPulse</h1>
        <label class="toggle">
            <input type="checkbox" id="enableNotifs" />
            Enable notifications
        </label>
        <div id="blocksWrap"></div>

        <div id="time">00:00</div>
        <div id="status"></div>

        <div class="buttons">
            <button id="work">Start work</button>
            <button id="pause" class="secondary">Pause</button>
            <button id="resume" class="secondary">Resume</button>
            <button id="skipBreak" class="secondary">Skip break</button>
        </div>

        <div id="confirm"></div>
    </div>
  `;

    const time = root.querySelector("#time");
    const status = root.querySelector("#status");
    const confirm = root.querySelector("#confirm");
    const blocksWrap = root.querySelector("#blocksWrap");

    const workBtn = root.querySelector("#work");
    const pauseBtn = root.querySelector("#pause");
    const resumeBtn = root.querySelector("#resume");
    const skipBreakBtn = root.querySelector("#skipBreak");

    workBtn.onclick = timer.startWork;
    pauseBtn.onclick = timer.pause;
    resumeBtn.onclick = timer.resume;
    skipBreakBtn.onclick = timer.skipBreak;

    const enableNotifs = root.querySelector("#enableNotifs");

    enableNotifs.checked = localStorage.getItem("workpulse_notifs") === "1";

    enableNotifs.onchange = async () => {
        if (enableNotifs.checked) {
            const res = await ensureNotificationPermission();
            if (res.permission !== "granted") {
                enableNotifs.checked = false;
                localStorage.setItem("workpulse_notifs", "0");
                return;
            }
            localStorage.setItem("workpulse_notifs", "1");
        } else {
            localStorage.setItem("workpulse_notifs", "0");
        }
    };

    let lastAttentionKey = null;

    state.subscribe(s => {
        time.style.display = s.mode ? "inline-block" : "none";
        time.textContent = formatTimeFromMs(s.remainingMs);

        // status.style.display = s.awaitingTransition === Transition.DAY_COMPLETE ? "none" : "inline-block";
        status.textContent =
            !s.mode ? "Welcome. Are you ready to begin your work day?" :
                s.mode === Mode.WORK ? "Working" :
                    s.mode === Mode.BREAK ? "Break" :
                        s.mode === Mode.PAUSED ? "Paused" :
                            s.awaitingTransition === Transition.DAY_COMPLETE ? "" :
                                s.awaitingTransition ? "Waiting for confirmation" :
                                    "Idle";

        blocksWrap.style.display = s.mode ? "inline-block" : "none";
        blocksWrap.innerHTML = renderBlocks({
            blocksTotal: s.config.blocksTotal,
            completedWorkBlocks: s.completedWorkBlocks,
            mode: s.mode,
            awaitingTransition: s.awaitingTransition,
        });

        workBtn.style.display = !s.mode ? "inline-block" : "none";
        pauseBtn.style.display = (s.mode === Mode.WORK || s.mode === Mode.BREAK) ? "inline-block" : "none";
        resumeBtn.style.display = (s.mode === Mode.PAUSED) ? "inline-block" : "none";
        skipBreakBtn.style.display = (s.mode === Mode.BREAK) ? "inline-block" : "none";

        confirm.innerHTML = "";

        if (s.awaitingTransition === Transition.TO_BREAK) {
            confirm.innerHTML = `
                <div class="card">
                    <div class="cardTitle">Work interval completed.</div>
                    <div class="cardActions">
                        <button id="goBreak">Start short break</button>
                        <button id="goLong" class="secondary">Long break</button>
                    </div>
                </div>`;

            confirm.querySelector("#goBreak").onclick = () => timer.startShortBreak();
            confirm.querySelector("#goLong").onclick = () => timer.startLongBreak();
        }

        if (s.awaitingTransition === Transition.TO_WORK) {
            confirm.innerHTML = `
                <div class="card">
                    <div class="cardTitle">Break completed.</div>
                    <div class="cardActions">
                        <button id="goWork">Start next work block</button>
                    </div>
                </div>`;
            confirm.querySelector("#goWork").onclick = timer.startWork;
        }

        if (s.awaitingTransition === Transition.DAY_COMPLETE) {
            confirm.innerHTML = `
                <div class="card">
                    <div class="cardTitle">Day complete 🎉</div>
                    <div class="cardText">All work blocks finished. Nice.</div>
                    <div class="cardActions">
                        <button id="resetDay">Reset day</button>
                    </div>
                </div>
            `;

            confirm.querySelector("#resetDay").onclick = () => timer.resetDay();
        }


        const notifsEnabled = localStorage.getItem("workpulse_notifs") === "1";

        if (s.mode === Mode.WORK || s.mode === Mode.BREAK) {
            clearAttentionSignals();
            lastAttentionKey = null;
        }

        if (notifsEnabled && s.mode === Mode.IDLE && s.awaitingTransition) {
            const key = `${s.awaitingTransition}:${s.completedWorkBlocks}:${s.intervalEndsAt ?? "noend"}`;

            if (key !== lastAttentionKey) {
                lastAttentionKey = key;

                if (s.awaitingTransition === Transition.TO_BREAK) {
                    notify({
                        title: "Work interval done",
                        body: "Time for a short break (confirm in app).",
                    });
                } else if (s.awaitingTransition === Transition.TO_WORK) {
                    notify({
                        title: "Break done",
                        body: "Ready for the next work block (confirm in app).",
                    });
                } else if (s.awaitingTransition === Transition.DAY_COMPLETE) {
                    notify({
                        title: "Day complete 🎉",
                        body: "All work blocks finished.",
                    });
                }
            }
        }
    });
}
