/**
 * Stand-in for a tool that has a registry entry but no implementation yet.
 *
 * The registry ships before the tools do (REQ-2: the framework comes first), so
 * each launch tool starts as a component that renders this. Each tool's own
 * ticket replaces its placeholder with the real thing; when the last one lands,
 * this file goes with it.
 */
export function ToolPlaceholder({ toolName }: { toolName: string }) {
  return (
    <p
      role="status"
      className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
    >
      {toolName} is being built and will appear here shortly.
    </p>
  );
}
