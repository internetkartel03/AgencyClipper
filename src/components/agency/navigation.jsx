import { LayoutDashboard, Wallet, UsersRound, CalendarDays, ContactRound, Lightbulb, Images, ChartNoAxesCombined, UserRoundCog, ClipboardCheck, Settings } from 'lucide-react';

export const navigation = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Money', path: '/money', icon: Wallet, adminOnly: true },
  { label: 'Clients', path: '/clients', icon: UsersRound },
  { label: 'Calendar', path: '/calendar', icon: CalendarDays, adminOnly: true },
  { label: 'Leads', path: '/leads', icon: ContactRound, adminOnly: true },
  { label: 'Ideation', path: '/ideation', icon: Lightbulb },
  { label: 'Thumbnails', path: '/thumbnails', icon: Images },
  { label: 'Analytics', path: '/analytics', icon: ChartNoAxesCombined },
  { label: 'Team', path: '/team', icon: UserRoundCog, adminOnly: true },
  { label: 'Onboarding', path: '/onboarding', icon: ClipboardCheck, adminOnly: true },
  { label: 'Settings', path: '/settings', icon: Settings, adminOnly: true },
];
