import { Route, Routes } from "react-router-dom";

import { Shell } from "./components";
import { TooltipProvider } from "./components/ui/tooltip";
import { BenchmarkPage } from "./pages/BenchmarkPage";
import { InvestigationDetailPage } from "./pages/InvestigationDetailPage";
import { InvestigationsPage } from "./pages/InvestigationsPage";
import { PipelinePage } from "./pages/PipelinePage";
import { StatusPage } from "./pages/StatusPage";

export function App() {
  return (
    <TooltipProvider delayDuration={180}>
      <Shell>
        <div className="route-fade">
          <Routes>
            <Route path="/" element={<InvestigationsPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/investigations/:id" element={<InvestigationDetailPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/benchmark" element={<BenchmarkPage />} />
          </Routes>
        </div>
      </Shell>
    </TooltipProvider>
  );
}
