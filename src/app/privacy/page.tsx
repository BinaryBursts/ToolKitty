import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode, SVGProps } from "react";

import { ToolCard } from "@/components/home/ToolCard";
import { Container } from "@/components/layout/Container";
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO,
  OPERATOR_NAME,
  PRIVACY_LAST_UPDATED,
  SITE_NAME,
} from "@/config/site";
import { absoluteUrl, toolPath } from "@/lib/urls";
import { getToolListings } from "@/tools/registry";

/**
 * The privacy policy (REQ-10), written as the approved "Privacy policy" screen
 * draws it: plain disclosure of what the site does and does not collect, the
 * two outside services that can ever be involved, and one email address.
 *
 * Two rules this page is held to, both from REQ-10:
 *
 * 1. **The date and the third-party list are revised together with the code.**
 *    Adding any third-party script — a second analytics tool, an ad script, an
 *    embedded font or widget — means adding it to the "Third parties, in full"
 *    list here and moving `PRIVACY_LAST_UPDATED` in `src/config/site.ts` in
 *    the same change. The list a visitor reads has to be the list that can run.
 * 2. **There is no input of any kind on this page.** No contact form, no
 *    preference control, no search box: the site is a static export with no
 *    server to receive anything a visitor typed, so a field here would be a
 *    promise it cannot keep. The page's test asserts the rendered markup holds
 *    no `form`, `input`, `textarea` or `select`.
 *
 * It is a server component with no client boundary: everything on it is
 * committed copy, so the whole page is rendered into `out/privacy.html` at
 * build time and reads the same with JavaScript switched off.
 */

export const metadata: Metadata = {
  // `title.absolute` because the root layout carries a `%s · ToolKitty`
  // template and this title already ends in the site name.
  title: { absolute: `Privacy policy — ${SITE_NAME}` },
  description:
    "What ToolKitty collects — nothing of its own: tool input never leaves your browser, and Google Analytics loads only after you accept.",
  alternates: { canonical: absoluteUrl("/privacy") },
  // Deliberately indexable: the consent banner and every tool page link here,
  // and a policy a crawler cannot see is no use to anyone judging the site.
};

/**
 * The policy's sections, in the order they are written. One list drives both
 * the "On this page" navigation and the headings' ids, so a section cannot be
 * renamed in one place and left behind in the other.
 */
