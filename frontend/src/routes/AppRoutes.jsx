import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import session from '../utils/session';
import useTrialStatus from '../hooks/useTrialStatus';
import useMaintenanceStatus from '../hooks/useMaintenanceStatus';

// Layout
import Navbar from '../components/Navbar/Navbar';
import Sidebar from '../components/Sidebar/Sidebar';
import TrialPlanModal from '../components/TrialPlanModal/TrialPlanModal';
import TrialExpiredOverlay from '../components/TrialExpiredOverlay/TrialExpiredOverlay';
import MaintenanceOverlay from '../components/MaintenanceOverlay/MaintenanceOverlay';
import PlanUpgradeModal from '../components/PlanUpgradeModal/PlanUpgradeModal';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { GOLD_ONLY_PAGES } from '../hooks/useTrialStatus';

// Public Pages
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';

// Private Pages
import Dashboard from '../pages/Dashboard';
import Projects from '../pages/Projects';
import Event from '../pages/Event';
import Team from '../pages/Team';
import Services from '../pages/Services';
import Quotations from '../pages/Quotations';
import Billing from '../pages/Billing';
import Chat from '../pages/Chat';
import Settings from '../pages/Settings';
import Policy from '../pages/Policy';
import Payment from '../pages/Payment';
import Note from '../pages/Note';

// Admin Pages
import AdminLayout from '../pages/Admin/AdminLayout';
import AdminDashboard from '../pages/Admin/Dashboard';
import UserManagement from '../pages/Admin/UserManagement';
import PlanManagement from '../pages/Admin/PlanManagement';
import PlanSettings from '../pages/Admin/PlanSettings';
import Analytics from '../pages/Admin/Analytics';
import Security from '../pages/Admin/Security';
import SuperAdminManagement from '../pages/Admin/SuperAdminManagement';
import Announcements from '../pages/Admin/Announcements';
import Maintenance from '../pages/Admin/Maintenance';

// Private Route Component - Requires authentication
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  // Fallback to session storage if Redux state is not loaded
  const hasAuth = isAuthenticated || (!!session.getToken() && !!session.getUser());
  
  if (!hasAuth) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Admin Route Component - Requires admin or superadmin role
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  // Fallback to session storage
  const hasAuth = isAuthenticated || (!!session.getToken() && !!session.getUser());
  const currentUser = user || session.getUser();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  
  if (!hasAuth) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Super Admin Route Component - Requires superadmin role
const SuperAdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  // Fallback to session storage
  const hasAuth = isAuthenticated || (!!session.getToken() && !!session.getUser());
  const currentUser = user || session.getUser();
  const isSuperAdmin = currentUser?.role === 'superadmin';
  
  if (!hasAuth) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  return children;
};

// Public Route Component - Redirects to dashboard if already authenticated
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  // Fallback to session storage
  const hasAuth = isAuthenticated || (!!session.getToken() && !!session.getUser());
  
  if (hasAuth) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Gold Plan Route Component - Requires Gold plan for access
const GoldPlanRoute = ({ children, featureName }) => {
  const trialStatus = useTrialStatus();
  const [showUpgradeModal, setShowUpgradeModal] = useState(true);

  // If user has Gold plan, allow access
  if (trialStatus.isGoldPlan) {
    return children;
  }

  // Show upgrade modal for non-Gold users
  return (
    <>
      <div className="restricted-page-placeholder">
        <PlanUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            // Redirect to dashboard when modal is closed
            window.location.href = '/dashboard';
          }}
          featureName={featureName}
          currentPlan={trialStatus.planTier}
        />
      </div>
    </>
  );
};

// Layout for authenticated pages
const AuthenticatedLayout = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const trialStatus = useTrialStatus();
  const maintenanceStatus = useMaintenanceStatus();
  const [showTrialModal, setShowTrialModal] = useState(false);

  // Check if current page is the payment page
  const isPaymentPage = location.pathname === '/payment';

  useEffect(() => {
    // Determine if we should show the trial modal
    // It shows for users on 'free' or 'none' plan who haven't dismissed it this session
    const userPlan = String(user?.plan || 'free').toLowerCase();
    const hasPaidPlan = userPlan === 'silver' || userPlan === 'gold';
    const wasShown = sessionStorage.getItem('trial_modal_shown');

    if (!hasPaidPlan && !wasShown && !trialStatus.isExpired) {
      setShowTrialModal(true);
    }
  }, [user, trialStatus.isExpired]);

  const handleCloseModal = () => {
    setShowTrialModal(false);
    sessionStorage.setItem('trial_modal_shown', 'true');
  };

  // Calculate days expired
  const daysExpired = trialStatus.isExpired ? trialStatus.daysUsed - 15 : 0;

  return (
    <div className="app-layout">
      <AnnouncementBanner />
      <Navbar />
      <div className="app-body">
        <Sidebar />
        <main className="app-content">{children}</main>
      </div>

      {/* Show trial modal for active trial users */}
      <TrialPlanModal
        isOpen={showTrialModal}
        onClose={handleCloseModal}
        createdAt={user?.createdAt}
        currentPlan={user?.plan}
      />

      {/* Show blocking overlay when trial expired (except on payment page) */}
      <TrialExpiredOverlay 
        isVisible={trialStatus.isExpired && !trialStatus.hasPaidPlan && !isPaymentPage}
        daysExpired={daysExpired}
      />

      {/* Show maintenance overlay when user is affected by maintenance mode */}
      <MaintenanceOverlay
        isVisible={maintenanceStatus.isAffected && !maintenanceStatus.loading}
        title={maintenanceStatus.title}
        message={maintenanceStatus.message}
        estimatedEndTime={maintenanceStatus.estimatedEndTime}
      />
    </div>
  );
};

// Root redirect component - handles initial routing based on auth state
const RootRedirect = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const hasAuth = isAuthenticated || (!!session.getToken() && !!session.getUser());
  
  return <Navigate to={hasAuth ? "/dashboard" : "/login"} replace />;
};

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />


        {/* Private Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <Dashboard />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <Projects />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/events"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <Event />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/team"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <Team />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/services"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <Services />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/quotations"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <GoldPlanRoute featureName="Quotations">
                  <Quotations />
                </GoldPlanRoute>
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <GoldPlanRoute featureName="Billing">
                  <Billing />
                </GoldPlanRoute>
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/payment"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <Payment />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <Chat />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <Settings />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/policy"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <GoldPlanRoute featureName="Policy">
                  <Policy />
                </GoldPlanRoute>
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/notes"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <Note />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="plans" element={<PlanManagement />} />
          <Route path="plan-settings" element={<PlanSettings />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="security" element={<Security />} />
          <Route 
            path="super-admin" 
            element={
              <SuperAdminRoute>
                <SuperAdminManagement />
              </SuperAdminRoute>
            } 
          />
        </Route>

        {/* Redirect root to dashboard or login based on auth state */}
        <Route path="/" element={<RootRedirect />} />

        {/* 404 fallback - redirect to login if not authenticated */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
