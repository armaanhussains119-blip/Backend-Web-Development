# Cookies, Sessions and Authentication

This project demonstrates signed cookies backed by server-side sessions. The `sid`
cookie contains only a random session ID; the server-side store maps that ID to a user
and an expiry. Cookie signing protects integrity, not confidentiality.

## Setup and configuration

```powershell
Copy-Item .env.example .env
npm install
npm run setup
```

Edit `.env` and replace the `COOKIE_SECRET` placeholder with a unique secret of at least
32 characters. For example, generate a secret with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Keep `COOKIE_SECURE=false` for local HTTP. In production the cookie is always Secure and
must be tested over HTTPS. `SESSION_TTL_MS` defaults to one hour and can be set from
60,000 ms to 86,400,000 ms.

`npm run setup` generates the Prisma client, creates the SQLite schema, and seeds the
local demo account (`sam@example.com`, password `SessionDemo!48`). The demo password is
for local learning only; do not use it outside this environment.

## Start and test

```powershell
npm test
npm start
```

The tests use mocked repository calls and do not need a database. `npm run setup` is
needed to run the app against the local SQLite database.

## Authentication lifecycle

Login with the seeded local account. `curl.exe` saves the signed cookie to a cookie jar:

```powershell
curl.exe -i -c cookies.txt -H "Content-Type: application/json" `
  -d '{"email":"sam@example.com","password":"SessionDemo!48"}' `
  http://localhost:3000/auth/login
```

Use that cookie jar for the protected profile route:

```powershell
curl.exe -i -b cookies.txt http://localhost:3000/auth/me
```

Log out, then replay the old cookie jar to confirm the session has been revoked:

```powershell
curl.exe -i -b cookies.txt -X POST http://localhost:3000/auth/logout
curl.exe -i -b cookies.txt http://localhost:3000/auth/me
```

Login returns `200` with only `id`, `name`, and `email`. Invalid credentials return a
generic `401`; invalid input returns `400`. `/auth/me` returns the same generic `401`
for absent, invalid, expired, or orphaned sessions. Logout returns `204` and destroys
the server-side session.

## Session storage

The in-memory session Map is appropriate for this learning exercise and a single local
process only. Sessions disappear when the server restarts and are not shared by multiple
server instances. Production deployments need a shared store with expiry, such as Redis.
