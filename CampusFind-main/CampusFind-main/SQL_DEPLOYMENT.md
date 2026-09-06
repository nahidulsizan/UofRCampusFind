# SQL deployment choices

## Choice 1 — easiest for a short class demo

Use Render Postgres with the included `render.yaml`.

1. Push the project to GitHub.
2. In Render, choose **New → Blueprint**.
3. Select the repository.
4. Render creates both `campusfind` and `campusfind-db`.
5. Open the web service's Environment page and confirm that `DATABASE_URL`
   comes from `campusfind-db`.
6. Deploy and test `/api/health`.

Important: Render's Free Postgres database expires after 30 days.

## Choice 2 — better for staying at $0 longer

Use Neon Free for PostgreSQL and Render Free for the Node.js web service.

1. Create a Neon Free project.
2. Copy the pooled connection string.
3. Create a Render **Web Service** from the repository.
4. Use `npm install` and `npm start`.
5. Add:

```text
NODE_ENV=production
DATABASE_URL=<Neon pooled connection string>
PGSSLMODE=require
JWT_SECRET=<at least 32 random characters>
JWT_EXPIRES_IN=7d
```

`render-neon.yaml` is a reference Blueprint. Rename it to `render.yaml` before
pushing if you want Render to use that version automatically.

## Create the administrator

On your Mac, create a private `.env` using the same database URL and run:

```bash
npm install
npm run create-admin
```

Never commit `.env` or the database URL.
