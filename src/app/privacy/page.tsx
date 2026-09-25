import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";

export const metadata: Metadata = {
  title: "Privacy policy",
};

/**
 * Placeholder privacy policy page.
 *
 * The shell's footer links here, so the route has to exist for that link to
 * resolve in the static export. The policy itself is written in the REQ-10
 * pass.
 */
export default function PrivacyPage() {
  return (
    <Container as="section" className="o-section o-stack">
      <h1 className="o-h1">Privacy policy</h1>
      <p className="o-lead">
        ToolKitty sets no cookies of its own and stores nothing in your browser;
        the full policy is written in a later pass.
      </p>
    </Container>
  );
}
