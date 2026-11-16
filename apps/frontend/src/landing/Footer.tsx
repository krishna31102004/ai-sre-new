import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";
import { cn, T } from "../components/primitives";

const REPO_URL = "https://github.com/krishna31102004/ai-sre-new";

const LINKS = [
  { to: "/", label: "Overview" },
  { to: "/investigations", label: "Investigations" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/benchmark", label: "Benchmark" },
  { to: "/status", label: "Status" },
];

const linkClass = cn(T.small, "text-ink-2 transition-colors duration-[160ms] hover:text-ink");

export function Footer({ linkedinUrl }: { linkedinUrl: string }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
        <div>
          <p className={cn(T.h3, "flex items-center gap-2")}>
            <Logo size={22} />
            Glassbox SRE
          </p>
          <p className={cn(T.small, "mt-2 text-ink-3")}>
            Built by{" "}
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-2 underline underline-offset-2 transition-colors duration-[160ms] hover:text-ink"
            >
              Krishna Balaji
            </a>
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 md:flex-col md:gap-y-2">
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={`${linkClass} inline-flex min-h-[44px] items-center md:min-h-0`}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:text-right">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkClass} inline-flex min-h-[44px] items-center md:min-h-0`}
          >
            GitHub
          </a>
          <p className={cn(T.small, "mt-2 text-ink-3")}>Demo mode: this site runs on recorded sample data.</p>
        </div>
      </div>
    </footer>
  );
}
