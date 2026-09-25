/**
 * Public, committed configuration for ToolKitty.
 *
 * ToolKitty is a static, client-only site (REQ-1): there is no backend and no
 * secret of any kind, so every value here is public and lives in source
 * control. Nothing in the application reads `process.env`, which is what makes
 * "clone, install, one command" work with no environment file present.
 */

/** Product name, used in titles, metadata and the header. */
export const SITE_NAME = "ToolKitty";

/** One-line description, used as the default meta description. */
export const SITE_DESCRIPTION =
  "Fast, free browser tools. Everything runs on your device — nothing you type is sent anywhere.";

/**
 * Absolute base URL of the deployed site, with no trailing slash. Used to build
 * canonical and social URLs at build time.
 *
 * Placeholder until the owner supplies the production domain; update this
 * constant when the domain is registered (see REQ-16 deployment pass).
 */
export const SITE_BASE_URL = "https://toolkitty.vercel.app";

/**
 * The one email address the site publishes, shown on the privacy policy and
 * the About/contact page. There is no contact form anywhere — a form would
 * need a server to receive it, and there is none (REQ-10).
 *
 * TODO(owner): replace this placeholder with the real address before launch.
 * `example.com` is the reserved documentation domain, so mail sent here goes
 * nowhere; it is deliberately obvious so the placeholder cannot ship unnoticed.
 */
export const CONTACT_EMAIL = "hello@example.com";

/** The published contact address as a `mailto:` URL. */
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;

/**
 * Who runs the site, named in the privacy policy and on the About page.
 *
 * TODO(owner): confirm the name to publish — this is the name the approved
 * design draws, not a checked legal or trading name.
 */
export const OPERATOR_NAME = "BinaryBursts";

/**
 * The date the privacy policy was last revised, as an ISO `YYYY-MM-DD` date.
 *
 * REQ-10: the policy must be revised — and this date moved — whenever a new
 * third-party script is added to the site or the way traffic is measured
 * changes. The privacy page renders it in a readable form.
 */
export const PRIVACY_LAST_UPDATED = "2026-09-14";

/**
 * Google Analytics 4 measurement ID (format "G-XXXXXXXXXX").
 *
 * Empty string until the owner supplies the real ID. Analytics code must treat
 * an empty value as "analytics disabled" and load no third-party script, so
 * local development and preview builds stay free of tracking.
 */
export const GA_MEASUREMENT_ID = "";

/** True when a Google Analytics measurement ID has been configured. */
export const isAnalyticsEnabled = (): boolean => GA_MEASUREMENT_ID.length > 0;
