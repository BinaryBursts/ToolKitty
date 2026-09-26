"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

import { useConsent } from "@/components/consent/ConsentProvider";
import { GA_MEASUREMENT_ID, isAnalyticsEnabled } from "@/config/site";

/**
 * Google Analytics 4, and nothing else (REQ-11).
 *
 * **Page views are the only event this module is permitted to send.** No
 * custom event, no conversion, no audience signal, and above all nothing
 * derived from what a visitor typed: not a generated password, not a pasted
 * JSON document, not a weight, not a temperature, not a homepage search term.
 * The only two parameters that ever leave this file are the page's path and
 * its title, both of which are already in the URL bar and the tab strip. The
 * types below say so — {@link Gtag} accepts one event name and one parameter
 * shape — and `page-views-only.test.ts` says so again by scanning the source,
 * because a future "just one custom event" is exactly how this rule gets lost.
 *
 * The measurement ID is checked for shape before it is used, in
 * `src/config/site.ts`: it is a hand-pasted value that ends up in a URL and in
 * a call to Google's tag, and one of the wrong shape switches analytics off
 * rather than being passed on.
 *
 * Nothing here runs, and no request to a Google host is made, until the
 * visitor presses Accept on the consent banner: the component returns `null`
 * while the answer is `"unanswered"` or `"declined"`, so the script tag is not
 * in the DOM and — because the component renders nothing on the server either
 * — not in the exported HTML at all. Google Consent Mode's cookieless pings
 * are deliberately not used: REQ-11 asks for no request before Accept, not a
 * quieter one.
 *
 * One departure from Google's copy-and-paste snippet, and it is deliberate:
 * the data layer and the `js`/`config` calls are set up by
 * {@link bootstrapGtag} here in the bundle, not by a second inline `<script>`
 * tag. The behaviour is identical — the data layer is a queue that gtag.js
 * drains whenever it arrives — but it means the site needs no inline script,
 * so the content security policy REQ-15 calls for can stay
 * `script-src 'self' https://www.googletagmanager.com` with no `unsafe-inline`
 * and no per-deployment hash to recompute every time the measurement ID
 * changes. It also means no script text is ever built by string
 * concatenation.
 *
 * It is also allowed to fail. If the visitor's ad-blocker, network or Google
 * itself stops gtag.js loading, the load error is swallowed, nothing is
 * retried, no fallback is attempted and no message is shown; every page and
 * every tool works exactly as before, because not one of them depends on this
 * component (see {@link ignoreLoadFailure}).
 */

/** The only event name this site sends. */
export const PAGE_VIEW_EVENT = "page_view";

/** The only parameters it sends with it. */
export type PageViewParameters = {
  /** Path of the page, from the router — never a query string or a fragment. */
  page_path: string;
  /** The document title, which is the tool's name plus the site's. */
  page_title: string;
};

/**
 * The global `gtag`, typed down to the three calls this site makes: the
 * bootstrap pair, and one event that can only be a page view with only a path
 * and a title. Anything else — a custom event, a `set` of a user id, an extra
 * parameter — is a type error rather than a review comment.
 */
