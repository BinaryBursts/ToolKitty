import { Container } from "@/components/layout/Container";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";

/**
 * Placeholder home page. The real homepage — hero, featured tools and
 * category-grouped tool cards — is built in a later ticket (REQ-4); this page
 * exists so the scaffold builds, renders and is covered by a test from the
 * first commit.
 *
 * The `<main>` element now belongs to the root layout, so pages render their
 * sections directly.
 */
export default function HomePage() {
  return (
    <Container as="section" className="o-section o-stack">
      <h1 className="o-display">{SITE_NAME}</h1>
      <p className="o-lead">{SITE_DESCRIPTION}</p>
      <p className="o-small o-muted">
        The site shell is in place; the first tools are on their way.
      </p>
    </Container>
  );
}
