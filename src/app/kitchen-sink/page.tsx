import type { Metadata } from "next";

import { KitchenSink } from "./KitchenSink";

/**
 * Internal review route for the shared UI kit (TKT-4).
 *
 * It ships with the static export — there is no server to hide it behind — but
 * it is deliberately invisible: nothing in the header, the footer or any page
 * links to it, and the metadata below tells crawlers to leave it alone. When
 * the sitemap is built (REQ-11), this path must be left out of it; the sitemap
 * should list the homepage, the tool pages and the static pages explicitly
 * rather than enumerating routes, so this page cannot creep back in.
 */
export const metadata: Metadata = {
  title: "UI kit kitchen sink",
  description:
    "Internal page showing every shared UI component in every state.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function KitchenSinkPage() {
  return <KitchenSink />;
}
