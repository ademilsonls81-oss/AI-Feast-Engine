import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import SystemDashboard from "./pages/SystemDashboard";
import Docs from "./pages/Docs";
import PublicFeed from "./pages/PublicFeed";
import Skills from "./pages/Skills";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Status from "./pages/Status";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/feed" element={<PublicFeed />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/system" element={<SystemDashboard />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/status" element={<Status />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
