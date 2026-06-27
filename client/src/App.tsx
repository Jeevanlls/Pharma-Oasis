import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { BasketProvider } from "@/lib/basket";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PortalLayout } from "@/components/layout/portal-layout";
import { CookieConsentBanner } from "@/components/cookie-consent";

import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ProductsPage from "@/pages/products";
import BrandsPage from "@/pages/brands";
import ContactPage from "@/pages/contact";
import HowToOrderPage from "@/pages/how-to-order";
import BasketPage from "@/pages/basket";
import MyQuotesPage from "@/pages/my-quotes";
import QuoteDetailPage from "@/pages/quote-detail";
import QuoteDocumentPage from "@/pages/quote-document";
import SupplierRegistrationPage from "@/pages/supplier-registration";
import DashboardPage from "@/pages/dashboard";
import PrivacyPolicyPage from "@/pages/privacy";
import TermsOfServicePage from "@/pages/terms";
import CookiePolicyPage from "@/pages/cookies";
import DistributionNetworkPage from "@/pages/distribution-network";
import BlogPage from "@/pages/blog";
import BlogPostPage from "@/pages/blog-post";
import CompliancePage from "@/pages/compliance";
import PharmaceuticalWholesalersPage from "@/pages/pharmaceutical-wholesalers";
import ProductDetailPage from "@/pages/product-detail";
import OffersPage from "@/pages/offers";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";

import AdminDashboard from "@/pages/admin/index";
import AdminUsersPage from "@/pages/admin/users";
import AdminProductsPage from "@/pages/admin/products";
import AdminBrandsPage from "@/pages/admin/brands";
import AdminCategoriesPage from "@/pages/admin/categories";
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
import AdminSecurityPage from "@/pages/admin/security";
import AdminSalesPage from "@/pages/admin/sales";
import DealWorkspacePage from "@/pages/admin/deal-workspace";
import NewQuotePage from "@/pages/admin/new-quote";
import AdminAnalyticsPage from "@/pages/admin/analytics";
import AdminSeoPage from "@/pages/admin/seo";
import AdminGooglePricingPage from "@/pages/admin/google-pricing";
import AdminAiCategoriesPage from "@/pages/admin/ai-categories";
import AdminSeoAgentPage from "@/pages/admin/seo-agent";
import AdminBlogPage from "@/pages/admin/blog";
import AdminProductRotationPage from "@/pages/admin/product-rotation";
import AdminOffersPage from "@/pages/admin/offers";
import AdminCostUploadsPage from "@/pages/admin/cost-uploads";
import AdminCurrentCostsPage from "@/pages/admin/current-costs";
import AdminPriceListsPage from "@/pages/admin/price-lists";
import AdminPricingBrandsPage from "@/pages/admin/pricing-brands";
import AdminPricingCategoriesPage from "@/pages/admin/pricing-categories";
import AdminPriceBuilderPage from "@/pages/admin/price-builder";
import AdminAssignmentsPage from "@/pages/admin/assignments";
import AdminPricingGuidePage from "@/pages/admin/pricing-guide";

import PortalCataloguePage from "@/pages/portal/catalogue";
import PortalOrdersPage from "@/pages/portal/orders";
import PortalDownloadsPage from "@/pages/portal/downloads";

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

