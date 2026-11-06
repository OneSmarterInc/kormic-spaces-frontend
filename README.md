# Kormic Spaces

Standalone employer frontend for Kormic Spaces: company sign-in, overview, jobs,
candidate profiles and fit ranking, hiring pipeline, messages, hiring copilot,
team settings, shared views, searchable activity logs, and theme selection.

The main route restores the company workspace. `/admin` contains the separate
Kormic portal administration console, including automated collection, job data,
search-agent monitoring, portal users, admin copilot, activity, and Apify budgets.
Company registration never creates a portal administrator. Company APIs require
organization membership; admin APIs require an active staff account.

Company login uses `/spaces/session/`; administrator login uses
`/spaces/admin/session/`. Both retain CSRF protection. They share Django's browser
session, so signing in as a different account changes the active browser identity.
Careers candidates keep their separate bearer-token authentication.

This repository contains the Spaces web application. It does not contain
the Careers candidate app, Django backend, databases, credentials, or prototype
fixtures. It calls the existing shared Django Spaces API. The Careers repository
is independent; future Spaces frontend changes belong here.

## Local development

Use Node.js 24 LTS and the shared Django backend running at `http://localhost:8900`.

```sh
npm ci
npm run dev
```

Open `http://localhost:8082`. Vite proxies `/spaces/` to Django, while employer UI
routes are `/`, `/jobs`, `/candidates`, `/pipeline`, `/messages`, `/copilot`, and
`/activity`, and `/settings`. Keep `localhost` consistent across both services. Add
`http://localhost:8082` to Django's CSRF trusted origins if not already present.
Open `/admin` for administrator sign-in; admin deep links stay below `/admin/`.
Old unambiguous administration routes (`/collection`, `/planner`, `/users`, and
`/overview`) redirect into that prefix. `/messages`, `/pipeline`, `/copilot`, and
`/activity` belong to the company workspace again.
Use an existing employer account or Create a company workspace. No account or
password is embedded in this frontend.

Optional configuration: copy `.env.example` to `.env.local`. `SPACES_DEV_BACKEND`
changes the development proxy target. `VITE_API_HOST` is a public API origin;
`VITE_CAREERS_URL` and `VITE_SPACES_URL` configure links between the portals.
leave it empty to use the same-origin proxy. Never put API keys or other secrets
in any `VITE_` variable. Anthropic keys belong only in Django's environment.

## Verification

```sh
npm test
npm run build
```

The build runs strict TypeScript checks and generates `dist/`. CI runs the tests
and build. `npm run preview` serves the static build; unlike the development
server, it does not configure a backend proxy.

## Future Vercel deployment

Import this repository with framework **Vite**, root directory **.**, build
command **npm run build**, and output directory **dist**. `vercel.json` includes
deep-link rewrites for the employer pages, and deliberately does not rewrite API
requests to HTML. No Vercel deployment has been created by this extraction.
The rewrites also serve `/admin` and its child routes from the frontend. Do not
proxy `/admin` on the Spaces host to Django's built-in operator admin; that
separate tool remains on the backend host. Proxy `/spaces/` for the shared API.

Before publishing a working environment, configure access to the shared Django
backend. Recommended: leave `VITE_API_HOST` empty and prepend this rewrite to
`vercel.json`, replacing the example host with your real HTTPS backend:

```json
{ "source": "/spaces/:path*", "destination": "https://YOUR-BACKEND-HOST/spaces/:path*" }
```

Do not deploy the placeholder. Configure Django's allowed hosts and exact CSRF
trusted origins for the real backend and Spaces frontend. Ensure secure session
and CSRF cookies, correct trusted proxy settings, and no caching of private API
responses. Preserve Set-Cookie through the proxy and verify sign-in, sign-out,
job writes, and copilot requests on the deployed origin.

Alternative: set `VITE_API_HOST=https://api.your-domain.com` before building and
configure Django credentialed CORS and CSRF for the exact frontend origin. With
the backend's default SameSite=Lax cookies, direct cross-origin requests require
same-site HTTPS domains (for example `spaces.example.com` and `api.example.com`).
For an unrelated `vercel.app` domain, use the same-origin rewrite instead of
relying on third-party cookies. Environment changes require a new build.

Backend deployment, database migrations, email configuration, and AI provider
configuration are managed separately. This frontend's successful build does not
prove production API availability.

References: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite),
[external rewrites](https://vercel.com/docs/routing/rewrites), and
[Vite environment variables](https://vite.dev/guide/env-and-mode).
