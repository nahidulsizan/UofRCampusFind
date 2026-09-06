# PostgreSQL database files

CampusFind now uses PostgreSQL.

- `01_schema.sql` creates the tables, constraints, and indexes.
- `02_sample_queries.sql` contains readable SQL examples for the group.

The server automatically runs `01_schema.sql` during startup, so you do not
need to run it manually for a normal local or Render deployment. The script is
idempotent: every table and index uses `IF NOT EXISTS`.

For manual setup with the PostgreSQL command-line client:

```bash
psql "$DATABASE_URL" -f database/01_schema.sql
```


