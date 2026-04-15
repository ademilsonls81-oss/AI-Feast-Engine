import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import SystemDashboard from "./pages/SystemDashboard";
import SystemErrors from "./pages/admin/SystemErrors";
import AutoFixes from "./pages/admin/AutoFixes";
import Docs from "./pages/Docs";
import PublicFeed from "./pages/PublicFeed";
import Skills from "./pages/Skills";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Status from "./pages/Status";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <ErrorBoundary context="root">
          <Routes>
            <Route path="/" element={
              <ErrorBoundary context="Landing"><Landing /></ErrorBoundary>
            } />
            <Route path="/feed" element={
              <ErrorBoundary context="PublicFeed"><PublicFeed /></ErrorBoundary>
            } />
            <Route path="/skills" element={
              <ErrorBoundary context="Skills"><Skills /></ErrorBoundary>
            } />
            <Route path="/dashboard" element={
              <ErrorBoundary context="Dashboard"><Dashboard /></ErrorBoundary>
            } />
            <Route path="/admin" element={
              <ErrorBoundary context="Admin"><Admin /></ErrorBoundary>
            } />
            <Route path="/admin/system" element={
              <ErrorBoundary context="SystemDashboard"><SystemDashboard /></ErrorBoundary>
            } />
            <Route path="/admin/system-errors" element={
              <ErrorBoundary context="SystemErrors"><SystemErrors /></ErrorBoundary>
            } />
            <Route path="/admin/auto-fixes" element={
              <ErrorBoundary context="AutoFixes"><AutoFixes /></ErrorBoundary>
            } />
            <Route path="/docs" element={<Docs />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/status" element={
              <ErrorBoundary context="Status"><Status /></ErrorBoundary>
            } />
          </Routes>
        </ErrorBoundary>
      </Layout>
    </BrowserRouter>
  );
}