const POLICY_SECTIONS = [
  { id: "what-we-collect", title: "What this site collects about you" },
  { id: "what-you-type", title: "What happens to what you type" },
  { id: "analytics", title: "Analytics" },
  { id: "advertising", title: "Advertising" },
  { id: "if-you-decline", title: "If you decline" },
  { id: "cookies", title: "Cookies" },
  { id: "third-parties", title: "Third parties, in full" },
  { id: "hosting", title: "Hosting and logs" },
  { id: "your-rights", title: "Your rights" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact" },
] as const;

/** A section heading, with the id its entry in {@link POLICY_SECTIONS} names. */
function SectionHeading({
  id,
  children,
}: {
  id: (typeof POLICY_SECTIONS)[number]["id"];
  children: ReactNode;
}) {
  return (
    <h2 className="o-h2" id={id} style={{ margin: "14px 0 0" }}>
      {children}
    </h2>
  );
}

function PolicyIcon({ children, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="o-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** The padlock beside the headline promise, drawn as the site draws it. */
function LockIcon() {
  return (
    <PolicyIcon>
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </PolicyIcon>
  );
}

/** An envelope, for the one contact address. */
function MailIcon() {
  return (
    <PolicyIcon width="16" height="16">
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </PolicyIcon>
  );
}

/**
 * The last-updated date in the form the approved screen shows it — "14
 * September 2026".
 *
 * Formatted explicitly in `en-GB` and UTC rather than from the machine's
 * locale or time zone, so the date rendered into the static export is the date
 * in the constant, whatever the build agent is set to.
 */
function formatPolicyDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** One row of the third-party disclosure, stacked on a narrow screen. */
function ThirdPartyRow({
  service,
  detail,
  purpose,
  loads,
  cookies,
}: {
  service: string;
  detail: string;
  purpose: string;
  loads: ReactNode;
  cookies: string;
}) {
  return (
    <tr>
      <td>
        <span className="o-table__label">Service</span>
        <span className="o-strong">{service}</span>
        <br />
        <span className="o-small o-muted">{detail}</span>
      </td>
      <td>
        <span className="o-table__label">What it is for</span>
        {purpose}
      </td>
      <td>
        <span className="o-table__label">When it loads</span>
        {loads}
      </td>
      <td>
        <span className="o-table__label">Cookies</span>
        {cookies}
      </td>
    </tr>
  );
}

export default function PrivacyPage() {
  const lastUpdated = formatPolicyDate(PRIVACY_LAST_UPDATED);
  const tools = getToolListings();

  // The worked example of a page view is built from a real registry entry
  // rather than a slug typed in here, so it cannot end up quoting an address
  // the site does not have (REQ-2: slugs live in the registry and nowhere
  // else).
  const example = tools[0];
  const examplePath = example ? toolPath(example.slug) : "/";
  const exampleTitle = example ? `${example.name} — ${SITE_NAME}` : SITE_NAME;

  return (
    <>
      <Container as="section" className="o-section">
        <div className="o-stack">
          <nav className="o-row o-small o-muted" aria-label="Breadcrumb">
            <Link href="/">All tools</Link>
            <span aria-hidden="true">›</span>
            <span>Privacy policy</span>
          </nav>
          <span className="o-eyebrow">Plain English · No lawyers required</span>
          <h1 className="o-display" style={{ margin: 0 }}>
            Privacy policy
          </h1>
          <p className="o-lead" style={{ margin: 0 }}>
            {SITE_NAME} has no accounts, no sign-in and no server that sees your
            work. Everything you type into a tool is converted, generated or
            formatted by your own browser and never sent anywhere. This page
            says exactly what that means, and names the two outside services
            that can ever be involved.
          </p>
          <div className="o-row">
            <span className="o-badge o-badge--primary">
              Last updated{" "}
              <time dateTime={PRIVACY_LAST_UPDATED}>{lastUpdated}</time>
            </span>
            <span className="o-badge">
              Applies to every page on {SITE_NAME}
            </span>
          </div>
        </div>
      </Container>

      <Container as="section">
        <div className="o-grid o-grid--3">
          <div className="t-fact t-fact--mint o-stack--tight">
            <div className="o-stat__label">Accounts we ask for</div>
            <div className="t-fact__value" style={{ fontSize: "3.4rem" }}>
              0
            </div>
            <p className="t-fact__note" style={{ margin: 0 }}>
              No sign-up, no email address, no name. Every visitor sees the same
              public pages.
            </p>
          </div>
          <div className="t-fact t-fact--sky o-stack--tight">
            <div className="o-stat__label">Cookies set by us</div>
            <div className="t-fact__value" style={{ fontSize: "3.4rem" }}>
              0
            </div>
            <p className="t-fact__note" style={{ margin: 0 }}>
              No cookie, no localStorage, no sessionStorage of our own — so
              there is nothing to delete.
            </p>
          </div>
          <div className="t-fact t-fact--clay o-stack--tight">
            <div className="o-stat__label">Bytes of your input uploaded</div>
            <div className="t-fact__value" style={{ fontSize: "3.4rem" }}>
              0
            </div>
            <p className="t-fact__note" style={{ margin: 0 }}>
              Weights, temperatures, generated passwords and pasted JSON stay in
              the page and vanish on reload.
            </p>
          </div>
        </div>
      </Container>

      <Container as="section" className="o-section">
        <div className="o-grid o-grid--sidebar">
          <div className="o-stack t-copy">
            <div className="t-privacy">
              <LockIcon />
              <p className="o-text" style={{ margin: 0 }}>
                <span className="o-strong">
                  Nothing you type into a {SITE_NAME} tool leaves your browser.
                </span>{" "}
                There is no upload, no file picker, no URL fetch and no API call
                behind any of the tools. Disconnect your network after the page
                has loaded and every tool still works.
              </p>
            </div>

            <SectionHeading id="what-we-collect">
              What this site collects about you
            </SectionHeading>
            <p className="o-text">
              Nothing. {SITE_NAME} collects, stores and transmits no personal
              data of its own. There are no accounts and no sign-in, so there is
              no profile, no password and no email address on our side. No page
              on this site presents a registration form, a login box or a field
              asking who you are.
            </p>
            <p className="o-text">
              Because we keep nothing between visits, we also cannot recognise
              you when you come back. The site opens with empty fields, no
              recent tools and no remembered units every single time.
            </p>

            <SectionHeading id="what-you-type">
              What happens to what you type
            </SectionHeading>
            <p className="o-text">
              Every tool runs entirely in your browser. A weight or temperature
              you convert, the length and character options you choose in the
              password generator, the password it produces and the JSON you
              paste in to be beautified are all held in the memory of the open
              page only. They are used to compute a result, that result is shown
              to you as plain text, and both are gone the moment you reload or
              close the tab. What you type is{" "}
              <span className="o-strong">never sent to a server</span>, and
              nothing is written to your device — no cookie, no localStorage, no
              sessionStorage, no downloaded file you did not ask for.
            </p>
            <p className="o-text">
              This matters most for the JSON formatter, where people often paste
              an API response containing their own or their customers&rsquo;
              data. That document is parsed by your browser&rsquo;s built-in
              JSON reader and is never sent to us, never written to storage and
              never included in anything we measure.
            </p>

            <SectionHeading id="analytics">Analytics</SectionHeading>
            <p className="o-text">
              We would like to know how many people use each tool, so we use{" "}
              <span className="o-strong">Google Analytics 4</span>. It is
              switched off until you say otherwise: a consent banner appears at
              the bottom of the page, and the Google Analytics script loads{" "}
              <span className="o-strong">only after you accept</span> on that
              banner. It sets its own cookies at that point, and a page view is
              recorded.
            </p>
            <p className="o-text">
              What is recorded is page views and nothing else: which page was
              opened, its title and where you arrived from, plus Google&rsquo;s
              standard automatic fields. Never any part of what you typed or
              what a tool produced — not a weight, not a temperature, not a
              generated password, not pasted JSON, not a search term typed into
              the tool list. There are no custom events carrying your content,
              no user ID and no cross-site tracking.
            </p>
            <div className="t-block o-stack--tight">
              <span className="o-small o-strong">
                If you accept, this is the whole of what is sent to Google
                Analytics:
              </span>
              <p
                className="o-mono o-small"
                style={{ margin: 0, lineHeight: 1.9, overflowWrap: "anywhere" }}
              >
                page_path: {examplePath}
                <br />
                page_title: {exampleTitle}
                <br />
                referrer: https://www.google.com/
                <br />
                plus Google&rsquo;s standard automatic fields
              </p>
            </div>

            <SectionHeading id="advertising">Advertising</SectionHeading>
            <p className="o-text">
              {SITE_NAME} is free, and we may in future place display
              advertising from <span className="o-strong">Google AdSense</span>{" "}
              in the reserved space below a tool. AdSense sets its own cookies
              when it runs. It is not enabled today — the space is reserved in
              the page layout, but no ad script runs on this site at all. When
              that changes it will be covered by the same consent banner, and
              this page will be updated before it goes live.
            </p>

            <SectionHeading id="if-you-decline">If you decline</SectionHeading>
            <p className="o-text">
              If you press Decline, or simply ignore the banner and carry on,
              nothing is loaded from Google, no cookie is set and no page view
              is recorded. Every tool then works in exactly the same way: same
              features, same speed, nothing hidden behind accepting. The same is
              true if an ad-blocker blocks Google&rsquo;s domains for you —
              every tool on this site still loads and works normally.
            </p>

            <SectionHeading id="cookies">Cookies</SectionHeading>
            <p className="o-text">
              {SITE_NAME} sets no cookies of its own, for any purpose — not for
              sessions, not for preferences, not for measurement. The only
              cookies that can ever exist for this site are Google&rsquo;s, set
              by Google Analytics after you accept, and Google&rsquo;s AdSense
              cookies if advertising is ever switched on. They are kept under
              Google&rsquo;s own retention, not ours, and clearing your
              browser&rsquo;s cookies for this site removes them.
            </p>
            <p className="o-text">
              Your answer to the banner is held in the memory of the page for
              that browsing session only. We never write it down, which is why
              the banner appears again on your next visit or after a reload.
              There is no separate cookie policy — cookies are covered here.
            </p>

            <SectionHeading id="third-parties">
              Third parties, in full
            </SectionHeading>
            <p className="o-text">
              The two services in the table below are the only third parties
              this site may ever load. Adding another one requires this page to
              be updated first, so the list you are reading is the list that can
              run.
            </p>

            <SectionHeading id="hosting">Hosting and logs</SectionHeading>
            <p className="o-text">
              The site is a set of static files served over HTTPS by Vercel. We
              run no application of our own anywhere, so we write no logs at
              all. Vercel keeps standard access logs — an IP address and the
              page requested — under its own retention; we do not read them in
              normal operation, and nothing you type into a tool can appear in
              them, because it never leaves your browser to begin with.
            </p>

            <SectionHeading id="your-rights">Your rights</SectionHeading>
            <p className="o-text">
              We hold no personal data about you, so there is no record for us
              to show you, correct or erase. If you accepted analytics and want
              the page-view data Google holds disassociated from your browser,
              clearing your browser&rsquo;s cookies for this site does it. If
              you would rather no analytics existed in the first place, press
              Decline — everything keeps working.
            </p>

            <SectionHeading id="changes">Changes to this policy</SectionHeading>
            <p className="o-text">
              This page carries a last updated date at the top — currently{" "}
              {lastUpdated} — and is revised whenever a new third-party script
              is added to the site or the way we measure traffic changes. The
              list of third parties above is revised in the same change.
            </p>

            <SectionHeading id="contact">Contact</SectionHeading>
            <p className="o-text">
              Questions about any of this go to one email address, read by the
              person who runs the site:{" "}
              <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>. There is no contact
              form here on purpose — a form would need a server to receive it,
              and this site has none. {SITE_NAME} is run by {OPERATOR_NAME}; the{" "}
              <Link href="/about">About &amp; contact</Link> page says more
              about who that is.
            </p>
          </div>

          <aside className="o-stack">
            <nav className="o-card o-stack--tight" aria-label="On this page">
              <div className="o-card__header">On this page</div>
              {POLICY_SECTIONS.map((section) => (
                <a className="o-small" href={`#${section.id}`} key={section.id}>
                  {section.title}
                </a>
              ))}
            </nav>

            <div className="o-card o-stack">
              <div className="o-card__header">Questions about privacy?</div>
              <p className="o-small o-muted" style={{ margin: 0 }}>
                One email address, answered by the person who runs the site.
                There is no contact form here on purpose — a form would need a
                server to receive it.
              </p>
              <a
                className="o-btn o-btn--primary o-btn--block"
                href={CONTACT_MAILTO}
                style={{ overflowWrap: "anywhere" }}
              >
                <MailIcon /> {CONTACT_EMAIL}
              </a>
              <hr className="o-divider" />
              <p className="o-small o-muted" style={{ margin: 0 }}>
                Run by {OPERATOR_NAME}. More on the{" "}
                <Link href="/about">About &amp; contact</Link> page.
              </p>
            </div>
          </aside>
        </div>
      </Container>

      <Container as="section">
        <div className="o-card o-card--tight">
          <table className="o-table">
            <caption className="o-sr-only">
              Every third-party service this site may load, what it is for, when
              it loads and whether it sets cookies
            </caption>
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">What it is for</th>
                <th scope="col">When it loads</th>
                <th scope="col">Cookies</th>
              </tr>
            </thead>
            <tbody>
              <ThirdPartyRow
                service="Google Analytics 4"
                detail="Google Ireland Ltd"
                purpose="Counting page views, so we know which tools are worth keeping."
                loads={
                  <span className="o-badge o-badge--warning">
                    Only after Accept
                  </span>
                }
                cookies="Yes — set by Google, under Google's retention"
              />
              <ThirdPartyRow
                service="Google AdSense"
                detail="Display advertising"
                purpose="Ads in the reserved space below a tool, to keep the site free."
                loads={<span className="o-badge">Not enabled yet</span>}
                cookies="Yes, once enabled — set by Google"
              />
              <ThirdPartyRow
                service="Everything else"
                detail="Tool code, fonts and styles"
                purpose={`Served from ${SITE_NAME} itself — nothing is fetched from another origin.`}
                loads={<span className="o-badge o-badge--success">Always</span>}
                cookies="None"
              />
            </tbody>
          </table>
        </div>
        <p className="o-small o-muted" style={{ margin: "10px 2px 0" }}>
          With an ad-blocker blocking Google&rsquo;s domains, every tool on this
          site still loads and works normally.
        </p>
      </Container>

      {/*
        What the consent banner says, described rather than demonstrated. The
        banner itself is built by its own ticket and lives at the foot of every
        page; a copy of its buttons here would be two controls that consent to
        nothing, so this section quotes its wording instead.
      */}
      <Container as="section" className="o-section">
        <div className="o-card o-stack">
          <div className="o-spread" style={{ alignItems: "flex-start" }}>
            <div className="o-stack--tight">
              <span className="o-eyebrow">
                Shown at the bottom of every page, every visit
              </span>
              <h2 className="o-h3" style={{ margin: 0 }}>
                What the cookie banner asks
              </h2>
            </div>
            <span className="o-badge o-badge--primary">
              Tools work either way
            </span>
          </div>
          <p className="o-text" style={{ maxWidth: "66ch", margin: 0 }}>
            &ldquo;We would like to load Google Analytics to count page views.
            It sets cookies. Nothing you type into a tool is ever included.
            Decline and the site behaves exactly the same.&rdquo;
          </p>
          <div className="o-row">
            <span className="o-badge o-badge--success">Accept analytics</span>
            <span className="o-badge">Decline</span>
          </div>
          <span className="o-small o-muted">
            Both choices are the same size and equally reachable with the Tab
            and Enter keys. Your answer is never written to a cookie, so the
            banner returns on your next visit.
          </span>
        </div>
      </Container>

      <Container as="section" className="o-section">
        <div className="o-stack">
          <h2 className="o-h2" style={{ margin: 0 }}>
            Back to the tools
          </h2>
          <div className="o-grid o-grid--4">
            {tools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
