import Link from "next/link";

/** The padlock the approved design draws beside the notice. */
function LockIcon() {
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
    >
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/**
 * The wording, fixed here as constants rather than written into the JSX, so
 * there is exactly one copy of the claim on the whole site and a change to it
 * is a change to one file (REQ-9).
 *
 * It is deliberately specific rather than promotional, and it says both halves
 * of the truth: what stays on the device (everything typed into the tool) and
 * what the site itself does collect (page analytics after consent, and
 * advertising, both of which set cookies). Saying only the first half would
 * read as a promise the third-party scripts break.
 */
const NOTICE_CLAIM =
  "Everything you type into this tool stays in your browser.";
const NOTICE_DETAIL =
  "It is worked out on your own device and is never sent to a server — no " +
  "uploads, no accounts, nothing stored. The site itself does use anonymous " +
  "page analytics (only if you accept) and advertising, which set their own " +
  "cookies.";
const POLICY_LINK_LABEL = "How we handle data";

/**
 * The promise that nothing a visitor types leaves their device (REQ-9).
 *
 * Rendered by {@link file://./ToolPageTemplate.tsx} on every tool page rather
 * than by each tool, so no tool can ship without it and the wording cannot
 * drift from one page to the next. **It takes no props on purpose.** There is
 * no `hidden`, no `variant`, no registry field and no configuration that lets
 * an individual tool suppress or soften it; the template renders it
 * unconditionally, between the page heading and the tool itself, so a visitor
 * reads it before touching a control.
 *
 * It is plain text in the server-rendered HTML — never an image — so it is
 * indexable, selectable, and read out by assistive technology in the order it
 * appears.
 */
export function PrivacyNotice() {
  return (
    <div className="t-privacy">
      <LockIcon />
      <p className="o-text" style={{ margin: 0 }}>
        <span className="o-strong">{NOTICE_CLAIM}</span> {NOTICE_DETAIL}{" "}
        <Link href="/privacy">{POLICY_LINK_LABEL}</Link>
      </p>
    </div>
  );
}

export default PrivacyNotice;
