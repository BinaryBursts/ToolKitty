import { SITE_BASE_URL } from "@/config/site";

/**
 * The one place a tool's URL is built (REQ-2).
 *
 * Tool URLs are permanent, so the shape of them — `/tools/<slug>` — is written
 * once here and read everywhere else: the page template's links, the "more
 * tools" cards, the canonical link in each page's head, and later the sitemap.
 * Nothing else in the site concatenates "/tools/" with a slug.
 */

/** The site-relative path of a tool page: `/tools/weight-converter`. */
export const toolPath = (slug: string): string => `/tools/${slug}`;

/**
 * The absolute URL of a tool page, built from {@link SITE_BASE_URL}, for the
 * canonical link and anywhere else a full URL is needed.
 */
export const toolUrl = (slug: string): string =>
  `${SITE_BASE_URL}${toolPath(slug)}`;

/** The absolute URL of any site-relative path (`/about` → `https://…/about`). */
export const absoluteUrl = (path: string): string =>
  `${SITE_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
