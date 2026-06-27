import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { CoachPage } from './pages/CoachPage';
import { DashboardPage } from './pages/DashboardPage';
import { BidangDetailPage } from './pages/BidangDetailPage';
import { TestDashboardDirect } from './pages/TestDashboardDirect';
import { MinimalTest } from './pages/MinimalTest';
import { PDFTestPage } from './pages/PDFTestPage';
import { CanaryOptInPage } from './pages/CanaryOptInPage';
import { MetricsPage } from './pages/MetricsPage';
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/ui/Toast';
import { CacheDebugger } from './components/dev/CacheDebugger';
import { RouteBanner } from './components/dev/RouteBanner';
import { CanaryAutoEnroll } from './components/CanaryAutoEnroll';

function App() {
  const { user, role, loading } = useAuth();
  
  // ⏱️ Track navigation timing
  React.useEffect(() => {
    const handleRouteChange = () => {
      const currentPath = window.location.pathname;
      console.log(`🔀 [NAVIGATION] Route changed to: ${currentPath} at ${performance.now().toFixed(2)}ms`);
    };
    
    // Listen to popstate (back/forward button)
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <CanaryAutoEnroll user={user} />
      <Routes>
        {/* Minimal Test - Basic React Rendering Check */}
        <Route path="/minimal" element={<MinimalTest />} />
        
        {/* Public Test Route - Direct Dashboard Access (No Auth Required) */}
        <Route path="/test" element={<TestDashboardDirect />} />
        
        {/* PDF Test Page - Test PDF Download Feature */}
        <Route path="/pdf-test" element={<PDFTestPage />} />

  {/* Canary opt-in page - allow testers to switch routing */}
  <Route path="/canary" element={<CanaryOptInPage />} />

        {/* Public route - redirect ke home jika sudah login */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={role === 'coach' ? '/coach/' : `/${user.uid}`} replace />
            ) : (
              <LoginPage />
            )
          }
        />

        {/* Coach route - Public with password protection inside */}
        <Route
          path="/coach"
          element={
            <>
              <CoachPage />
            </>
          }
        />

        <Route
          path="/metrics"
          element={
            <ProtectedRoute requiredRole="coach">
              <MetricsPage />
            </ProtectedRoute>
          }
        />

        {/* Test Dashboard - New Bento Grid Design */}
        <Route
          path="/test-dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Member Dashboard - Main Overview */}
        <Route
          path="/:slug"
          element={
            <ProtectedRoute>
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Member Detail Pages - Each Bidang with Bento Grid */}
        <Route
          path="/:slug/:bidang"
          element={
            <ProtectedRoute>
              <MainLayout>
                <BidangDetailPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Root redirect */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to={role === 'coach' ? '/coach/' : `/${user.uid}`} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 404 - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      
      {/* Toast Notifications */}
      <ToastProvider />
      
      {/* Cache Debugger (Dev Tool) - Press Ctrl+Shift+C */}
      <CacheDebugger />

      {/* API routing indicator for canary checks */}
      <RouteBanner />
    </BrowserRouter>
  );
}

export default App;
