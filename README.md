# KineBalance — KBPD-HAND-TRACKING-02

This branch publishes the isolated hand-tracking-02 candidate. Engineering regression is separate from physical-camera and ground-truth validation. No diagnostic or medication claims.

## Local full application

Node 22.22+ or 24 required.

```sh
npm ci --ignore-scripts
npm --prefix kbpd-core ci --ignore-scripts
npm run build
npm run start:local
```

The independent local API serves the build at http://127.0.0.1:4498. Set PORT to choose another free port. SQLite is created locally under kbpd-core/.data; no existing database is copied or migrated.

## Vercel Preview

`vercel.json` builds a static, explicitly labeled preview. Camera/video inference and shared kinematics execute in the browser using the pinned MediaPipe Hands assets. Identity and persistence requests fail closed and save is disabled. Synthetic fixtures remain explicitly synthetic. This does not host SQLite or upload images; the local save/readback result is not a claim of cloud persistence.

Vercel does not guarantee a shared persistent local filesystem for SQLite: https://vercel.com/kb/guide/is-sqlite-supported-in-vercel

## Validation

```sh
npm test
npm run test:core
npm run build:vercel
```

The inherited decrement fixture remains unchanged (7/8 before, 8/8 after). Thresholds are causal, with an uncalibrated engineering noise floor. No smoothing. Actual physical-camera acquisition was blocked at permission wait; real hand video and independent ground truth were not validated. FINAL_VERDICT remains PARTIAL.

No identities, database backups, real images, captured measurements, credentials, or historical local logs are part of this Git release. The evidence/baseline fixture and public fixture generator contain synthetic test data only. Historical exhibition source still present in Git history is not the current entry point.
