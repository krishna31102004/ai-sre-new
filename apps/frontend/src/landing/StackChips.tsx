const STACK = [
  "Python",
  "FastAPI",
  "Redis",
  "Postgres + pgvector",
  "LangGraph",
  "OpenAI gpt-6-luna",
  "Slack Bolt",
  "Prometheus",
  "OpenTelemetry",
  "React",
];

export function StackChips() {
  return (
    <section aria-label="Stack" className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6 md:pb-24">
      <h2 className="sr-only">Stack</h2>
      <ul className="flex flex-wrap justify-center gap-2">
        {STACK.map((item) => (
          <li
            key={item}
            className="inline-flex h-7 items-center rounded-full border border-white/[0.07] px-3 font-mono text-xs text-ink-2"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
