import { Link, useLocation } from "react-router-dom";
import { LogOut, Menu, Moon, Sun, UserRound } from "lucide-react";
import { navigation } from "./navigation";
import { useAuth } from "@/lib/AuthContext";

export default function Topbar({ theme, onThemeChange, onOpenMenu }) {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const title =
    navigation
      .filter(
        (item) =>
          item.path === pathname ||
          (item.path !== "/" && pathname.startsWith(`${item.path}/`)),
      )
      .sort((a, b) => b.path.length - a.path.length)[0]?.label || "Dashboard";
  return (
    <header className="agency-topbar sticky top-0 z-20 flex h-[72px] items-center justify-between px-5 sm:px-8 lg:px-12">
      <div className="flex min-w-0 items-center gap-3 text-[13px] font-medium">
        <button
          className="-ml-2 rounded-xl p-2 text-agency-muted hover:text-agency-primary lg:hidden"
          aria-label="Open menu"
          onClick={onOpenMenu}
        >
          <Menu size={21} />
        </button>
        <span className="hidden text-agency-muted sm:inline">Workspace</span>
        <span className="hidden text-agency-muted/50 sm:inline">/</span>
        <span className="truncate text-agency-primary">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden max-w-48 truncate text-xs text-agency-muted md:inline">
          {user?.email}
        </span>
        <Link
          to="/account"
          className="agency-icon-button flex h-9 w-9 items-center justify-center rounded-[10px]"
          aria-label="Account settings"
          title="Account settings"
        >
          <UserRound size={18} strokeWidth={1.8} />
        </Link>
        <button
          className="agency-icon-button flex h-9 w-9 items-center justify-center rounded-[10px]"
          onClick={onThemeChange}
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? (
            <Sun size={18} strokeWidth={1.8} />
          ) : (
            <Moon size={18} strokeWidth={1.8} />
          )}
        </button>
        <button
          className="agency-icon-button flex h-9 w-9 items-center justify-center rounded-[10px]"
          onClick={() => logout(true)}
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={18} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
