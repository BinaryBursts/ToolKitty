"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { InlineMessage } from "@/components/ui/InlineMessage";

type ToolErrorBoundaryProps = {
  /** Display name of the tool, so the message says which one failed. */
  toolName: string;
  children: ReactNode;
};

type ToolErrorBoundaryState = { readonly failed: boolean };

/**
 * Catches an error thrown by a tool and puts a short message where the tool
 * was, leaving the rest of the page — heading, privacy notice, supporting copy,
 * the other tools — standing.
 *
 * There is no server here to fall back to and no error to report anywhere: if a
 * tool throws in the browser, React unmounts the whole tree above it unless
 * something catches it, and the visitor is left with a blank page and no way
 * back to the other tools. This is that something. It is only reached by a
 * failure after hydration; a tool that throws while the page is being generated
 * fails the build instead, which is the right place to find out.
 *
 * Error boundaries have to be class components — there is still no hook for
 * this — and have to run on the client, hence the directive above.
 */
export class ToolErrorBoundary extends Component<
  ToolErrorBoundaryProps,
  ToolErrorBoundaryState
> {
  override state: ToolErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ToolErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Nothing is sent anywhere (REQ-1): the only report is to the console of
    // the person who can see it, which is how a bug gets reported at all.
    console.error(
      `[ToolKitty] ${this.props.toolName} threw while rendering.`,
      error,
      info.componentStack,
    );
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <InlineMessage variant="error" title="This tool hit a problem">
        {this.props.toolName} stopped working in your browser. Reload the page
        to start it again — nothing you typed was sent anywhere, and nothing was
        saved.
      </InlineMessage>
    );
  }
}

export default ToolErrorBoundary;
