import { T, cn } from "../components/primitives";

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
    <section aria-label="Stack" className="mx-auto max-w-[1200px] px-4 py-20 md:px-6 md:py-32">
      <h2 className="sr-only">Stack</h2>
      <ul className="flex flex-wrap justify-center gap-2">
        {STACK.map((item) => (
          <li
            key={item}
            className={cn(T.label, "inline-flex h-[22px] items-center rounded-md bg-white/[0.06] px-2 text-ink-2")}
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
