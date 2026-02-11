# WorkPulse

WorkPulse is a small plain-JavaScript web app that helps structure an 8-hour workday into focused work blocks and breaks. It runs entirely in the browser using ES modules — no build tools or frameworks required.

## Requirements

* A modern browser
* Python 3 (or any simple local web server)

## Running locally

Because the app uses JavaScript modules, it must be served over HTTP — opening `index.html` directly from disk will not work.

From the project folder:

```bash
python -m http.server 5173
```

Then open your browser and go to:

```
http://localhost:5173
```

## Project structure

```
index.html      — app entry point
styles.css      — basic styling
src/
  app.js        — bootstrap
  state.js      — app state store
  timer.js      — timing logic
  ui.js         — rendering + interactions
  config.js     — timing configuration
```

## Notes

* All logic runs client-side.
* State is persisted in localStorage.
* Notifications require browser permission and work best on localhost/HTTPS.

---

WorkPulse is intentionally simple: a small state-driven timer designed to be easy to understand, modify, and extend.
