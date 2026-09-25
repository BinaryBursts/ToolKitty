import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ToolPageTemplate } from "@/components/layout/ToolPageTemplate";
import { toolUrl } from "@/lib/urls";
import { getAllTools, getToolBySlug } from "@/tools/registry";

/**
 * The only tool page in the repository (REQ-2).
 *
 * Every tool is served from this one file: `generateStaticParams` asks the
 * registry which slugs exist and the static export writes an HTML file for each
 * of them, so adding a tool is its component plus one registry entry and
 * nothing else — no route to add, no navigation to edit, no metadata to copy.
 *
 * `dynamicParams = false` is what makes that honest in a static export: a slug
 * the registry does not know is not rendered at build time and is not rendered
 * at request time either — there is no server — so an unknown `/tools/...`
 * falls through to the site's 404 page (TKT-7).
 */
export const dynamicParams = false;

/** One params object per registry entry — the full set of tool pages to build. */
export function generateStaticParams(): { slug: string }[] {
  return getAllTools().map((tool) => ({ slug: tool.slug }));
}

/**
 * The page's title, description and canonical URL, taken from the registry
 * entry.
 *
 * `title.absolute` is deliberate: `seoTitle` is the complete `<title>` and
 * already ends with the site name, so the root layout's `%s · ToolKitty`
 * template must not wrap it (see `ToolDefinition.seoTitle`).
 */
export async function generateMetadata({
  params,
}: PageProps<"/tools/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) return {};

  return {
    title: { absolute: tool.seoTitle },
    description: tool.metaDescription,
    alternates: { canonical: toolUrl(tool.slug) },
  };
}

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) notFound();

  return <ToolPageTemplate tool={tool} />;
}
