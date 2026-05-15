import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar }  from '@/components/layout/Navbar';
import { getAlertCounts } from '@/api/alerts';

// Map route paths to page titles
const TITLES = {
  '/dashboard':        'Dashboard',
  '/sales':            'Sales',
  '/products':         'Products',
  '/categories':       'Categories',
  '/customers':        'Customers',
  '/branches':         'Branches',
  '/analytics':        'Analytics',
  '/forecasting':      'Forecasting',
  '/recommendations':  'Recommendations',
  '/alerts':           'Alerts',
  '/reports':          'Reports',
  '/profile':          'Profile',
  '/settings':         'Settings',
};

const SIDEBAR_KEY = 'salesiq_sidebar_collapsed';

export function DashboardLayout() {
  const location = useLocation();

  // Persist collapsed state in localStorage
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SIDEBAR_KEY)) ?? false; }
    catch { return false; }
  });

  const handleToggle = () => {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(SIDEBAR_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Poll active alert count for the bell badge (every 60 s)
  const { data: alertData } = useQuery({
    queryKey:  ['alert-counts'],
    queryFn:   getAlertCounts,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const alertCount = alertData?.total ?? 0;

  const pageTitle =
    TITLES[location.pathname] ??
    location.pathname.slice(1).replace(/\//g, ' › ');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        alertCount={alertCount}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          title={pageTitle}
          alertCount={alertCount}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
