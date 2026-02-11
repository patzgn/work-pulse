const APP_NAME = "WorkPulse";

let blinkTimer = null;
let originalTitle = document.title;

function startTitleBlink(text) {
    stopTitleBlink();
    originalTitle = document.title;

    let on = false;
    blinkTimer = setInterval(() => {
        document.title = on ? `${text} – ${APP_NAME}` : originalTitle;
        on = !on;
    }, 900);
}

function stopTitleBlink() {
    if (blinkTimer) clearInterval(blinkTimer);
    blinkTimer = null;
    document.title = originalTitle;
}

function canNotify() {
    return "Notification" in window;
}

function beep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.value = 0.03;
        o.frequency.value = 880;
        o.start();
        setTimeout(() => { o.stop(); ctx.close(); }, 120);
    } catch { }
}

export async function ensureNotificationPermission() {
    if (!canNotify()) return { supported: false, permission: "unsupported" };

    if (Notification.permission === "granted") {
        return { supported: true, permission: "granted" };
    }
    if (Notification.permission === "denied") {
        return { supported: true, permission: "denied" };
    }

    const perm = await Notification.requestPermission();
    return { supported: true, permission: perm };
}

/**
 * @param {{ title: string, body?: string }} payload
 */
export function notify(payload) {
    const title = payload?.title ?? APP_NAME;
    const body = payload?.body ?? "";

    const userIsAway = document.visibilityState !== "visible";

    if (userIsAway) startTitleBlink(title);

    if (!canNotify() || Notification.permission !== "granted") return;

    try {
        beep();
        const n = new Notification(title, { body });
        n.onclick = () => {
            window.focus();
            stopTitleBlink();
            n.close();
        };

        window.addEventListener("focus", stopTitleBlink, { once: true });
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") stopTitleBlink();
        }, { once: true });
    } catch {
    }
}

export function clearAttentionSignals() {
    stopTitleBlink();
}
