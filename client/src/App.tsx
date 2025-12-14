import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { QuoteBasketProvider } from "@/lib/quote-basket";
import { AdminLayout } from "@/components/layout/admin-layout";
import { CookieConsentBanner } from "@/components/cookie-consent";

import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ProductsPage from "@/pages/products";
import BrandsPage from "@/pages/brands";
import ContactPage from "@/pages/contact";
import HowToOrderPage from "@/pages/how-to-order";
import QuotePage from "@/pages/quote";
import MyQuotesPage from "@/pages/my-quotes";
import QuoteDetailPage from "@/pages/quote-detail";
import SupplierRegistrationPage from "@/pages/supplier-registration";
import DashboardPage from "@/pages/dashboard";
import PrivacyPolicyPage from "@/pages/privacy";
import TermsOfServicePage from "@/pages/terms";
import CookiePolicyPage from "@/pages/cookies";
import DistributionNetworkPage from "@/pages/distribution-network";

import AdminDashboard from "@/pages/admin/index";
import AdminUsersPage from "@/pages/admin/users";
import AdminProductsPage from "@/pages/admin/products";
import AdminBrandsPage from "@/pages/admin/brands";
import AdminCategoriesPage from "@/pages/admin/categories";
import AdminQuotesPage from "@/pages/admin/quotes";
import AdminImportPage from "@/pages/admin/import";
import AdminSuppliersPage from "@/pages/admin/suppliers";
import AdminMessagesPage from "@/pages/admin/messages";
import AdminCmsPage from "@/pages/admin/cms";
import AdminSettingsPage from "@/pages/admin/settings";
import AdminChatLeadsPage from "@/pages/admin/chat-leads";
import AdminHeroSlidesPage from "@/pages/admin/hero-slides";
import AdminFeaturedBrandsPage from "@/pages/admin/featured-brands";
import AdminHomepagePage from "@/pages/admin/homepage";
import AdminFooterContentPage from "@/pages/admin/footer-content";
import AdminCompanyLocationsPage from "@/pages/admin/company-locations";
import AdminStaffPage from "@/pages/admin/staff";
import AdminAnalyticsPage from "@/pages/admin/analytics";

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!isAdmin) {
    setLocation("/login");
    return null;
  }

  return (
    <AdminLayout>
      <Component />
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/brands" component={BrandsPage} />
      <Route path="/distribution-network" component={DistributionNetworkPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/how-to-order" component={HowToOrderPage} />
      <Route path="/quote" component={QuotePage} />
      <Route path="/my-quotes" component={MyQuotesPage} />
      <Route path="/my-quotes/:id" component={QuoteDetailPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/supplier-registration" component={SupplierRegistrationPage} />
      <Route path="/privacy" component={PrivacyPolicyPage} />
      <Route path="/terms" component={TermsOfServicePage} />
      <Route path="/cookies" component={CookiePolicyPage} />
      
      <Route path="/admin">{() => <AdminRoute component={AdminDashboard} />}</Route>
      <Route path="/admin/users">{() => <AdminRoute component={AdminUsersPage} />}</Route>
      <Route path="/admin/staff">{() => <AdminRoute component={AdminStaffPage} />}</Route>
      <Route path="/admin/analytics">{() => <AdminRoute component={AdminAnalyticsPage} />}</Route>
      <Route path="/admin/products">{() => <AdminRoute component={AdminProductsPage} />}</Route>
      <Route path="/admin/brands">{() => <AdminRoute component={AdminBrandsPage} />}</Route>
      <Route path="/admin/categories">{() => <AdminRoute component={AdminCategoriesPage} />}</Route>
      <Route path="/admin/quotes">{() => <AdminRoute component={AdminQuotesPage} />}</Route>
      <Route path="/admin/import">{() => <AdminRoute component={AdminImportPage} />}</Route>
      <Route path="/admin/suppliers">{() => <AdminRoute component={AdminSuppliersPage} />}</Route>
      <Route path="/admin/messages">{() => <AdminRoute component={AdminMessagesPage} />}</Route>
      <Route path="/admin/chat-leads">{() => <AdminRoute component={AdminChatLeadsPage} />}</Route>
      <Route path="/admin/cms">{() => <AdminRoute component={AdminCmsPage} />}</Route>
      <Route path="/admin/settings">{() => <AdminRoute component={AdminSettingsPage} />}</Route>
      <Route path="/admin/hero-slides">{() => <AdminRoute component={AdminHeroSlidesPage} />}</Route>
      <Route path="/admin/featured-brands">{() => <AdminRoute component={AdminFeaturedBrandsPage} />}</Route>
      <Route path="/admin/homepage">{() => <AdminRoute component={AdminHomepagePage} />}</Route>
      <Route path="/admin/footer-content">{() => <AdminRoute component={AdminFooterContentPage} />}</Route>
      <Route path="/admin/company-locations">{() => <AdminRoute component={AdminCompanyLocationsPage} />}</Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <QuoteBasketProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <CookieConsentBanner />
          </TooltipProvider>
        </QuoteBasketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
