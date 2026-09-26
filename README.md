# ToolKitty

Fast, free browser tools — unit and temperature conversion, password generation,
JSON formatting and more. Every tool runs entirely in the visitor's browser.

ToolKitty is a **statically generated, client-only website**. There is no
backend, no database, no authentication and no API: `npm run build` produces
nothing but HTML, CSS, JS and static assets. Nothing a visitor types ever leaves
their browser.

## Requirements

- Node.js 20 LTS (>= 20.9)
- npm

## Getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

That is the whole setup. **No `.env` file is needed and none should be created** —
the only configuration values are public ones (site name, base URL, Google
Analytics measurement ID) and they are committed in
[`src/config/site.ts`](src/config/site.ts). No application file reads
`process.env`; ESLint fails the build if one does.

## Scripts

| Command                | What it does                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run dev`          | Start the local development server on port 3000.                    |
| `npm run build`        | Type-check and build the static export into `out/`.                 |
| `npm start`            | Serve the built `out/` directory as plain static files (port 3000). |
| `npm run lint`         | ESLint (`next/core-web-vitals` + TypeScript rules).                 |
| `npm run typecheck`    | `tsc --noEmit` in strict mode.                                      |
| `npm test`             | Run the Vitest suite once.                                          |
| `npm run test:watch`   | Run Vitest in watch mode.                                           |
| `npm run format`       | Rewrite files with Prettier (sorts Tailwind classes).               |
| `npm run format:check` | Check formatting without writing.                                   |

`npm start` requires a build first: `npm run build && npm start`.

## Project layout

```
src/
  app/           Routes and layouts (App Router). Static pages only.
  components/
    analytics/   Google Analytics 4 loader, gated on consent
    consent/     Consent banner and the session's consent answer
    layout/      Header, footer and page shell
    ui/          Shared UI kit: fields, buttons, readouts, copy controls
  config/        Committed public configuration (site.ts)
  lib/           Framework-free helpers and tool logic
  tools/         Per-tool implementations
  test/          Vitest setup
public/          Static assets copied verbatim into out/
```

## Rules this repository holds itself to

These come from the project's foundation requirement (REQ-1) and CI enforces
them:

- **No server code.** No API routes, no `middleware.ts`, no server actions, no
  runtime data fetching. The build must report zero server functions.
- **No environment variables.** No `.env` file is read, committed or required.
- **TypeScript strict mode**, with `noUncheckedIndexedAccess` and
  `noImplicitOverride`. The build fails on any type error.
- **Tools work offline.** All computation happens in the browser, so a tool page
  keeps working after first load with the network disconnected.
- **Third-party scripts** are limited to Google Analytics (and later AdSense).
  Nothing else loads on any page.

## Styling

Tailwind CSS v4. There is no `tailwind.config.js` — v4 is configured from CSS,
in the `@theme` block of [`src/app/globals.css`](src/app/globals.css). Prettier
sorts Tailwind class names automatically.

### The shared UI kit

Tool screens are assembled from [`src/components/ui`](src/components/ui) —
`Field`, `TextInput`, `Select`, `Textarea`, `Slider`, `Button`,
`SegmentedSelect`, `Readout`, `SwapButton`, `CopyButton`, `InlineMessage` —
rather than styled by hand. Each maps onto classes from the approved theme in
`globals.css`, so **no component file sets a colour of its own**: light and dark,
focus rings and 44 px touch targets are decided in one place.

Run `npm run dev` and open <http://localhost:3000/kitchen-sink> to see every
component in every state. That page is an internal review aid: it ships in the
static export because there is no server to gate it behind, but it is `noindex`,
unlinked from the site, and **must be left out of the sitemap** when the sitemap
is added.

## Analytics

Google Analytics 4 is the only analytics on the site, it is loaded by
[`src/components/analytics/Analytics.tsx`](src/components/analytics/Analytics.tsx),
and it sends **page views only** — path and title, never anything a visitor
typed into a tool. `src/components/analytics/page-views-only.test.ts` enforces
that by scanning the source: only that one module may mention `gtag` or
`dataLayer`, and every call it makes is listed in the test.

Nothing is loaded and no cookie is set until the visitor presses **Accept** on
the consent banner. Decline, or ignoring the banner, loads no script at all, and
the answer is kept in memory for the session only — so a reload asks again.

**There is no inline script.** The data layer and the opening `js`/`config`
calls are ordinary bundled code, not a `<script>` tag with a snippet in it, so
the content security policy this site sets on deployment (REQ-15) needs no
`unsafe-inline` and no per-deployment hash:

```
script-src 'self' https://www.googletagmanager.com;
connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com;
img-src 'self' data: https://www.google-analytics.com;
```

### The one manual step after merge

The measurement ID is a public value and is committed, not configured through
an environment variable. It ships empty, and an empty ID means analytics is
simply switched off: every page and every tool works exactly as it does with
analytics on, and no request is made to any Google host even after Accept.

To turn measurement on:

1. Create the GA4 property (or open the existing one) and copy its measurement
   ID — the `G-XXXXXXXXXX` value from Admin → Data streams → the web stream.
2. Paste it into `GA_MEASUREMENT_ID` in
   [`src/config/site.ts`](src/config/site.ts), replacing the empty string, and
   remove the `TODO(owner)` note above it.
3. Run `npm test`. A value that is not of the form `G-` plus letters and digits
   fails `src/config/site.test.ts`, and the site would treat it as absent and
   leave analytics off rather than measure into nowhere.
4. Commit and redeploy. Data appears in GA4 realtime as soon as somebody
   accepts the banner.

No secret is involved and no `.env` file is needed for this: a GA4 measurement
ID is visible in the page source of every site that uses one and authorises
nothing.

## Deployment

The repository builds on Vercel and is served as static files over HTTPS. The
Vercel project and the production domain are set up in a later ticket; the
production domain and the real Google Analytics measurement ID are still
outstanding, and `src/config/site.ts` carries placeholders until then.
