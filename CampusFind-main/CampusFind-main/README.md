# CampusFind

**CampusFind** is a full-stack lost-and-found web application designed for the University of Regina campus community. It allows students and other campus users to report lost items and follow their report status, while authorized staff can record found items, review possible matches, and document item releases.

> **Academic project notice:** CampusFind is a CS 476 school project. It is not an official University of Regina or Protective Services system.

## Live Project

- **Website:** https://campusfind-zitd.onrender.com
- **GitHub repository:** https://github.com/lelele112358/CampusFind
- **Health check:** https://campusfind-zitd.onrender.com/api/health

The free Render service may take approximately 30–60 seconds to wake after a period of inactivity.

## Project Purpose

CampusFind was created to make the campus lost-and-found workflow safer and easier to manage. The system provides one place for users to submit lost-item reports, receive reference numbers, check report progress, and receive an email when a sufficiently similar found item is recorded.

Found items are not publicly posted. They are entered by authorized staff after being physically delivered to Protective Services. Private identifying information remains restricted to the administrator workflow.

## Main Features

### Public users

- Create an account and log in securely.
- Submit a lost-item report.
- Optionally upload a JPG, PNG, or PDF file.
- Receive a unique reference number such as `CF-2026-0001`.
- View recent reports.
- Check a report using the reference number and email address.
- Receive an automatic possible-match email when the notification feature is configured.

### Administrators

- Use a separate administrator login.
- View totals for open reports, items in holding, and pending matches.
- Record found items delivered to Protective Services.
- Store private verification notes.
- Generate possible matches automatically.
- Review, confirm, or reject matches.
- Record item releases in an audit log.
- View email-notification status for generated matches.

### Interface

- Responsive layout for desktop and mobile devices.
- Light and dark themes.
- University of Regina branding at the top of the interface.
- Protective Services branding in the footer.
- Separate public-user and administrator workflows.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Backend | Node.js and Express.js |
| Database | PostgreSQL |
| Cloud database | Neon PostgreSQL |
| Database client | `pg` with connection pooling |
| Authentication | JSON Web Tokens |
| Password hashing | `bcryptjs` |
| File uploads | `multer` |
| HTTP security | `helmet`, rate limiting, validation, and request limits |
| Email provider | Resend Email API |
| Hosting | Render Web Service |
| Version control | Git and GitHub |

## System Architecture

```text
User browser
    |
    | HTTPS
    v
Render Web Service
    |-- Static HTML, CSS, JavaScript
    |-- Node.js / Express REST API
    |
    | Parameterized SQL queries
    v
Neon PostgreSQL

When a match reaches the configured threshold:
Express API -> Resend Email API -> Lost-report owner
```

Express serves both the frontend and API, so CampusFind requires only one Render Web Service and one PostgreSQL database.

## Project Structure

```text
CampusFind/
├── public/
│   ├── assets/
│   │   ├── css/
│   │   │   ├── styles.css
│   │   │   └── logo-fixes.css
│   │   ├── images/
│   │   │   ├── campusfind-logo.svg
│   │   │   ├── uofr-logo.jpg
│   │   │   └── protectiveservice-logo.png
│   │   └── js/
│   ├── index.html
│   ├── login.html
│   ├── signup.html
│   ├── report.html
│   ├── claim-success.html
│   ├── admin-login.html
│   └── admin-dashboard.html
├── src/
│   ├── config/
│   ├── constants/
│   ├── controllers/
│   ├── middleware/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   │   ├── emailService.js
│   │   ├── matchingService.js
│   │   └── referenceService.js
│   ├── utils/
│   ├── app.js
│   └── server.js
├── database/
│   ├── 01_schema.sql
│   ├── 02_sample_queries.sql
│   └── README.md
├── scripts/
│   └── createAdmin.js
├── tests/
│   ├── matching.test.js
│   └── email.test.js
├── uploads/private/
├── .env.example
├── .gitignore
├── package.json
├── render.yaml
└── README.md
```

## Database Design

CampusFind uses the following PostgreSQL tables:

| Table | Purpose |
|---|---|
| `users` | Stores public users and administrators. |
| `lost_reports` | Stores reports submitted by authenticated users. |
| `found_items` | Stores items received and entered by administrators. |
| `item_matches` | Links possible lost and found item matches. |
| `release_logs` | Stores completed item-release records. |
| `lost_report_counters` | Generates sequential yearly reference numbers. |

The `item_matches` table also stores email-delivery information, including:

- Notification status
- Attempt time
- Successful delivery time
- Provider message ID
- Error information when delivery fails

Possible notification statuses are:

```text
Not Sent
Sent
Skipped
Failed
```

## Status Workflows

