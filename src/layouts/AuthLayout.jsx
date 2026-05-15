import { TrendingUp } from 'lucide-react';

/**
 * Wrapper for unauthenticated pages (Login, etc.).
 * Two-column on large screens: branded panel left, form right.
 */
export function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-900 p-12">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <TrendingUp size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">SalesIQ</span>
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Intelligent Sales
            <br />
            Analytics Platform
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Real-time KPIs, AI-powered forecasting, and automated recommendations
            — all in one place.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {[
              'Dashboard Analytics',
              'Sales Forecasting',
              'Smart Recommendations',
              'Branch Insights',
              'Automated Alerts',
            ].map((f) => (
              <span
                key={f}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">
          &copy; {new Date().getFullYear()} SalesIQ — Diploma Project
        </p>
      </div>

      {/* Right: form area */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
            <TrendingUp size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">SalesIQ</span>
        </div>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
