import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User, ChevronDown, Settings, LogOut, Menu } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/hooks/useAuth';

/**
 * Top navbar.
 *
 * @param {string}   title         — current page title
 * @param {number}   alertCount    — badge count on the bell icon
 * @param {function} onMenuToggle  — called when the hamburger is clicked (mobile)
 */
export function Navbar({ title, alertCount = 0, onMenuToggle }) {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const [open, setOpen]   = useState(false);
  const dropdownRef       = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handle(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username ?? 'User';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 sm:hidden"
          >
            <Menu size={20} />
          </button>
        )}
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      {/* Right: alerts bell + user menu */}
      <div className="flex items-center gap-2">
        {/* Alert bell */}
        <button
          onClick={() => navigate('/alerts')}
          title="Alerts"
          className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Bell size={20} />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {displayName[0]?.toUpperCase()}
            </div>
            <span className="hidden sm:block max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown
              size={14}
              className={clsx(
                'text-gray-400 transition-transform duration-150',
                open && 'rotate-180',
              )}
            />
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg z-20">
              <div className="border-b border-gray-100 px-4 py-2">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-gray-400 capitalize">
                  {user?.role}
                </p>
              </div>

              <MenuItem
                icon={User}
                label="Profile"
                onClick={() => { setOpen(false); navigate('/profile'); }}
              />
              <MenuItem
                icon={Settings}
                label="Settings"
                onClick={() => { setOpen(false); navigate('/settings'); }}
              />
              <div className="my-1 border-t border-gray-100" />
              <MenuItem
                icon={LogOut}
                label="Logout"
                onClick={handleLogout}
                danger
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors',
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-gray-700 hover:bg-gray-50',
      )}
    >
      <Icon size={15} className="shrink-0" />
      {label}
    </button>
  );
}