```text
Lost report:
Open -> Matched -> Pending Verification -> Resolved
                                      \-> Closed

Found item:
In Holding -> Matched -> Released
                       \-> Disposed

Item match:
Pending Review -> Confirmed
               \-> Rejected
```

## Automatic Matching

When an administrator enters a found item, CampusFind compares it with eligible lost reports and calculates a score from 0 to 100.

| Matching factor | Maximum score |
|---|---:|
| Same category | 45 |
| Similar item-name words | 30 |
| Similar location words | 15 |
| Date proximity | 10 |
| **Maximum total** | **100** |

Text comparison uses token-based Jaccard similarity after punctuation and common words are removed.

| Score | Classification |
|---:|---|
| 75–100 | High similarity |
| 58–74 | Medium similarity |
| 45–57 | Low similarity |
| Below 45 | Not stored automatically |

The score supports administrator review. It never proves ownership and never releases an item automatically.

## Automatic Email Notifications

CampusFind can email the owner of a lost report when a newly generated match reaches the configured score threshold.

### Notification workflow

1. An administrator records a found item.
2. CampusFind calculates possible matches.
3. New matches are stored in PostgreSQL.
4. Matches at or above `MATCH_EMAIL_THRESHOLD` are sent to Resend.
5. The send result is recorded in `item_matches`.
6. Staff still verify ownership manually before releasing the item.

The default threshold is:

```env
MATCH_EMAIL_THRESHOLD=58
```

This sends notifications for medium- and high-scoring matches. A value of `75` sends only high-score matches, while `45` sends every stored candidate.

### Email privacy

The notification includes only limited information needed to alert the requester, such as:

- Lost-report reference number
- Item category
- Date the possible match was found
- A link back to CampusFind

The email does **not** include:

- Private verification notes
- Serial numbers
- Uploaded files
- Photo-identification documents
- Sensitive ownership details

### Duplicate and failure protection

- A stable idempotency key based on the match ID helps prevent duplicate sends.
- Email is attempted after the database transaction commits.
- An email failure does not remove the found item or match.
- Delivery results appear on the administrator dashboard.

### Resend testing restriction

The default sender `onboarding@resend.dev` can send test messages only to the email address associated with the Resend account. To send to normal student or campus email addresses, a domain owned by the project team must be verified in Resend and used in `EMAIL_FROM`.

## API Overview

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Create a user account. |
| `POST` | `/api/auth/login` | Public | Log in as a public user. |
| `POST` | `/api/auth/admin/login` | Public | Log in as an administrator. |
| `GET` | `/api/auth/me` | Authenticated | Return the current user. |

### Lost reports

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/lost-reports` | User | Submit a lost-item report. |
| `GET` | `/api/lost-reports/mine` | User | Return the current user’s reports. |
| `GET` | `/api/lost-reports/status` | Public | Check status using reference number and email. |

### Administration

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | Admin | Return dashboard metrics and recent activity. |
| `POST` | `/api/found-items` | Admin | Record a found item and generate matches. |
| `PATCH` | `/api/matches/:id/confirm` | Admin | Confirm a possible match. |
| `PATCH` | `/api/matches/:id/reject` | Admin | Reject a possible match. |
| `POST` | `/api/release/:id` | Admin | Release an item and create an audit record. |

### Health check

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Confirms that the server is running. |

## Local Installation

### Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL or a Neon PostgreSQL account
- Git
- A Resend account for email testing

### 1. Clone the repository

```bash
git clone git@github.com:lelele112358/CampusFind.git
cd CampusFind
```

HTTPS alternative:

```bash
git clone https://github.com/lelele112358/CampusFind.git
cd CampusFind
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the environment file

```bash
cp .env.example .env
```

Configure `.env`:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST/DATABASE?sslmode=verify-full
PGSSLMODE=verify-full
PG_POOL_MAX=10

JWT_SECRET=replace-with-a-random-value-at-least-32-characters
JWT_EXPIRES_IN=7d

ADMIN_NAME=CampusFind Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-password-of-at-least-12-characters
ADMIN_PHONE=306-585-4407

