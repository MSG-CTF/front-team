# Instance Connection Commands Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show and copy Linux connection commands for existing TLS and future plaintext TCP endpoints.

**Architecture:** A shared pure utility interprets validated endpoint URLs and transport metadata. Participant and administrator screens reuse it for display and clipboard text; web endpoints retain their existing URL behavior.

**Tech Stack:** React, JavaScript, Node test runner, Vite SSR tests.

**Spec:** Accepted scope below, authorized in the conversation on 2026-10-27.

## Accepted scope

- Plain TCP: `nc <hostname> <public port>`; TLS: `ncat --ssl-verify [--ssl-servername <SNI>] <hostname> <public port>`.
- Preserve instance-specific random hostnames and never substitute the internal container port.
- Missing optional metadata may fall back to a well-formed tcp/tls URL. Conflicting or unsafe metadata produces no runnable command.
- Do not infer plaintext from missing TLS metadata on a tls URL. Never interpolate shell metacharacters or option-like hostnames into a copied command.
- Both participant and admin views show the command and copy it directly. Preserve web URL display/copy.
- Rejected or malformed TCP/TLS endpoints produce no clipboard text; copy controls are disabled while connection details remain visible. Only web endpoints retain the old metadata fallback.
- No Gateway changes, infrastructure changes, merge, or deployment; leave completed work in commits.

## Global Constraints

- No new dependencies and no network calls to participant endpoints.
- Preserve old HTTP/TLS routes and metadata detail display.

## Review Focus

- Conflicting TLS flags or ports must not generate a command for the wrong transport/endpoint.
- SNI and host input must not turn clipboard contents into shell execution or extra options.
- Explicit SNI can differ from the connection hostname and must be passed to Ncat.
- Legacy TCP and IPv6 URLs must use their public endpoint port.
- Both participant and administrator screens must use the same command behavior.

### Task 1: Connection command utility and rendering

**Files:** `src/features/challenges/utils/instanceConnectionDetails.js`, its test, `gatewayEndpointRendering.test.js`, participant endpoint components, admin deployment endpoint component.

**Interfaces:** Consumes endpoint `url`, `hostname`, `connection_port`, `tls`, `server_name`; produces a safe command string or empty string and consistent copy text.

- [x] Add behavioral utility and rendered-screen tests for plaintext, TLS/SNI, legacy endpoints, web endpoints, and unsafe/conflicting metadata.
- [x] Run focused Node tests and observe the new behavior fail.
- [x] Implement shared command generation; wire it into participant/admin display and clipboard actions.
- [x] Run `npm test` and `npm run build`. Expected: pass.
- [x] Review and commit the complete frontend change without merging or deploying.

## Verification

- Focused command/rendering tests: 13 passed, including disabled copy controls for invalid TCP metadata.
- Full `npm test`: 772 passed, no failures or skips. `npm run build`: passed (existing chunk-size warning remains).
- Independent review found and verified a clipboard fallback bypass; exact-empty output and URL normalization regressions failed first, then passed after the fix. Follow-up review found no remaining actionable issues.
- Existing web URL fallback and metadata display were intentionally preserved. Infrastructure, owner authentication, merge, and deployment were not changed.
