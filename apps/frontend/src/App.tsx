import { Route, Routes } from "react-router-dom";

import { Shell } from "./components";
import { BenchmarkPage } from "./pages/BenchmarkPage";
import { InvestigationDetailPage } from "./pages/InvestigationDetailPage";
import { InvestigationsPage } from "./pages/InvestigationsPage";
import { StatusPage } from "./pages/StatusPage";

export function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<InvestigationsPage />} />
        <Route path="/investigations/:id" element={<InvestigationDetailPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/benchmark" element={<BenchmarkPage />} />
      </Routes>
    </Shell>
  );
}
