# Repository Guidance

## Project Direction

- Build the backend incrementally, part by part, so the Cloudflare Workers concepts are easy to learn.
- Prefer TypeScript for the Cloudflare Worker implementation.
- Use Cloudflare Workers with D1/KV concepts where appropriate.
- The backend should eventually:
  - read from Google Sheets,
  - persist sheet data/state,
  - match subscriber interests with fuzzy subject matching,
  - notify subscribers,
  - avoid duplicate notifications.

## Package Manager

- Use `pnpm` for the backend project.
- Prefer `pnpm install`, `pnpm dev`, `pnpm typecheck`, and `pnpm format`.

## Code Style

- Use Prettier.
- Use 2-space indentation.
- Expand tabs into spaces.
- Move shared strings into constants files.
- Keep route paths in route constants/enums.
- Prefer small request helper functions such as `isGetRequest()` over repeating inline request-method checks.

## Git

- Use Conventional Commits.
- Example commit messages:
  - `feat: add subscriber API`
  - `feat: add D1 database schema`
  - `docs: add backend implementation plan`
  - `chore: configure prettier`
  - `refactor: move request helpers to utils`
