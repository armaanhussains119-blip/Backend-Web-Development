# Database Integration Assignment Starter

Replace the in-memory repository implementation with PostgreSQL through Prisma. The starter already uses an asynchronous repository contract so services and controllers can remain stable during the swap.

## Run

```bash
npm install
npm run prisma:generate
npm start
```

## PostgreSQL setup

Create a local PostgreSQL database, copy `.env.example` to `.env`, and replace the
placeholder password with your local credentials. `.env` is ignored by Git; never
put real credentials in a commit.

```bash
npm run prisma:format
npm run prisma:validate
npm run prisma:migrate
npm run db:seed
```

The migration is named `add_core_models` and is committed in `prisma/migrations`.
Use `npm run prisma:deploy` to apply committed migrations in a deployment
environment. The development seed is repeatable and creates the sample author and
posts if their IDs are unused; it does not delete existing data. It is for local
development only.

The API keeps returning post records with the original `id`, `title`, `body`, and
`authorId` fields. Database timestamps remain internal. Database constraint
failures are translated to safe `409` (duplicate) or `422` (invalid relation)
responses, while unexpected errors return a generic `500`.
