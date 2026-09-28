# Safari camera frame timestamp repair — 2026-09-28

## Scope and observed cause

User's physical iPad Safari screenshot reports VIDEO_NO_NEW_FRAMES with CAMERA input. Its exact iPadOS version and device telemetry are unavailable; physical-device acceptance remains NOT_RUN.

An isolated real Playwright WebKit engine (Safari 26.5 UA, built-in mock camera; no personal browser profile) reproduced rVFC metadata `mediaTime=0` on every callback while `presentedFrames` and the same element's `currentTime` advanced. The raw probe is retained at `output/safari-frame-repair-20260928/webkit-probe.json` in the parent project. This exposes a concrete failure mechanism consistent with the screenshot, rather than proving every device-specific cause.

Previously `HandDetectorService` used only `mediaTime` to deduplicate camera frames. One zero-time frame was accepted, all subsequent new frames were rejected, and the unchanged 10-second watchdog stopped the camera. Three new regressions failed before repair (21 prior capture tests passed).

## Repair

For rVFC camera capture, require a positive, increasing `presentedFrames` identity. If metadata time is missing or frozen but the same video element's actual `currentTime` advances, select `currentTime` for the remainder of that camera run. Both duplicate frame identity and non-increasing time remain rejected. Sequence numbers, wall time, interpolation, old landmarks, and synthetic timestamps are never used to create observations. The fallback is local to each start and is discarded on restart.

MediaPipe version, model/options, image normalization, measurement core V1.2.1, cycle criteria, generation guards, 20-second monotonic deadline, loss handling, and original database are unchanged. Recorded-video decode retains its existing seek timeline. The error text now refers to paused images rather than falsely assuming video-file input.

The relevant browser API distinguishes media presentation time from the count of presented frames: [MDN requestVideoFrameCallback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback).

## Validation

- Capture regressions: 24/24 pass, including 3 new cases: zero mediaTime with 2 completed cycles, a stationary 12-second stream with zero cycles followed by genuine frozen-clock failure, and duplicate identity / metadata-stall transition.
- Frontend: 183/183 pass. Measurement core: 41/41 pass, including small, fast-small, decrement, static noise, gaps and duplicate observations. No expected values changed.
- Build and bundled MediaPipe asset checks passed.
- WebKit full UI verification: PASS in an isolated run after the build/tests completed. Two camera starts delivered 289 and 307 successive callbacks respectively, all with mediaTime=0, while currentTime advanced for over 24 seconds per run; preview and inference remained live beyond the old watchdog boundary. No-hand start stayed disabled, preview showed no formal count, close/restart worked, and no API POST or page error occurred. First two runs timed out waiting for preview while the UI still showed model initialization. Failed logs and second-run page/metadata are retained separately; they are not counted as passing runs.
- Physical iPad, real camera and per-movement human verification: NOT_RUN. Automated WebKit uses its built-in mock camera without hands; this can validate capture continuity and fail-closed readiness, not landmark accuracy.

## Preservation and deployment

Existing dirty `docs/maintenance/2026-09-27-production-repair.md` is preserved unchanged and excluded from this commit. No DB writes, model changes, backend restart, or other project routing changes are required. Deploy only to the original Vercel project under the user's continuing production authorization, preserving the existing HTTPS API base.
