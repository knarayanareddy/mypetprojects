# AIevolution

**Teaching the Sand to Think** — a painted music video covering 60+ years of AI, rendered
entirely in code.

Not a slideshow and not a video file. A custom canvas engine draws every frame as a pure
function of time, so the film is deterministic: scrub, replay, or re-seed and it redraws
identically. A watercolor painter engine and one recurring cast (robot, human, stage) carry
the history from early perceptrons to modern models.

Includes a recording path (MediaRecorder → WebM) with a graceful fallback when the browser
refuses capture.

## Stack

React 19 · Vite 7 · TypeScript · Canvas 2D

## Run

```bash
npm install
npm run dev
```

Scripts: `dev`, `build`, `preview`, `test`, `test:watch`.
