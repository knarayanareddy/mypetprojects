# interactive-f1-car-simulation

**TEARDOWN · F1 Car Exploded, Rebuilt & Wind-Tunnel Tested.**

Sixteen parts of an F1 car hang in front of you in an exploded view, then rebuild. A wind
tunnel pushes the car through the air and shows what happens: velocity and pressure readouts,
force curves against air speed, and coloured airflow with smoke that visualises where the air
actually goes.

The aerodynamics are computed, not faked — `src/lib/aero.ts` and `src/lib/timeline.ts` drive
the telemetry from the same numbers the visuals read.

## Stack

React 19 · Three.js · TypeScript · Vite

## Run

```bash
npm install
npm run dev
```
