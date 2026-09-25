import { Container } from "@/components/layout/Container";
import { getAllTools } from "@/tools/registry";

export type HeroProps = {
  /**
   * How many tools the eyebrow claims. Defaults to the registry, so the line
   * cannot go stale when a tool is added.
   */
  toolCount?: number;
};

/** The three things the site does not do, as the approved screen draws them. */
const FACTS = [
  {
    value: "0 cookies",
    note: "ToolKitty sets none of its own, and stores nothing in your browser between visits.",
    tone: "t-fact--mint",
  },
  {
    value: "0 uploads",
    note: "Your numbers, passwords and pasted JSON stay on this device.",
    tone: "t-fact--sky",
  },
  {
    value: "0 accounts",
    note: "Open a tool and use it. There is nothing to sign up for.",
    tone: "t-fact--clay",
  },
] as const;

/**
 * The homepage's opening: what ToolKitty is, in as few words as it takes, and
 * the promise the whole site rests on — the work happens in the visitor's
 * browser and nothing they type is sent anywhere (REQ-4).
 *
 * The copy is written by hand rather than assembled from the registry: only
 * the tool count is read from it. The search box the approved screen draws
 * below the lead is a separate piece of work (TKT-9) and is added here then.
 */
export function Hero({ toolCount = getAllTools().length }: HeroProps) {
  return (
    <Container as="section" className="o-section">
      <div className="o-grid o-grid--sidebar" style={{ alignItems: "center" }}>
        <div className="o-stack">
          <span className="o-eyebrow">
            {toolCount} {toolCount === 1 ? "tool" : "tools"} · nothing leaves
            your browser
          </span>
          <h1 className="o-display">
            Small tools that run on your side of the wire.
          </h1>
          <p className="o-lead">
            Convert a weight, check a temperature, make a password, tidy up
            some JSON. Every tool here does its work inside this tab — no
            account, no upload, and nothing kept once you close it.
          </p>
          <p className="o-text" style={{ maxWidth: "60ch" }}>
            Every tool runs in your browser, so nothing you type is sent
            anywhere: the calculation happens on your device, and pulling the
            network out mid-use changes nothing.
          </p>
        </div>

        <div className="t-device o-stack">
          <div className="t-device__head" style={{ marginBottom: 0 }}>
            <span className="o-eyebrow">What that means</span>
          </div>
          {FACTS.map((fact) => (
            <div
              className={`t-fact ${fact.tone} o-stack--tight`}
              key={fact.value}
            >
              <div className="t-fact__value">{fact.value}</div>
              <p className="t-fact__note" style={{ margin: 0 }}>
                {fact.note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}

export default Hero;
