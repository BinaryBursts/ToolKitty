import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";
import { getToolsByCategory } from "@/tools/registry";

/**
 * Placeholder home page. The real homepage — hero, featured tools and
 * category-grouped tool cards — is built in a later ticket (REQ-4); this page
 * exists so the scaffold builds, renders and is covered by a test from the
 * first commit.
 *
 * It reads the tool registry (REQ-2) rather than listing tools by hand. That is
 * also what pulls the registry into the static build, so a registry mistake —
 * a duplicate slug, a missing SEO title — fails `npm run build`. Tool names are
 * not yet links: the pages at /tools/<slug> arrive with the page template.
 */
export default function HomePage() {
  const categories = getToolsByCategory();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">{SITE_NAME}</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        {SITE_DESCRIPTION}
      </p>
      {categories.map(({ category, tools }) => (
        <section key={category.id} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold tracking-wide uppercase">
            {category.name}
          </h2>
          <ul className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            {tools.map((tool) => (
              <li key={tool.slug}>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {tool.name}
                </span>{" "}
                — {tool.shortDescription}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-sm text-zinc-500">
        The site shell and the first tools are on their way.
      </p>
    </main>
  );
}
