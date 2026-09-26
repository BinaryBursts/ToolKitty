import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode, SVGProps } from "react";

import { ToolCard } from "@/components/home/ToolCard";
import { Container } from "@/components/layout/Container";
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO,
  OPERATOR_NAME,
  SITE_NAME,
} from "@/config/site";
import { absoluteUrl } from "@/lib/urls";
import { getToolListings } from "@/tools/registry";

/**
 * The About/contact page (REQ-10), written as the approved "About & contact"
 * screen draws it: what {@link SITE_NAME} is, who runs it, and the single email
 * address to reach them.
 *
 * Three rules this page is held to, all from REQ-10:
 *
 * 1. **One address, one constant.** The email shown here is the same string the
 *    privacy policy shows, because both read `CONTACT_EMAIL` from
 *    `src/config/site.ts`. Typing an address into either page would let the two
 *    drift apart, which is exactly the failure a visitor cannot detect.
 * 2. **No contact form.** The site is a static export with no server to receive
 *    one, so contact is a `mailto:` link and nothing else. The page's test
 *    asserts the rendered markup holds no `form`, `input`, `textarea` or
 *    `select`.
 * 3. **The numbers come from the registry.** "Four small tools" is counted from
 *    the tool registry rather than typed in, so adding a fifth tool cannot
 *    leave this page claiming there are four.
 *
 * It is a server component with no client boundary: everything on it is
 * committed copy, so the whole page is rendered into `out/about.html` at build
 * time and reads the same with JavaScript switched off.
 *
 * One deliberate departure from the approved screen: it draws a reserved
 * advertising block at the foot of this page, and there is none here. The
 * owner settled it as tool pages only, which is also what the privacy policy
 * already tells visitors — advertising appears "in the reserved space below a
 * tool". Reserving space on an information page would have made the policy
 * wrong the day ads were switched on. `AdReserve` therefore stays where
 * `ToolPageTemplate` renders it, and nowhere else.
 */

export const metadata: Metadata = {
  // `title.absolute` because the root layout carries a `%s · ToolKitty`
  // template and this title already ends in the site name.
  title: { absolute: `About ${SITE_NAME}` },
  description: `What ${SITE_NAME} is, who runs it, and the one email address to reach them — no accounts, no uploads, nothing sent to a server.`,
  alternates: { canonical: absoluteUrl("/about") },
};

/**
 * Small counts spelled out, for the two sentences that name how many tools
 * there are. Anything past the list falls back to the digits, which reads
 * badly but is never wrong.
 */
const NUMBER_WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
] as const;

/**
 * `4` → `"four"`, for use inside a sentence. Not exported: a route file's
 * exports are part of its contract with Next, so the helper stays local and is
 * checked through what the page renders.
 */
const numberInWords = (count: number): string =>
  NUMBER_WORDS[count] ?? String(count);

function AboutIcon({ children, ...rest }: SVGProps<SVGSVGElement>) {
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

/** An envelope, beside the one contact address. */
function MailIcon() {
  return (
    <AboutIcon width="16" height="16">
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </AboutIcon>
  );
}

/** The padlock beside the privacy line, drawn as the site draws it elsewhere. */
function LockIcon() {
  return (
    <AboutIcon>
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </AboutIcon>
  );
}

/** The arrow the approved screen draws inside the "Browse all" button. */
function ArrowIcon() {
  return (
    <AboutIcon width="16" height="16">
      <path d="M5 12h13m0 0-4.5-4.5M18 12l-4.5 4.5" />
    </AboutIcon>
  );
}

/** One line of the "what this site keeps" list in the hero panel. */
function PromiseRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div className="o-spread o-small">
        <span className="o-muted">{label}</span>
        <span className="o-strong">{value}</span>
      </div>
      <hr className="o-divider" />
    </>
  );
}

/** A question and its answer, in the section's plain-copy column. */
function Faq({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}) {
  return (
    <div className="t-faq">
      <div className="t-faq__q">{question}</div>
      <p className="o-text o-muted" style={{ margin: 0 }}>
        {children}
      </p>
    </div>
  );
}

