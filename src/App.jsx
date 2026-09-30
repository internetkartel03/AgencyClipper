import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AgencyShell from "@/components/agency/AgencyShell";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Money from "@/pages/Money";
import Ideation from "@/pages/Ideation";
import Dashboard from "@/pages/Dashboard";
import CalendarPage from "@/pages/Calendar";
import Leads from "@/pages/Leads";
import Thumbnails from "@/pages/Thumbnails";
import Analytics from "@/pages/Analytics";
import Team from "@/pages/Team";
import Onboarding from "@/pages/Onboarding";
import Settings from "@/pages/Settings";
import Account from "@/pages/Account";
import "@/components/agency/agency.css";

const routeTitles = {
  "/": "Dashboard",
  "/login": "Login",
  "/register": "Create account",
  "/forgot-password": "Reset password",
  "/reset-password": "Choose password",
  "/clients": "Clients",
  "/money": "Money",
  "/calendar": "Calendar",
  "/leads": "Leads",
  "/ideation": "Ideation",
  "/thumbnails": "Thumbnails",
  "/analytics": "Analytics",
  "/team": "Team",
  "/onboarding": "Onboarding",
  "/settings": "Settings",
  "/account": "Account",
};

function DocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const title = pathname.startsWith("/clients/")
      ? "Client"
      : routeTitles[pathname] || "Cut Ledger";
    document.title = title === "Cut Ledger" ? title : `${title} | Cut Ledger`;
  }, [pathname]);
  return null;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        element={
          <ProtectedRoute
            unauthenticatedElement={<Navigate to="/login" replace />}
          />
        }
      >
        <Route element={<AgencyShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/ideation" element={<Ideation />} />
          <Route path="/thumbnails" element={<Thumbnails />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/account" element={<Account />} />
          <Route element={<AdminRoute />}>
            <Route path="/money" element={<Money />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/team" element={<Team />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <DocumentTitle />
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
