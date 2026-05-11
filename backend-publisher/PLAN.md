# NPTEL Notifier Backend Plan

## Goal

Build a small Cloudflare Worker backend that periodically reads an NPTEL-related Google Sheet, matches sheet rows against subscriber interests, and sends notifications without sending duplicates.

## Target Architecture

```text
Cloudflare Worker
  GET /health
  POST /subscribers
  GET /subscribers
  scheduled job every 30 minutes

Cloudflare D1
  subscribers
  sheet_items
  notifications

Google Sheets
  source data, fetched as CSV or through the Sheets API

Notification provider
  webhook/email/Telegram adapter, chosen later
```

## Build Plan

### Part 1: Minimal Worker

- Create a TypeScript Cloudflare Worker project.
- Add `wrangler.toml`.
- Add a `GET /health` route.
- Install dependencies with `pnpm install`.
- Run locally with `pnpm dev`.

### Part 2: D1 Database

- Create a D1 database.
- Add schema tables:
  - `subscribers`
  - `sheet_items`
  - `notifications`
- Bind the database to the Worker as `DB`.
- Add local migration commands.

### Part 3: Subscriber API

- Add `POST /subscribers` to create a subscriber.
- Add `GET /subscribers` to list subscribers during development.
- Store subscriber contact details and subject keywords.
- Validate request bodies before writing to D1.

### Part 4: Google Sheet Fetching

- Start with public CSV export if possible.
- Parse CSV rows into normalized sheet items.
- Create stable IDs or hashes for rows.
- Upsert rows into `sheet_items`.

### Part 5: Scheduled Polling

- Add a Cloudflare Worker `scheduled()` handler.
- Configure cron to run every 30 minutes.
- Fetch the latest sheet data.
- Compare against stored rows.
- Process only new or changed items.

### Part 6: Fuzzy Matching

- Normalize subject text.
- Match sheet subjects against subscriber keywords.
- Start with a simple token-based fuzzy score.
- Store notification history to prevent duplicate sends.

### Part 7: Notifications

- Add a provider interface.
- Start with a generic webhook adapter.
- Later add email, Telegram, Discord, or WhatsApp.
- Record successful sends in `notifications`.

## Data Model Draft

```sql
CREATE TABLE subscribers (
  id TEXT PRIMARY KEY,
  contact_type TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  subjects_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE sheet_items (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  title TEXT,
  url TEXT,
  row_hash TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL,
  sheet_item_id TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  UNIQUE (subscriber_id, sheet_item_id)
);
```

## Important Design Choices

- Use D1 instead of local files because Workers are stateless.
- Poll every 30 minutes to stay comfortably inside free-tier limits.
- Store notification history so the same subscriber is not notified repeatedly.
- Keep the first notifier simple, then swap in richer providers later.
- Build part by part so each Cloudflare Workers concept is learned separately.

## Open Questions

- Is the Google Sheet public, or will it need Google API authentication?
- What columns does the sheet contain?
- What notification channel should be implemented first?
- How should users subscribe: manual API call, frontend form, or chat bot command?
