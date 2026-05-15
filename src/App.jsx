import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider }        from '@tanstack/react-query';

import { AuthProvider }    from '@/contexts/AuthContext';
import { ToastProvider }   from '@/contexts/ToastContext';
import { PrivateRoute }    from '@/components/shared/PrivateRoute';
import { DashboardLayout } from '@/layouts/DashboardLayout';

import Login           from '@/pages/Login';
import Dashboard       from '@/pages/Dashboard';
import Sales           from '@/pages/Sales';
import Products        from '@/pages/Products';
import Categories      from '@/pages/Categories';
import Customers       from '@/pages/Customers';
import Branches        from '@/pages/Branches';
import Analytics       from '@/pages/Analytics';
import Forecasting     from '@/pages/Forecasting';
import Recommendations from '@/pages/Recommendations';
import Alerts          from '@/pages/Alerts';
import Reports         from '@/pages/Reports';
import NotFound        from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:              1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Redirect root → dashboard */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Navigate to="/dashboard" replace />
                  </PrivateRoute>
                }
              />

              {/* Protected: all inside DashboardLayout */}
              <Route
                element={
                  <PrivateRoute>
                    <DashboardLayout />
                  </PrivateRoute>
                }
              >
                <Route path="/dashboard"        element={<Dashboard />} />
                <Route path="/sales"            element={<Sales />} />
                <Route path="/products"         element={<Products />} />
                <Route path="/categories"       element={<Categories />} />
                <Route path="/customers"        element={<Customers />} />
                <Route path="/branches"         element={<Branches />} />
                <Route path="/analytics"        element={<Analytics />} />
                <Route path="/forecasting"      element={<Forecasting />} />
                <Route path="/recommendations"  element={<Recommendations />} />
                <Route path="/alerts"           element={<Alerts />} />
                <Route path="/reports"          element={<Reports />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
