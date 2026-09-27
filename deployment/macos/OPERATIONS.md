# KineBalance Mac API

Both services are installed in the current user's `~/Library/LaunchAgents`. They start after user login, not before login at boot. Caffeine is separate and does not restart services. No system power/security settings are changed.

- Backend: `space.yuz1ove.kinebalance.backend`, `127.0.0.1:4511`.
- Tunnel: `space.yuz1ove.kinebalance.tunnel`, existing ngrok client/account with explicit fixed URL `https://sternum-relative-handclasp.ngrok-free.dev`.
- Runtime config: `~/Library/Application Support/KineBalance/{backend,tunnel}.json`.
- Node: `/Users/Yuz1ove/.hermes/node/bin/node` (22.22.3).
- Data: `/Users/Yuz1ove/Documents/ChatGPT/ARCI 醫/kbpd-core/.data` (existing full directory).
- Source: this repair checkout; startup health hashes every backend `.ts` file. Do not edit running source without restarting and re-verifying identity.
- Logs: `~/Library/Logs/KineBalance/{backend,tunnel}.jsonl`; maximum approximately 1 MiB current plus 1 MiB previous per service. Wrapper records lifecycle, exit status, stream names and byte counts, never raw child output, Bearer tokens or measurement payloads. ngrok request inspection is disabled.
- launchd KeepAlive restarts failures with a 60-second throttle. Explicit bootout stops restart. Graceful child termination has a 10-second fallback deadline.

TLS terminates at ngrok's cloud edge; the agent's TLS connection reaches this Mac; only the final hop to `127.0.0.1:4511` is HTTP. Only hosted API routes are served. Bearer authentication, exact CORS origins and no-store API responses remain required. No production origin is added by this deployment.

The existing system Cloudflare tunnel is unrelated and left running unchanged. Cloudflare administration requires login. No DNS record or nameserver was changed. The chosen ngrok account domain is pinned explicitly; no random/quick tunnel is used. Free quota applies; reaching the quota must surface as unavailable, never successful persistence. Current vendor limits: https://ngrok.com/docs/pricing-limits/free-plan-limits .

## Status

```sh
launchctl print "gui/$(id -u)/space.yuz1ove.kinebalance.backend"
launchctl print "gui/$(id -u)/space.yuz1ove.kinebalance.tunnel"
curl --fail https://sternum-relative-handclasp.ngrok-free.dev/api/health
tail -n 30 "$HOME/Library/Logs/KineBalance/backend.jsonl"
```

## Restart / stop / start

Use these commands for each `NAME` (`backend` or `tunnel`). Stop both to remove the public endpoint and backend; stopping only the backend intentionally leaves an unavailable API.

```sh
NAME=backend
launchctl bootout "gui/$(id -u)/space.yuz1ove.kinebalance.$NAME"
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/space.yuz1ove.kinebalance.$NAME.plist"
```

The first command alone stops; the second alone starts. Do not stop the system Cloudflare daemon or unrelated listeners. Recheck HTTPS health after starting. Never automatically fall back to the old V1.0 backend. Preserve new rows during rollback; do not overwrite the current DB with the pre-install backup.

## Backup and acceptance

A full local backup is in `output/mac-hosted-20260927/original-data-backup` at workspace root. Backend writing was paused; SQLite backup API plus a write lock protected the DB and companion-file snapshot. This is not uploaded to Vercel. Current evidence and final deployment identity are in the sibling `FINAL-REPORT.md` and JSON receipts under that evidence directory.

After a new preview URL is known, add only that exact origin to `backend.json`'s `KBPD_ALLOWED_ORIGINS`, then restart the backend. Build-level `VITE_API_BASE_URL` is public configuration only. Production promotion and production origin admission require separate approval.

launchd unload is asynchronous. For a restart in one command, the installed source provides a bounded retry helper (15 seconds maximum), scoped to these two service names:

```sh
/Users/Yuz1ove/.hermes/node/bin/node '/Users/Yuz1ove/Documents/ChatGPT/ARCI 醫/releases/kinebalance-production-repair-20260927/deployment/macos/control.mjs' restart backend
```

Replace `restart` with `status`, `stop`, or `start`; replace `backend` with `tunnel` for the tunnel. A bootstrap error 5 immediately after bootout can mean the previous job is still unloading; do not retry as root.
