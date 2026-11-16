import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { LoadingState, Shell } from "./components";
import { TooltipProvider } from "./components/ui/tooltip";
import { EASE } from "./motion";
import { LandingPage } from "./pages/LandingPage";

const InvestigationsPage = lazy(() => import("./pages/InvestigationsPage").then((m) => ({ default: m.InvestigationsPage })));
const InvestigationDetailPage = lazy(() => import("./pages/InvestigationDetailPage").then((m) => ({ default: m.InvestigationDetailPage })));
const PipelinePage = lazy(() => import("./pages/PipelinePage").then((m) => ({ default: m.PipelinePage })));
const BenchmarkPage = lazy(() => import("./pages/BenchmarkPage").then((m) => ({ default: m.BenchmarkPage })));
const StatusPage = lazy(() => import("./pages/StatusPage").then((m) => ({ default: m.StatusPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const OgPage = lazy(() => import("./pages/OgPage").then((m) => ({ default: m.OgPage })));

function ScrollToTopOnReduce({ reduce }: { reduce: boolean }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (reduce) window.scrollTo(0, 0);
  }, [pathname, reduce]);
  return null;
}

function ShellRoutes() {
  const location = useLocation();
  const reduce = !!useReducedMotion();
  if (location.pathname === "/system") return <Navigate to="/status" replace />;
  return (
    <Shell>
      <ScrollToTopOnReduce reduce={reduce} />
      <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
        <motion.div
          key={location.pathname}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.18, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.12, ease: EASE } }}
        >
          <Suspense fallback={<LoadingState />}>
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/investigations" element={<InvestigationsPage />} />
              <Route path="/investigations/:id" element={<InvestigationDetailPage />} />
              <Route path="/pipeline" element={<PipelinePage />} />
              <Route path="/benchmark" element={<BenchmarkPage />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}

export function App() {
  return (
    <TooltipProvider delayDuration={180}>
      <Routes>
        <Route
          path="/og"
          element={
            <Suspense fallback={<LoadingState />}>
              <OgPage />
            </Suspense>
          }
        />
        <Route path="*" element={<ShellRoutes />} />
      </Routes>
    </TooltipProvider>
  );
}
