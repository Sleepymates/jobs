import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import HomePage from './pages/HomePage';
import PostJobPage from './pages/PostJobPage';
import ApplyPage from './pages/ApplyPage';
import DashboardPage from './pages/DashboardPage';
import ForgotPasscodePage from './pages/ForgotPasscodePage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import JobsListPage from './pages/JobsListPage';
import DemoPage from './pages/DemoPage';
import BulkAnalysisPage from './pages/BulkAnalysisPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import CheckoutCancelPage from './pages/CheckoutCancelPage';
import TokenPurchaseSuccessPage from './pages/TokenPurchaseSuccessPage';
import TokenPurchaseCancelPage from './pages/TokenPurchaseCancelPage';
import TokenPurchasePage from './pages/TokenPurchasePage';

// Enhanced component to handle scroll to top on route changes
function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // Always scroll to top immediately when pathname changes
    window.scrollTo(0, 0);
  }, [pathname]);

  // Also handle search parameter changes (but not hash changes for same-page navigation)
  useEffect(() => {
    if (search && !search.includes('scrollTo=')) {
      window.scrollTo(0, 0);
    }
  }, [search]);

  return null;
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/post" element={<PostJobPage />} />
          <Route path="/bulk-analysis" element={<BulkAnalysisPage />} />
          <Route path="/:jobSlug" element={<ApplyPage />} />
          <Route path="/dashboard" element={<Navigate to="/forgot" replace />} />
          <Route path="/dashboard/:jobId" element={<DashboardPage />} />
          <Route path="/forgot" element={<ForgotPasscodePage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/jobs" element={<JobsListPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
          <Route path="/token-purchase-success" element={<TokenPurchaseSuccessPage />} />
          <Route path="/token-purchase-cancel" element={<TokenPurchaseCancelPage />} />
          <Route path="/token-purchase" element={<TokenPurchasePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;