import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  FileText,
  Link as LinkIcon,
  ShieldCheck,
  Building2,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Search Events',
    href: '/search',
    icon: Search,
  },
  {
    name: 'Hash Chain',
    href: '/chain',
    icon: LinkIcon,
  },
];

const verification = [
  {
    name: 'Merkle Proofs',
    href: '/search?view=proofs',
    icon: ShieldCheck,
  },
  {
    name: 'Certificates',
    href: '/search?view=certificates',
    icon: FileText,
  },
];

const resources = [
  {
    name: 'Certified Entities',
    href: '/entities',
    icon: Building2,
  },
  {
    name: 'System Status',
    href: '/status',
    icon: Activity,
  },
];

interface NavItemProps {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
}

function NavItem({ name, href, icon: Icon }: NavItemProps) {
  return (
    <NavLink
      to={href}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
          isActive
            ? 'bg-vcp-600/20 text-white border-l-2 border-vcp-400'
            : 'text-vcp-400 hover:text-white hover:bg-vcp-800/50'
        )
      }
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1">{name}</span>
      <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-vcp-900/50 backdrop-blur-sm border-r border-vcp-800/50 overflow-y-auto custom-scrollbar">
      <nav className="p-4 space-y-6">
        {/* Main Navigation */}
        <div>
          <h3 className="px-3 mb-2 text-xs font-semibold text-vcp-500 uppercase tracking-wider">
            Navigation
          </h3>
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavItem key={item.name} {...item} />
            ))}
          </div>
        </div>

        {/* Verification */}
        <div>
          <h3 className="px-3 mb-2 text-xs font-semibold text-vcp-500 uppercase tracking-wider">
            Verification
          </h3>
          <div className="space-y-1">
            {verification.map((item) => (
              <NavItem key={item.name} {...item} />
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <h3 className="px-3 mb-2 text-xs font-semibold text-vcp-500 uppercase tracking-wider">
            Resources
          </h3>
          <div className="space-y-1">
            {resources.map((item) => (
              <NavItem key={item.name} {...item} />
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 mx-3 p-4 bg-vcp-800/30 rounded-lg border border-vcp-700/30">
          <h4 className="text-xs font-semibold text-vcp-400 uppercase tracking-wider mb-3">
            Network Stats
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-vcp-500">Total Events</span>
              <span className="text-sm font-mono text-white">12,160,243</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-vcp-500">Active Nodes</span>
              <span className="text-sm font-mono text-white">42</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-vcp-500">Last Anchor</span>
              <span className="text-sm font-mono text-verify-400">5m ago</span>
            </div>
          </div>
        </div>

        {/* VCP Version Badge */}
        <div className="mx-3 p-3 bg-gradient-to-br from-vcp-600/20 to-verify-600/10 rounded-lg border border-vcp-600/20">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-verify-500 rounded-full" />
            <span className="text-xs font-semibold text-white">VCP v1.0</span>
          </div>
          <p className="text-xs text-vcp-400">
            RFC 6962 Compliant · SHA-256 · Ed25519
          </p>
        </div>
      </nav>
    </aside>
  );
}
