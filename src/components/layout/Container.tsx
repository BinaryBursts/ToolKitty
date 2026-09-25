import type { ComponentPropsWithoutRef, ReactNode } from "react";

/** Elements a container is allowed to render as. */
type ContainerElement = "div" | "section" | "header" | "footer" | "nav" | "ul";

type ContainerProps = {
  /** Element to render. Defaults to a plain `div`. */
  as?: ContainerElement;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"div">, "className" | "children">;

/**
 * The one place the page's maximum width and side gutters are decided.
 *
 * Every page section wraps its content in a `<Container>` so the header, the
 * main content and the footer line up down the page, and so a 320 px viewport
 * never scrolls sideways: the width is fluid and the gutters shrink with it
 * (see `.o-container` in globals.css).
 */
export function Container({
  as: Element = "div",
  className,
  children,
  ...rest
}: ContainerProps) {
  const classes = className ? `o-container ${className}` : "o-container";

  return (
    <Element className={classes} {...rest}>
      {children}
    </Element>
  );
}

export default Container;