EMAIL_NOTIFICATIONS_ENABLED=false
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_REPLY_TO=
APP_URL=http://localhost:3000
MATCH_EMAIL_THRESHOLD=58
```

Generate a secure JWT secret:

```bash
openssl rand -hex 32
```

Never commit `.env` to GitHub.

### 4. Create or update the administrator

```bash
npm run create-admin
```

Running this command again with the same administrator email and a new password updates the password hash stored in PostgreSQL.

### 5. Start the application

Development mode:

```bash
npm run dev
```

Production-style mode:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Enabling Email Notifications

### Test mode

Create a Resend API key and configure:

```env
EMAIL_NOTIFICATIONS_ENABLED=true
RESEND_API_KEY=re_your_private_api_key
EMAIL_FROM="CampusFind <onboarding@resend.dev>"
EMAIL_REPLY_TO=your-email@example.com
APP_URL=http://localhost:3000
MATCH_EMAIL_THRESHOLD=58
```

When using `onboarding@resend.dev`, the lost report must use the same email address associated with the Resend account.

### Production-style sending

To email arbitrary recipients:

1. Own or purchase a domain.
2. Add the domain or a sending subdomain to Resend.
3. Add the SPF and DKIM DNS records supplied by Resend.
4. Wait for the domain to show as verified.
5. Set `EMAIL_FROM` to an address on that verified domain.

Example:

```env
EMAIL_FROM="CampusFind <notifications@notify.example.com>"
```

Do not commit the Resend API key to GitHub.

## Available npm Commands

| Command | Purpose |
|---|---|
| `npm start` | Start the Express server. |
| `npm run dev` | Start the server using Node watch mode. |
| `npm run create-admin` | Create or update the administrator account. |
| `npm test` | Run all Node.js tests. |

## Deployment

The published project uses a Render Web Service connected to Neon PostgreSQL.

### Render settings

```text
Runtime: Node
Branch: main
Root directory: blank
Build command: npm ci --registry=https://registry.npmjs.org/
Start command: npm start
Health check path: /api/health
Instance type: Free
```

### Render environment variables

```text
NODE_ENV=production
DATABASE_URL=<Neon pooled connection string>
PGSSLMODE=verify-full
PG_POOL_MAX=10
JWT_SECRET=<private random value>
JWT_EXPIRES_IN=7d
EMAIL_NOTIFICATIONS_ENABLED=true
RESEND_API_KEY=<private Resend API key>
EMAIL_FROM=<sender on a verified domain, or onboarding@resend.dev for testing>
EMAIL_REPLY_TO=<reply address>
APP_URL=https://campusfind-zitd.onrender.com
MATCH_EMAIL_THRESHOLD=58
```

Render supplies `PORT` automatically.

After changes are pushed to the GitHub `main` branch, Render normally rebuilds and redeploys the application automatically.

## Testing

Run the automated tests:

```bash
npm test
```

The test suite includes:

- Match-score calculation tests
- Similarity-classification tests
- Email-threshold behavior tests
- Email-template privacy tests

The application has also been manually tested for:

- Public signup and login
- Administrator login
- Lost-report submission
- Sequential reference generation
- Report-status lookup
- PostgreSQL data creation
- Found-item creation
- Candidate-match generation
- Email API requests and delivery-status recording
- Render-to-Neon connectivity
- Health-check response

## Security and Privacy Measures

- Passwords are hashed with bcrypt and are not stored as plain text.
- JWTs are signed using a private environment variable.
- User and administrator routes use role-based authorization.
- Login and signup endpoints are rate-limited.
- SQL queries use parameters instead of concatenated user input.
- Helmet adds common HTTP security headers.
- Request sizes and uploaded-file sizes are limited.
- Uploaded files are restricted to JPG, PNG, and PDF formats.
- Private verification notes are restricted to administrators.
- Email messages omit private verification details and uploaded files.
- Database credentials, JWT secrets, and API keys are stored in environment variables.
- `.env`, private uploads, and dependencies are excluded from Git.

## Known Limitations

- Render’s free service sleeps after inactivity, making the first request slower.
- Uploaded files use Render’s ephemeral filesystem and may disappear after a restart or redeployment.
- Sending email to arbitrary recipients requires a verified sending domain.
- The matching system is rule-based and may produce false positives or miss valid matches.
- Email delivery does not confirm that the requester owns the item.
- The project does not currently send SMS notifications.
- The project has not undergone an official institutional privacy, accessibility, or security audit.
- Real government identification or sensitive documents should not be uploaded to the classroom deployment.

## Future Improvements

- Store uploads in durable private object storage such as Amazon S3 or Cloudinary.
- Add an email retry queue for temporary provider failures.
- Add password-reset and account-verification workflows.
- Add user email preferences and unsubscribe controls.
- Add pagination, search, and advanced dashboard filters.
- Add browser-based end-to-end tests.
- Add automatic retention and disposal reminders.
- Improve accessibility and keyboard-navigation testing.
- Add administrator user-management and audit-report interfaces.
- Add optional SMS notifications.

## Academic and Legal Disclaimer

CampusFind is a classroom prototype. It is not affiliated with, endorsed by, or operated by the University of Regina or University of Regina Protective Services. A real deployment would require formal approval, a privacy and security review, durable encrypted storage, data-retention policies, backups, accessibility validation, verified institutional email infrastructure, and operational monitoring.

## Project Team

Developed by the **CampusFind CS 476 project team** at the University of Regina.

Add team-member names here before submission:

- Team member 1
- Team member 2
- Team member 3
- Team member 4

---

**Last updated:** July 2026
