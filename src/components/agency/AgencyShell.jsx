import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AgencyShell() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("agency-sidebar-collapsed") === "true",
  );
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("agency-theme") === "light" ? "light" : "dark",
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [welcome, setWelcome] = useState(
    () => localStorage.getItem("agency-onboarding-complete") !== "true",
  );
  const closeWelcome = () => {
    localStorage.setItem("agency-onboarding-complete", "true");
    setWelcome(false);
  };
  const toggleCollapse = () => {
    setCollapsed((value) => {
      localStorage.setItem("agency-sidebar-collapsed", String(!value));
      return !value;
    });
  };
  const toggleTheme = () => {
    setTheme((value) => {
      const next = value === "dark" ? "light" : "dark";
      localStorage.setItem("agency-theme", next);
      return next;
    });
  };
  return (
    <div
      className={`agency-app ${theme === "dark" ? "agency-dark" : "agency-light"} min-h-screen`}
    >
      <Sidebar
        collapsed={collapsed}
        onCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div
        className={`min-h-screen transition-[margin] duration-300 ${collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"}`}
      >
        <Topbar
          theme={theme}
          onThemeChange={toggleTheme}
          onOpenMenu={() => setMobileOpen(true)}
        />
        <main className="agency-main relative min-h-[calc(100vh-72px)] overflow-hidden px-5 pb-16 pt-12 sm:px-8 sm:pt-16 lg:px-12 lg:pt-20">
          <div className="agency-orb agency-orb-one" aria-hidden="true" />
          <div className="agency-orb agency-orb-two" aria-hidden="true" />
          <div className="agency-orb agency-orb-three" aria-hidden="true" />
          <div className="relative z-10 mx-auto max-w-[1200px]">
            <Outlet />
          </div>
        </main>
      </div>
      {welcome && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-xl">
          <div className="agency-glass w-full max-w-2xl rounded-[20px] p-7">
            <h2 className="text-3xl font-semibold text-agency-primary">
              Welcome to Cut Ledger
            </h2>
            <p className="mt-2 text-agency-muted">
              Connect services in this recommended order. The app remains usable
              while integrations are unavailable.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["Built-in AI", "Required"],
                ["Cloudflare thumbnails", "Connected separately"],
                ["YouTube Data API", "Recommended"],
                ["Discord bot", "Optional automation"],
                ["Notion", "Optional"],
              ].map(([name, label]) => (
                <div key={name} className="rounded-xl bg-white/[.04] p-4">
                  <p className="font-medium text-agency-primary">{name}</p>
                  <p className="mt-1 text-xs text-agency-muted">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="agency-button-secondary"
                onClick={closeWelcome}
              >
                Skip for now
              </button>
              <a
                className="agency-button-primary"
                href="/settings?guide=AI_PROVIDER"
                onClick={closeWelcome}
              >
                Get started
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