type Gtag = {
  (command: "js", now: Date): void;
  (command: "config", measurementId: string, settings: typeof GA_CONFIG): void;
  (
    command: "event",
    eventName: typeof PAGE_VIEW_EVENT,
    parameters: PageViewParameters,
  ): void;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/** `id` of the `<script>` that fetches gtag.js. */
export const GTAG_SCRIPT_ID = "ga4-gtag";

/** Where gtag.js is fetched from, for a given measurement ID. */
export function gtagScriptSrc(measurementId: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
}

/**
 * How the measurement is configured, and the whole of it.
 *
 * `send_page_view` is what records the page the visitor happened to accept on;
 * every later page view is sent by the effect below. The two `allow_` flags
 * switch off Google Signals and ad personalisation, which is what keeps this a
 * traffic counter rather than cross-site advertising data. There is no
 * `user_id`, no `client_id` of our own and no custom parameter. IP handling is
 * left at the GA4 default, under which full IP addresses are not stored.
 */
export const GA_CONFIG = {
  send_page_view: true,
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
} as const;

/**
 * Google's bootstrap, written as code instead of as an inline script: create
 * the data layer, define `gtag` as the thing that pushes onto it, and make the
 * two opening calls. Running before, during or after gtag.js arrives is all
 * the same to it — the queue is drained whenever the tag loads, and never if
 * it is blocked.
 *
 * `arguments` rather than a rest parameter is not an oversight: gtag.js reads
 * each queued item as an `arguments` object, and an array is not the same
 * thing to it. That is also why this is a function expression and not an
 * arrow.
 */
export function bootstrapGtag(measurementId: string): void {
  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }

  const dataLayer = window.dataLayer;

  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      dataLayer.push(arguments);
    };
  }

  window.gtag("js", new Date());
  window.gtag("config", measurementId, GA_CONFIG);
}

/**
 * What happens when gtag.js does not load: nothing.
 *
 * An ad-blocker blocking googletagmanager.com is the normal case, not an
 * error, and a visitor converting a weight has no use for the news. So there
 * is no retry, no second source, no console noise and nothing rendered — the
 * handler exists only so the rejected load promise inside `next/script` is
 * handled rather than left unhandled (REQ-11: the page stays fully usable and
 * no error is shown).
 */
function ignoreLoadFailure(): void {
  return undefined;
}

/**
 * The page view for a path, built from the two permitted parameters and
 * nothing that was typed into a tool.
 *
 * The title is read from the document rather than passed in: it is called from
 * an effect, which React runs after the commit that rendered the new page and
 * applied its `<title>`, so what it reads is the page being reported.
 */
function pageViewFor(pathname: string): PageViewParameters {
  return { page_path: pathname, page_title: document.title };
}

/**
 * Loads GA4 once consent has been given, and reports page views for the rest
 * of the session.
 *
 * Mounted once by the root layout, inside `ConsentProvider` and after the page
 * content, so it can neither delay the first render nor be reached by a page
 * that is outside the provider.
 */
export function Analytics() {
  const { consent } = useConsent();
  const pathname = usePathname();

  const enabled = consent === "accepted" && isAnalyticsEnabled();

  /**
   * The last path GA has been told about, so a page view is sent once and only
   * once per navigation. It starts as `null` and is filled in — without
   * sending anything — the first time analytics is enabled, because
   * `gtag('config', ...)` has already sent the page view for the page the
   * visitor accepted on. Counting it again here would double every session's
   * first page.
   */
  const reportedPath = useRef<string | null>(null);

  /** Whether the data layer and the `config` call have been set up already. */
  const bootstrapped = useRef(false);

  useEffect(() => {
    // Once per session, the moment consent allows it. The ref is what keeps
    // React's development double-invocation of effects from sending the first
    // page view twice.
    if (!enabled || bootstrapped.current) {
      return;
    }

    bootstrapped.current = true;
    bootstrapGtag(GA_MEASUREMENT_ID);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      // Consent withdrawn, or never given: forget where we were, so a later
      // Accept starts again from its own `config` page view.
      reportedPath.current = null;
      return;
    }

    if (reportedPath.current === null) {
      reportedPath.current = pathname;
      return;
    }

    if (reportedPath.current === pathname) {
      return;
    }

    reportedPath.current = pathname;

    // Absent when gtag.js is blocked or has not finished loading. Either way
    // the page view is simply not sent; nothing waits for it and nothing
    // retries.
    window.gtag?.("event", PAGE_VIEW_EVENT, pageViewFor(pathname));
  }, [enabled, pathname]);

  if (!enabled) {
    return null;
  }

  return (
    <Script
      id={GTAG_SCRIPT_ID}
      src={gtagScriptSrc(GA_MEASUREMENT_ID)}
      strategy="afterInteractive"
      onError={ignoreLoadFailure}
    />
  );
}

export default Analytics;
