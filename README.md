# Lily

A private, password-protected Progressive Web App (PWA) for personal notes, files, and cross-device access.

## Features

- **Single password** — no usernames, registration, or OTP
- **Notes & files** — text, PDF, Excel, Word, images, ZIP, and more
- **PWA** — installable on Android and desktop with offline shell
- **Android Share Target** — share from WhatsApp, Gallery, Chrome, and other apps
- **Clipboard paste** — Ctrl+V for text and images on desktop
- **Global search** — instant search across notes and files
- **Activity Center** — hidden audit log (Ctrl+Shift+A or 5× logo tap)
- **Backup & restore** — export/import full vault as ZIP
- **SQLite + file storage** — metadata in DB, files in `/uploads`

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create your vault password on first visit.

## Production

```bash
npm run build
npm start
```

Set `VAULT_SECRET` in `.env.local` to a long random string before deploying.

Serve behind HTTPS (required for PWA and secure cookies). Example with a reverse proxy:

- Nginx / Caddy / Cloudflare Tunnel pointing to `localhost:3000`
- Ensure `X-Forwarded-For` is passed for activity IP logging

## PWA Install

1. Open the site in Chrome (Android or desktop)
2. Use **Install** / **Add to Home Screen**
3. On Android, **Lily** appears in the system Share sheet after install

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Search |
| `Ctrl+N` | New note |
| `Ctrl+Shift+A` | Activity Center (password required) |

## Hidden Activity Center

- **Ctrl+Shift+A**, or
- Tap the logo **5 times** quickly

Re-enter your vault password to view full audit history.

## Data Layout

```
data/vault.db     # SQLite (notes, metadata, activity, settings)
uploads/          # Uploaded files (not in the database)
```

## Backup

Use **Settings → Backup** to download a ZIP with the database and all uploads. **Restore** replaces current data from a backup ZIP.

## Tech Stack

- Next.js 16 (App Router)
- SQLite (`better-sqlite3`)
- Tailwind CSS 4
- JWT sessions (`jose`)
- bcrypt password hashing

## Security Notes

- Passwords stored as bcrypt hashes only
- HttpOnly encrypted session cookies
- Configurable auto-lock after inactivity
- `noindex` / `robots.txt` — not indexed by search engines
- Files served only through authenticated API routes

## License

Private use — your personal vault.
