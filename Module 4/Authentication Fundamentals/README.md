# Authentication Fundamentals

This project implements registration and login with Express, Prisma, SQLite, and
bcryptjs. Passwords are hashed before they are stored. Successful responses contain
only a user's `id`, `name`, and normalized `email`; this assignment does not use tokens
or sessions.

## Setup

```bash
npm install
Copy-Item .env.example .env
npm run db:setup
npm test
npm start
```

The example environment file uses a local SQLite database at `prisma/dev.db`. Change
`BCRYPT_ROUNDS` only when needed; the supported secure range is 10 through 15 and the
default is 12.

## Endpoints

### `POST /auth/register`

```json
{
  "name": "Sam",
  "email": "sam@example.com",
  "password": "correct horse battery staple"
}
```

Returns `201` with the public user data. A normalized duplicate email returns `409`;
invalid fields return `400`.

### `POST /auth/login`

```json
{
  "email": "sam@example.com",
  "password": "correct horse battery staple"
}
```

Returns `200` with the public user data. Unknown emails and incorrect passwords both
return `401` with the same `INVALID_CREDENTIALS` response.

Tests use the built-in Node.js test runner and mock the repository, so they do not need
a running database. Prisma setup and validation commands are available in `package.json`.
