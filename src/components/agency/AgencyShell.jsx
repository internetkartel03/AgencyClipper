import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AgencyShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('agency-sidebar-collapsed') === 'true');
  const [theme, setTheme] = useState(() => localStorage.getItem('agency-theme') === 'light' ? 'light' : 'dark');
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleCollapse = () => { setCollapsed(value => { localStorage.setItem('agency-sidebar-collapsed', String(!value)); return !value; }); };
  const toggleTheme = () => { setTheme(value => { const next = value === 'dark' ? 'light' : 'dark'; localStorage.setItem('agency-theme', next); return next; }); };
  return <div className={`agency-app ${theme === 'dark' ? 'agency-dark' : 'agency-light'} min-h-screen`}>
    <Sidebar collapsed={collapsed} onCollapse={toggleCollapse} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    <div className={`min-h-screen transition-[margin] duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`}>
      <Topbar theme={theme} onThemeChange={toggleTheme} onOpenMenu={() => setMobileOpen(true)} />
      <main className="agency-main relative min-h-[calc(100vh-72px)] overflow-hidden px-5 pb-16 pt-12 sm:px-8 sm:pt-16 lg:px-12 lg:pt-20">
        <div className="agency-orb agency-orb-one" aria-hidden="true"/><div className="agency-orb agency-orb-two" aria-hidden="true"/><div className="agency-orb agency-orb-three" aria-hidden="true"/>
        <div className="relative z-10 mx-auto max-w-[1200px]"><Outlet /></div>
      </main>
    </div>
  </div>;
}