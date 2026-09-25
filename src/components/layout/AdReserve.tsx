import { cx } from "@/lib/classNames";

/**
 * The space an advert will one day occupy, held open and empty.
 *
 * The block is reserved now, before there is anything to put in it, for one
 * reason: layout stability. `.t-reserve` gives it a fixed minimum height in the
 * theme, so the day an ad unit is dropped in here the rest of the page does not
 * jump down the screen, and every tool page already leaves the same gap in the
 * same place.
 *
 * It is deliberately empty — no ad script, no network request, no "advertisement"
 * placeholder text — so a visitor sees nothing at all and no third party is
 * contacted. Loading the AdSense unit into it belongs to the advertising pass
 * (REQ-12), which also settles its final height and placement.
 */
export function AdReserve({ className }: { className?: string }) {
  return (
    <div
      className={cx("t-reserve", className)}
      aria-hidden="true"
      data-ad-slot="reserved"
    />
  );
}

export default AdReserve;
