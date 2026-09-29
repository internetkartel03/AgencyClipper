import { LayoutDashboard, Wallet, UsersRound, CalendarDays, ContactRound, Lightbulb, Images, ChartNoAxesCombined, UserRoundCog, ClipboardCheck, Settings } from 'lucide-react';

export const navigation = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Money', path: '/money', icon: Wallet },
  { label: 'Clients', path: '/clients', icon: UsersRound },
  { label: 'Calendar', path: '/calendar', icon: CalendarDays },
  { label: 'Leads', path: '/leads', icon: ContactRound },
  { label: 'Ideation', path: '/ideation', icon: Lightbulb },
  { label: 'Thumbnails', path: '/thumbnails', icon: Images },
  { label: 'Analytics', path: '/analytics', icon: ChartNoAxesCombined },
  { label: 'Team', path: '/team', icon: UserRoundCog },
  { label: 'Onboarding', path: '/onboarding', icon: ClipboardCheck },
  { label: 'Settings', path: '/settings', icon: Settings },
];