export default function AboutPage() {
  const tools = getToolListings();
  const toolCount = numberInWords(tools.length);

  return (
    <>
      <Container as="section" className="o-section">
        <div
          className="o-grid o-grid--sidebar"
          style={{ alignItems: "center" }}
        >
          <div className="o-stack">
            <nav className="o-row o-small o-muted" aria-label="Breadcrumb">
              <Link href="/">All tools</Link>
              <span aria-hidden="true">›</span>
              <span>About</span>
            </nav>
            <span className="o-eyebrow">About {SITE_NAME}</span>
            <h1 className="o-display" style={{ margin: 0 }}>
              {toolCount.charAt(0).toUpperCase() + toolCount.slice(1)} small
              tools that never phone home.
            </h1>
            <p className="o-lead" style={{ margin: 0 }}>
              {SITE_NAME} is a handful of everyday utilities — weight,
              temperature, passwords, JSON — built to open instantly, work
              without an account and forget you the moment you close the tab.
            </p>
            <div className="o-row">
              <a
                className="o-btn o-btn--primary o-btn--lg"
                href={CONTACT_MAILTO}
                style={{ overflowWrap: "anywhere" }}
              >
                <MailIcon /> {CONTACT_EMAIL}
              </a>
              <Link className="o-btn o-btn--secondary o-btn--lg" href="/">
                Browse the tools
              </Link>
            </div>
            <p className="o-small o-muted" style={{ margin: 0 }}>
              One email address, read by the people who run the site. There is
              no contact form — a form would need a server, and {SITE_NAME} does
              not have one.
            </p>
          </div>

          <div className="t-device">
            <div className="o-stack">
              <span className="t-readout__label">
                Data leaving your browser
              </span>
              <div className="t-readout">
                <div className="t-readout__value">0</div>
                <span className="t-readout__unit">
                  bytes, on every one of the {toolCount} tools
                </span>
              </div>
              <div className="o-stack--tight">
                <PromiseRow label="Accounts" value="None" />
                <PromiseRow
                  label={`Cookies set by ${SITE_NAME}`}
                  value="None"
                />
                <PromiseRow label="Remembered between visits" value="Nothing" />
                <div className="o-spread o-small">
                  <span className="o-muted">Analytics</span>
                  <span className="o-strong">Only if you accept</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <Container as="section" className="o-section">
        <div className="o-grid o-grid--sidebar">
          <div className="o-stack t-copy">
            <h2 className="o-h2" style={{ margin: 0 }}>
              What this site is
            </h2>
            <p className="o-text">
              {SITE_NAME} collects the small calculations and clean-ups people
              reach for a few times a week and gives each one its own page: a
              weight converter across nine units, a temperature converter for
              Celsius, Fahrenheit and Kelvin, a password generator, and a JSON
              beautifier. Every one of them is a single page that does one job,
              loads in a moment and works the same on a phone as on a desktop.
            </p>
            <p className="o-text">
              The rule behind all of them is that the work happens on your
              device. When you type a weight or paste a block of JSON, nothing
              is uploaded, queued or logged — the calculation runs in the page
              you already have open, which is why the tools keep working with
              the network disconnected. There are no accounts to create, no
              history to clear and no settings to manage.
            </p>
            <p className="o-text">
              The site is deliberately plain: no mascot, no newsletter, no
              pop-ups asking you to sign up. More tools will be added over time,
              one page at a time, at web addresses that will not change once
              published.
            </p>

            <Faq question={`Who runs ${SITE_NAME}?`}>
              It is built and maintained by {OPERATOR_NAME}, a small in-house
              development team — the same people who add each new tool. Email
              goes to that team directly; there is nobody else in between.
            </Faq>
            <Faq question="Is it free, and how is it paid for?">
              Free, with no limits and no paid tier. Display advertising may be
              switched on below the tool on each page to cover hosting; it never
              sits inside a tool or between you and a result.
            </Faq>
            <Faq question="Can I suggest a tool?">
              Yes — email the address above and say what you find yourself doing
              by hand. Suggestions are read, though not every one gets built.
            </Faq>
            <Faq question="Something is wrong with a result. What now?">
              Send the numbers or the text you put in and what you expected
              back. Since nothing is logged, that description is the only way to
              see what you saw.
            </Faq>
          </div>

          <aside className="o-stack">
            <div className="o-card o-stack">
              <div className="o-card__header">Contact</div>
              <div className="o-stack--tight">
                <span className="o-small o-muted">
                  Email — general, bug reports and privacy questions
                </span>
                <a
                  className="o-h3 o-mono"
                  href={CONTACT_MAILTO}
                  style={{ overflowWrap: "anywhere" }}
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
              <p className="o-small o-muted" style={{ margin: 0 }}>
                Replies usually within a few days. No phone line, no live chat,
                no form.
              </p>
              <hr className="o-divider" />
              <p className="o-small o-muted" style={{ margin: 0 }}>
                Asking about data, analytics, advertising or cookies? The{" "}
                <Link href="/privacy">privacy policy</Link> answers most of it
                in detail, and lists the same address.
              </p>
            </div>

            <div className="t-fact t-fact--mint o-stack--tight">
              <div className="t-fact__value">
                {tools.length} tools, 1 promise
              </div>
              <p className="t-fact__note" style={{ margin: 0 }}>
                Whatever you type into a {SITE_NAME} page stays on your device.
                That is the whole product, and it is not going to change.
              </p>
            </div>
          </aside>
        </div>
      </Container>

      <Container as="section" className="o-section">
        <div className="o-stack">
          <div className="o-spread">
            <h2 className="o-h2" style={{ margin: 0 }}>
              The {toolCount} tools today
            </h2>
            <Link className="o-btn o-btn--secondary o-btn--sm" href="/">
              Browse all <ArrowIcon />
            </Link>
          </div>
          <div className="o-grid o-grid--4">
            {tools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </div>
      </Container>

      <Container as="section" className="o-section">
        <div className="t-privacy" style={{ maxWidth: "none" }}>
          <LockIcon />
          <p className="o-text" style={{ margin: 0 }}>
            <span className="o-strong">
              Nothing you type into a {SITE_NAME} tool leaves your browser.
            </span>{" "}
            The site sets no cookies of its own and remembers nothing between
            visits. Anonymous page analytics load only if you accept on the
            cookie banner, and the tools work exactly the same if you decline.{" "}
            <Link href="/privacy">Read the privacy policy</Link>
          </p>
        </div>
      </Container>
    </>
  );
}
