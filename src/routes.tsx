import { lazy } from 'react';
import type { ComponentType } from 'react';

// Lazy load pages for optimal performance
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const QuotationsPage = lazy(() => import('./pages/QuotationsPage'));
const QuotationViewPage = lazy(() => import('./pages/QuotationViewPage'));
const DeviceDetailsPage = lazy(() => import('./pages/DeviceDetailsPage'));
const PriceHistoryPage = lazy(() => import('./components/smart-home/PriceHistoryPage'));
const PriceApprovalPage = lazy(() => import('./pages/PriceApprovalPage'));
const PriceUpdateTestPage = lazy(() => import('./pages/PriceUpdateTestPage'));
const DatabaseHealthCheckPage = lazy(() => import('./pages/DatabaseHealthCheckPage'));

interface RouteConfig {
  name: string;
  path: string;
  component: ComponentType;
  visible?: boolean;
  protected?: boolean;
  requireAdmin?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: 'Smart Home Automation',
    path: '/',
    component: HomePage,
    protected: true,
  },
  {
    name: 'Device Details',
    path: '/device/:id',
    component: DeviceDetailsPage,
    visible: false,
    protected: true,
  },
  {
    name: 'Quotations',
    path: '/quotations',
    component: QuotationsPage,
    visible: false,
    protected: true,
  },
  {
    name: 'Quotation View',
    path: '/quotation/:id',
    component: QuotationViewPage,
    visible: false,
    protected: true,
  },
  {
    name: 'Price History',
    path: '/price-history/:devicePriceId',
    component: PriceHistoryPage,
    visible: false,
    protected: true,
  },
  {
    name: 'Price Approvals',
    path: '/price-approvals',
    component: PriceApprovalPage,
    visible: false,
    protected: true,
    requireAdmin: true,
  },
  {
    name: 'Price Update Test',
    path: '/price-update-test',
    component: PriceUpdateTestPage,
    visible: false,
    protected: true,
    requireAdmin: true,
  },
  {
    name: 'Database Health Check',
    path: '/database-health',
    component: DatabaseHealthCheckPage,
    visible: false,
    protected: true,
    requireAdmin: true,
  },
  {
    name: 'Admin',
    path: '/admin',
    component: AdminPage,
    visible: false,
    protected: true,
    requireAdmin: true,
  },
  {
    name: 'Login',
    path: '/login',
    component: LoginPage,
    visible: false,
  },
  {
    name: 'Signup',
    path: '/signup',
    component: SignupPage,
    visible: false,
  },
  {
    name: 'Auth Callback',
    path: '/auth/callback',
    component: AuthCallbackPage,
    visible: false,
  },
];

export default routes;