function PortalRoute({ component: Component }: { component: React.ComponentType }) {
  const { isCustomer, isAdmin, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login?redirect=/portal");
    return null;
  }

  if (!isCustomer && !isAdmin) {
    // Authenticated but not an active customer (e.g. pending approval).
    setLocation("/dashboard");
    return null;
  }

  return (
    <PortalLayout>
      <Component />
    </PortalLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login">{() => <LoginPage />}</Route>
      {/* Private admin/staff sign-in — intentionally NOT linked from the public site. */}
      <Route path="/staff">{() => <LoginPage adminMode />}</Route>
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/products/:idOrSlug" component={ProductDetailPage} />
      <Route path="/brands" component={BrandsPage} />
      <Route path="/distribution-network" component={DistributionNetworkPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/how-to-order" component={HowToOrderPage} />
      <Route path="/basket" component={BasketPage} />
      {/* D2: one shared basket + checkout. Old checkout routes now redirect here. */}
      <Route path="/quote">{() => <Redirect to="/basket" />}</Route>
      <Route path="/my-quotes" component={MyQuotesPage} />
      <Route path="/my-quotes/:id" component={QuoteDetailPage} />
      <Route path="/quotes/:id/print" component={QuoteDocumentPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/supplier-registration" component={SupplierRegistrationPage} />
      <Route path="/privacy" component={PrivacyPolicyPage} />
      <Route path="/terms" component={TermsOfServicePage} />
      <Route path="/cookies" component={CookiePolicyPage} />
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:slug" component={BlogPostPage} />
      <Route path="/compliance" component={CompliancePage} />
      <Route path="/offers" component={OffersPage} />
      <Route path="/pharmaceutical-wholesalers" component={PharmaceuticalWholesalersPage} />
      
      <Route path="/admin">{() => <AdminRoute component={AdminDashboard} />}</Route>
      <Route path="/admin/users">{() => <AdminRoute component={AdminUsersPage} />}</Route>
      <Route path="/admin/staff">{() => <AdminRoute component={AdminStaffPage} />}</Route>
      <Route path="/admin/security">{() => <AdminRoute component={AdminSecurityPage} />}</Route>
      <Route path="/admin/analytics">{() => <AdminRoute component={AdminAnalyticsPage} />}</Route>
      <Route path="/admin/products">{() => <AdminRoute component={AdminProductsPage} />}</Route>
      <Route path="/admin/brands">{() => <AdminRoute component={AdminBrandsPage} />}</Route>
      <Route path="/admin/categories">{() => <AdminRoute component={AdminCategoriesPage} />}</Route>
      <Route path="/admin/sales">{() => <AdminRoute component={AdminSalesPage} />}</Route>
      {/* E4: salesman-initiated quote (before the :kind/:id workspace route). */}
      <Route path="/admin/sales/new-quote">{() => <AdminRoute component={NewQuotePage} />}</Route>
      {/* E1: new Deal Workspace opened from the Sales worklist. The old /admin/quotes
          & /admin/orders pages stay reachable (unlinked) as a fallback until E2
          moves pricing/respond into the workspace, then they're removed. */}
      <Route path="/admin/sales/:kind/:id">{() => <AdminRoute component={DealWorkspacePage} />}</Route>
      {/* E2: old quote/order admin pages retired — everything is the Sales workspace now. */}
      <Route path="/admin/quotes">{() => <Redirect to="/admin/sales" />}</Route>
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
      <Route path="/admin/seo">{() => <AdminRoute component={AdminSeoPage} />}</Route>
      <Route path="/admin/google-pricing">{() => <AdminRoute component={AdminGooglePricingPage} />}</Route>
      <Route path="/admin/ai-categories">{() => <AdminRoute component={AdminAiCategoriesPage} />}</Route>
      <Route path="/admin/seo-agent">{() => <AdminRoute component={AdminSeoAgentPage} />}</Route>
      <Route path="/admin/blog">{() => <AdminRoute component={AdminBlogPage} />}</Route>
      <Route path="/admin/product-rotation">{() => <AdminRoute component={AdminProductRotationPage} />}</Route>
      <Route path="/admin/offers">{() => <AdminRoute component={AdminOffersPage} />}</Route>
      <Route path="/admin/orders">{() => <Redirect to="/admin/sales" />}</Route>
      <Route path="/admin/cost-uploads">{() => <AdminRoute component={AdminCostUploadsPage} />}</Route>
      <Route path="/admin/current-costs">{() => <AdminRoute component={AdminCurrentCostsPage} />}</Route>
      <Route path="/admin/price-lists">{() => <AdminRoute component={AdminPriceListsPage} />}</Route>
      <Route path="/admin/assignments">{() => <AdminRoute component={AdminAssignmentsPage} />}</Route>
      <Route path="/admin/pricing-guide">{() => <AdminRoute component={AdminPricingGuidePage} />}</Route>
      <Route path="/admin/pricing-brands">{() => <AdminRoute component={AdminPricingBrandsPage} />}</Route>
      <Route path="/admin/pricing-categories">{() => <AdminRoute component={AdminPricingCategoriesPage} />}</Route>
      <Route path="/admin/price-builder">{() => <AdminRoute component={AdminPriceBuilderPage} />}</Route>

      <Route path="/portal">{() => <PortalRoute component={PortalCataloguePage} />}</Route>
      {/* D2: portal basket + the duplicate portal quotes list fold into the shared basket / my-quotes. */}
      <Route path="/portal/basket">{() => <Redirect to="/basket" />}</Route>
      <Route path="/portal/quotes">{() => <Redirect to="/my-quotes" />}</Route>
      <Route path="/portal/orders">{() => <PortalRoute component={PortalOrdersPage} />}</Route>
      <Route path="/portal/downloads">{() => <PortalRoute component={PortalDownloadsPage} />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BasketProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <CookieConsentBanner />
          </TooltipProvider>
        </BasketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
