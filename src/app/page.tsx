import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";

/**
 * Placeholder home page. The real homepage — hero, featured tools and
 * category-grouped tool cards — is built in a later ticket (REQ-4); this page
 * exists so the scaffold builds, renders and is covered by a test from the
 * first commit.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">{SITE_NAME}</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        {SITE_DESCRIPTION}
      </p>
      <p className="text-sm text-zinc-500">
        The site shell and the first tools are on their way.
      </p>
    </main>
  );
}
