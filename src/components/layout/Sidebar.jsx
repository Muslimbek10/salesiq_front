import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Building2, Tag,
  BarChart3, TrendingUp, Lightbulb, Bell, FileText,
  ChevronLeft, ChevronRight, LogOut, TrendingUpIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/hooks/useAuth';

// ── Navigation config ─────────────────────────────────────────────────────────

const SECTIONS = [
  {
    label: 'Main',
    items: [
      { path: '/dashboard',       label: 'Dashboard',       icon: LayoutDashboard },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { path: '/products',        label: 'Products',        icon: Package },
      { path: '/categories',      label: 'Categories',      icon: Tag },
      { path: '/customers',       label: 'Customers',       icon: Users },
      { path: '/branches',        label: 'Branches',        icon: Building2 },
    ],
  },
  {
    label: 'Transactions',
    items: [
      { path: '/sales',           label: 'Sales',           icon: ShoppingCart },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { path: '/analytics',       label: 'Analytics',       icon: BarChart3 },
      { path: '/forecasting',     label: 'Forecasting',     icon: TrendingUp },
      { path: '/recommendations', label: 'Recommendations', icon: Lightbulb },
      { path: '/alerts',          label: 'Alerts',          icon: Bell,      badge: true },
    ],
  },
  {
    label: 'Output',
    items: [
      { path: '/reports',         label: 'Reports',         icon: FileText },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function Sidebar({ collapsed, onToggle, alertCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={clsx(
        'flex flex-col bg-slate-900 text-slate-300 min-h-screen',
        'transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* ── Logo ── */}
      <div
        className={clsx(
          'flex items-center h-16 border-b border-slate-800 shrink-0',
          collapsed ? 'justify-center px-0' : 'gap-3 px-4',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
          <TrendingUpIcon size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-base font-bold text-white tracking-tight">
            SalesIQ
          </span>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 px-2">
        {SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {section.label}
              </p>
            )}
            {section.items.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                collapsed={collapsed}
                alertCount={item.badge ? alertCount : 0}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* ── User + collapse ── */}
      <div className="shrink-0 border-t border-slate-800 p-2 space-y-1">
        {/* User row */}
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg">
            <UserAvatar user={user} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user.first_name
                  ? `${user.first_name} ${user.last_name}`
                  : user.username}
              </p>
              <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
        )}
        {collapsed && user && (
          <div className="flex justify-center py-1">
            <UserAvatar user={user} />
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Logout"
          className={clsx(
            'flex w-full items-center rounded-lg py-2 text-sm text-slate-400',
            'hover:bg-slate-800 hover:text-white transition-colors',
            collapsed ? 'justify-center px-0' : 'gap-3 px-3',
          )}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={clsx(
            'flex w-full items-center rounded-lg py-2 text-sm text-slate-500',
            'hover:bg-slate-800 hover:text-white transition-colors',
            collapsed ? 'justify-center px-0' : 'gap-3 px-3',
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({ item, collapsed, alertCount }) {
  const { icon: Icon, path, label } = item;

  return (
    <NavLink
      to={path}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        clsx(
          'relative flex items-center rounded-lg py-2 text-sm font-medium',
          'transition-colors duration-150 mb-0.5',
          collapsed ? 'justify-center px-0' : 'gap-3 px-3',
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white',
        )
      }
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span>{label}</span>}
      {alertCount > 0 && (
        <span
          className={clsx(
            'flex h-4 min-w-4 items-center justify-center rounded-full',
            'bg-red-500 text-[10px] font-bold text-white px-1',
            collapsed ? 'absolute top-1 right-1' : 'ml-auto',
          )}
        >
          {alertCount > 99 ? '99+' : alertCount}
        </span>
      )}
    </NavLink>
  );
}

// ── UserAvatar ────────────────────────────────────────────────────────────────

function UserAvatar({ user }) {
  const initials = user.first_name
    ? `${user.first_name[0]}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : user.username?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
      {initials}
    </div>
  );
}
