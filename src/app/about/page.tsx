import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";

export const metadata: Metadata = {
  title: "About & contact",
};

/**
 * Placeholder About/contact page.
 *
 * The shell links here from the header and the footer, so the route has to
 * exist for those links to resolve in the static export. The real content is
 * written in the REQ-10 pass.
 */
export default function AboutPage() {
  return (
    <Container as="section" className="o-section o-stack">
      <h1 className="o-h1">About &amp; contact</h1>
      <p className="o-lead">
        What ToolKitty is, who makes it and how to get in touch — this page is
        written in a later pass.
      </p>
    </Container>
  );
}
