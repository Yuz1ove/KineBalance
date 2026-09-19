# KBPD-HAND-TRACKING-02 release

The release imports the isolated hand-tracking-02 frontend and independent core into the existing KineBalance repository. Relative imports are adjusted for the repository layout. Local data and earlier candidate evidence remain outside this release.

Deployment-only changes:
- Serve the pinned MediaPipe Hands package assets from the same origin.
- Generate explicitly synthetic preview fixture files from the existing synthetic generator. The test-sample.mp4 test fixture is a 1-second color-bar pattern, not a hand recording.
- Display a hosted-preview limitation banner, disable save, and reject all identity/storage API requests before transmission. No cloud DB or medical inference integration is introduced.
- Preserve a local full-build/start path for the SQLite API.

Validation of this release checkout: 168 frontend tests across 15 files, 40 focused core/persistence tests, and Vercel-target production build pass. These counts describe this publication package; they do not replace the earlier candidate's 197 frontend tests, which also included legacy development-server tests not deployed here. The build retains its existing large-chunk warning.

The physical camera remained blocked at permission wait in the original local verification. Real hand video and independent ground truth remain unvalidated. Synthetic decay improved 7/8 to 8/8 with the same frozen fixture. Earlier synthetic local UI storage roundtrip does not establish cloud persistence. FINAL_VERDICT remains PARTIAL.

Vercel deployment status will be reported separately from these local test results.
