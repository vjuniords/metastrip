# Security Policy

## Design principles

- **No network**: images are processed locally. Extension pages run under a strict CSP (`script-src 'self'`).
- **Least privilege**: the extension only requests `contextMenus` and `downloads`. Host access is requested
  per-origin, at the moment the user right-clicks an image on that site.
- **Defensive parsing**: every length field is bounds-checked; malformed input throws a typed `MetaStripError`.
  The core is fuzz-tested with truncated and randomly corrupted files.
- **Resource limits**: inputs above 100 MB are rejected.

## Reporting a vulnerability

Please do **not** open a public issue. Use GitHub *Security → Report a vulnerability* (private advisory).
We aim to respond within 7 days.
