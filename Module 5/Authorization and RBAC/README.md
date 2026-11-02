# LU 5.1 — Authorization & RBAC

Implement authorization on top of JWT authentication. This assignment uses an in-memory user and post store, so no database or password-hashing dependency is required.

## What is included

- `requireAuth` verifies a signed bearer token and attaches its verified claims to `req.user`.
- `requireRole(...roles)` requires an authenticated user and checks only `req.user.role`.
- Only admins can delete users.
- Only moderators and admins can hide posts.
- A post's owner, moderator, or admin can edit or delete it.
- Missing posts return `404`; authentication failures return `401`; authorization failures return `403`.

## Setup

```bash
npm install
Copy-Item .env.example .env
npm test
npm start
```

Set `ACCESS_SECRET` to a private random secret when running the server. The fallback secret is for local assignment use only.

## Routes

All resource routes use an `Authorization: Bearer <token>` header. Tokens must be signed with `ACCESS_SECRET` and include the verified user's `id` and `role` claims. The test suite creates tokens for the seeded users; this project intentionally does not add a login endpoint or trust role values supplied in request data.

| Method | Path | Access |
|---|---|---|
| `PATCH` | `/posts/:id` | Owner, moderator, or admin |
| `DELETE` | `/posts/:id` | Owner, moderator, or admin |
| `POST` | `/posts/:id/hide` | Moderator or admin |
| `DELETE` | `/users/:id` | Admin |

Post updates accept `title` and `content`; ownership fields cannot be changed through the request body. Authorization errors use `{ "error": { "code": "UNAUTHENTICATED" | "FORBIDDEN", "message": "..." } }`.

Run the automated scenarios with `npm test`.
