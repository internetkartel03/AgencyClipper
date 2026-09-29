import { NavLink } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { navigation } from "./navigation";
import { useAuth } from "@/lib/AuthContext";

export default function Sidebar({
  collapsed,
  onCollapse,
  mobileOpen,
  onClose,
}) {
  const { user } = useAuth();
  const visibleNavigation = navigation.filter(
    (item) => !item.adminOnly || user?.role === "admin",
  );
  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/65 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`agency-sidebar fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden transition-[width,transform] duration-300 ease-out ${collapsed ? "lg:w-[72px]" : "lg:w-[260px]"} w-[260px] ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div
          className={`flex h-[72px] shrink-0 items-center ${collapsed ? "lg:justify-center" : ""} justify-between px-5 lg:px-4`}
        >
          <NavLink
            to="/"
            onClick={onClose}
            className="flex min-w-0 items-center gap-3"
            aria-label="Agency Admin home"
          >
            <span className="brand-mark flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[16px] font-semibold tracking-[-.07em] text-white">
              A<span className="text-[#64D2FF]">.</span>
            </span>
            {!collapsed && (
              <span className="hidden whitespace-nowrap text-[15px] font-semibold tracking-[-.02em] text-agency-primary lg:block">
                Agency Admin
              </span>
            )}
            <span className="whitespace-nowrap text-[15px] font-semibold tracking-[-.02em] text-agency-primary lg:hidden">
              Agency Admin
            </span>
          </NavLink>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="text-[#86868b] lg:hidden"
          >
            <X size={19} />
          </button>
        </div>
        <div className="mx-5 h-px bg-white/[.08]" />
        <nav
          aria-label="Main navigation"
          className="min-h-0 flex-1 overflow-y-auto px-3 py-6 agency-scrollbar"
        >
          <div className="space-y-1">
            {visibleNavigation.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                onClick={onClose}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `agency-nav-link group flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-all duration-200 ${isActive ? "agency-nav-active" : ""}`
                }
              >
                <Icon size={19} strokeWidth={1.8} className="shrink-0" />
                <span
                  className={`${collapsed ? "lg:hidden" : ""} whitespace-nowrap`}
                >
                  {label}
                </span>
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="hidden border-t border-white/[.08] p-3 lg:block">
          <button
            onClick={onCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="agency-nav-link flex h-11 w-full items-center gap-3 rounded-xl px-3 transition-colors"
          >
            {collapsed ? (
              <PanelLeftOpen size={19} strokeWidth={1.8} />
            ) : (
              <PanelLeftClose size={19} strokeWidth={1.8} />
            )}
            {!collapsed && (
              <span className="whitespace-nowrap text-[13px] font-medium">
                Collapse sidebar
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
