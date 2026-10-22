import { lazy, Suspense } from "react";
const WholesaleBookingCompletePage = lazy(() =>
  import("./pages/student/WholesaleBookingCompletePage").then((m) => ({ default: m.WholesaleBookingCompletePage })),
);
const NoShowApprovePage = lazy(() =>
  import("./pages/student/NoShowApprovePage").then((m) => ({ default: m.NoShowApprovePage })),
);
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { ROUTES, getRoute } from "../config/routes.config";
import { UserRole } from "../types/auth.types";

// Layouts
import { AdminLayout } from "./layouts/AdminLayout";
import { StudentLayout } from "./layouts/StudentLayout";
// Pages
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const SignupPage = lazy(() =>
  import("./pages/SignupPage").then((m) => ({ default: m.SignupPage })),
);
const SignupSuccessPage = lazy(() =>
  import("./pages/SignupSuccessPage").then((m) => ({ default: m.SignupSuccessPage })),
);
const LinkedInCallbackPage = lazy(() =>
  import("./pages/LinkedInCallbackPage").then((m) => ({ default: m.LinkedInCallbackPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })),
);
import { HomePage } from "./pages/HomePage";
const StudentPlacesDetailPage = lazy(() =>
  import("./pages/student/PlacesDetailPage").then((m) => ({ default: m.PlaceDetailPage })),
);
const MyBidsPage = lazy(() =>
  import("./pages/student/MyBidsPage").then((m) => ({ default: m.MyBidsPage })),
);
const AffiliatePortalPage = lazy(() =>
  import("./pages/student/AffiliatePortalPage").then((m) => ({ default: m.AffiliatePortalPage })),
);
const CheckoutPage = lazy(() =>
  import("./pages/student/CheckoutPage").then((m) => ({ default: m.CheckoutPage })),
);
const ProfilePage = lazy(() =>
  import("./pages/student/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const ComingSoonPage = lazy(() =>
  import("./pages/student/ComingSoonPage").then((m) => ({ default: m.ComingSoonPage })),
);
import { Heart, Bookmark, CreditCard, UserPlus, Settings as SettingsIcon } from "lucide-react";
const HotelDashboardPage = lazy(() =>
  import("./pages/hotel/HotelDashboardPage").then((m) => ({ default: m.HotelDashboardPage })),
);
const AdminDashboardPage = lazy(() =>
  import("./pages/admin/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })),
);
const StudentsListPage = lazy(() =>
  import("./pages/admin/StudentsListPage").then((m) => ({ default: m.StudentsListPage })),
);
const StudentDetailPage = lazy(() =>
  import("./pages/admin/StudentDetailPage").then((m) => ({ default: m.StudentDetailPage })),
);
import { NotFoundPage } from "./pages/NotFoundPage";
import { UnauthorizedPage } from "./pages/UnauthorizedPage";
// Components
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RedirectPage } from "./pages/RedirectPage";

// AuthWrapper: redirect to protected base if already authenticated
import { useAppSelector } from "../store/hooks";
const ResubmitPage = lazy(() =>
  import("./pages/ResubmitPage").then((m) => ({ default: m.ResubmitPage })),
);
const PlaceFormPage = lazy(() =>
  import("./pages/admin/PlaceFormPage").then((m) => ({ default: m.PlaceFormPage })),
);
const PlacesListPage = lazy(() =>
  import("./pages/admin/PlacesListPage").then((m) => ({ default: m.PlacesListPage })),
);
const BidsListPage = lazy(() =>
  import("./pages/admin/BidsListPage").then((m) => ({ default: m.BidsListPage })),
);
const DealDeskPage = lazy(() =>
  import("./pages/admin/DealDeskPage").then((m) => ({ default: m.DealDeskPage })),
);
const NewsletterSubscribersPage = lazy(() =>
  import("./pages/admin/NewsletterSubscribersPage").then((m) => ({ default: m.NewsletterSubscribersPage })),
);
const HotelApplicationsPage = lazy(() =>
  import("./pages/admin/HotelApplicationsPage").then((m) => ({ default: m.HotelApplicationsPage })),
);
const ReferralsPage = lazy(() =>
  import("./pages/admin/ReferralsPage").then((m) => ({ default: m.ReferralsPage })),
);
const WishlistTallyPage = lazy(() =>
  import("./pages/admin/WishlistTallyPage").then((m) => ({ default: m.WishlistTallyPage })),
);
const PlaceTestimonialsPage = lazy(() =>
  import("./pages/admin/PlaceTestimonialsPage").then((m) => ({ default: m.PlaceTestimonialsPage })),
);
const PlaceDataPage = lazy(() =>
  import("./pages/admin/PlaceDataPage").then((m) => ({ default: m.PlaceDataPage })),
);
const HotelBidsPage = lazy(() =>
  import("./pages/hotel/HotelBidsListPage").then((m) => ({ default: m.HotelBidsPage })),
);
const HotelPlaceFormPage = lazy(() =>
  import("./pages/hotel/HotelPlaceFormPage").then((m) => ({ default: m.HotelPlaceFormPage })),
);
const HotelSignupPage = lazy(() =>
  import("./pages/hotel/HotelSignupPage").then((m) => ({ default: m.HotelSignupPage })),
);
const HotelPlacesListPage = lazy(() =>
  import("./pages/hotel/HotelPlaceListPage").then((m) => ({ default: m.HotelPlacesListPage })),
);
import { PublicLayout } from "./layouts/PublicLayout";
const TermsPage = lazy(() =>
  import("./pages/legal/TermsPage").then((m) => ({ default: m.TermsPage })),
);
const PrivacyPage = lazy(() =>
  import("./pages/legal/PrivacyPage").then((m) => ({ default: m.PrivacyPage })),
);
const AccessibilityPage = lazy(() =>
  import("./pages/legal/AccessibilityPage").then((m) => ({ default: m.AccessibilityPage })),
);
const ContactPage = lazy(() =>
  import("./pages/ContactPage").then((m) => ({ default: m.ContactPage })),
);
const WaitlistPage = lazy(() =>
  import("./pages/WaitlistPage").then((m) => ({ default: m.WaitlistPage })),
);
const HotelsLandingPage = lazy(() =>
  import("./pages/HotelsLandingPage").then((m) => ({ default: m.HotelsLandingPage })),
);
const ReferralsLandingPage = lazy(() =>
  import("./pages/ReferralsLandingPage").then((m) => ({ default: m.ReferralsLandingPage })),
);
const ReferralSignupPage = lazy(() =>
  import("./pages/ReferralSignupPage").then((m) => ({ default: m.ReferralSignupPage })),
);
const HowDeadlineWorksPage = lazy(() =>
  import("./pages/HowDeadlineWorksPage").then((m) => ({ default: m.HowDeadlineWorksPage })),
);
const HotelsCloudbedsPage = lazy(() =>
  import("./pages/HotelsCloudbedsPage").then((m) => ({ default: m.HotelsCloudbedsPage })),
);
const HotelJoinPage = lazy(() =>
  import("./pages/HotelJoinPage").then((m) => ({ default: m.HotelJoinPage })),
);
import { useDocumentTitle } from "../hooks/useDocumentTitle";

// Auth routes (redirect to protected base if already authenticated)
const authRoutes = [
  { path: ROUTES.LOGIN, element: <LoginPage /> },
  { path: ROUTES.SIGNUP, element: <SignupPage /> },
  { path: ROUTES.HOTEL_SIGNUP, element: <HotelSignupPage /> },
  { path: ROUTES.RESUBMIT, element: <ResubmitPage /> },
  { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
  { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordPage /> },
];

// Public routes (no auth required, no redirect)
const publicRoutes = [
  { path: ROUTES.UNAUTHORIZED, element: <UnauthorizedPage /> },
  { path: ROUTES.REDIRECT, element: <RedirectPage /> },
  { path: ROUTES.SIGNUP_SUCCESS, element: <SignupSuccessPage /> },
  { path: ROUTES.LINKEDIN_CALLBACK, element: <LinkedInCallbackPage /> },
  { path: ROUTES.TERMS, element: <TermsPage /> },
  { path: ROUTES.PRIVACY, element: <PrivacyPage /> },
  { path: ROUTES.ACCESSIBILITY, element: <AccessibilityPage /> },
  { path: ROUTES.CONTACT, element: <ContactPage /> },
  { path: ROUTES.WAITLIST, element: <WaitlistPage /> },
  { path: ROUTES.HOTELS_LANDING, element: <HotelsLandingPage /> },
  { path: ROUTES.REFERRALS_LANDING, element: <ReferralsLandingPage /> },
  { path: ROUTES.REFERRAL_SIGNUP, element: <ReferralSignupPage /> },
  { path: ROUTES.HOW_IT_WORKS, element: <HowDeadlineWorksPage /> },
  { path: ROUTES.HOTELS_JOIN, element: <HotelJoinPage /> },
  { path: ROUTES.HOTELS_CLOUDBEDS, element: <HotelsCloudbedsPage /> },
  // Old /student links (e.g. already-sent booking confirmation emails)
  // redirect to their new /member equivalents.
  { path: ROUTES.LEGACY_STUDENT_MY_BIDS, element: <Navigate to={ROUTES.STUDENT_MY_BIDS} replace /> },
  { path: ROUTES.LEGACY_STUDENT_PROFILE, element: <Navigate to={ROUTES.STUDENT_PROFILE} replace /> },
  { path: ROUTES.LEGACY_STUDENT_CHECKOUT, element: <LegacyCheckoutRedirect /> },
  { path: ROUTES.LEGACY_STUDENT_MARKETPLACE_DETAIL, element: <LegacyMarketplaceRedirect /> },
];

function LegacyCheckoutRedirect() {
  const { bidId } = useParams();
  return <Navigate to={getRoute(ROUTES.STUDENT_CHECKOUT, { bidId: bidId! })} replace />;
}

function LegacyMarketplaceRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/${slug}`} replace />;
}

const publicLayoutRoutes = [
  { path: ROUTES.HOME, element: <HomePage /> },
  {
    path: ROUTES.PUBLIC_PLACE_DETAIL,
    element: <StudentPlacesDetailPage />,
  },
];

// Protected routes (require auth, role-based)
const protectedRoutes = [
  {
    path: "/member",
    allowedRoles: [UserRole.STUDENT],
    element: <StudentLayout />,
    children: [
      { path: ROUTES.STUDENT_MY_BIDS, element: <MyBidsPage /> },
      { path: ROUTES.STUDENT_REFERRALS, element: <AffiliatePortalPage /> },
      { path: ROUTES.STUDENT_CHECKOUT, element: <CheckoutPage /> },
      { path: ROUTES.STUDENT_WHOLESALE_COMPLETE, element: <WholesaleBookingCompletePage /> },
      { path: ROUTES.STUDENT_NO_SHOW, element: <NoShowApprovePage /> },
      { path: ROUTES.STUDENT_PROFILE, element: <ProfilePage /> },
      {
        path: ROUTES.STUDENT_SAVED_HOTELS,
        element: (
          <ComingSoonPage
            title="Saved Hotels"
            description="Bookmark hotels you're eyeing and find them here later."
            icon={Heart}
          />
        ),
      },
      {
        path: ROUTES.STUDENT_WISHLIST,
        element: (
          <ComingSoonPage
            title="Wishlist"
            description="A dedicated view of the destinations you've told us you want to visit next."
            icon={Bookmark}
          />
        ),
      },
      {
        path: ROUTES.STUDENT_PAYMENT_METHODS,
        element: (
          <ComingSoonPage
            title="Payment Methods"
            description="Manage the cards on file for your bookings."
            icon={CreditCard}
          />
        ),
      },
      {
        path: ROUTES.STUDENT_INVITE_FRIENDS,
        element: (
          <ComingSoonPage
            title="Invite Friends"
            description="Your rewards code and sharing tools live on your Profile for now — a dedicated page is on its way."
            icon={UserPlus}
          />
        ),
      },
      {
        path: ROUTES.STUDENT_SETTINGS,
        element: (
          <ComingSoonPage
            title="Settings"
            description="Account and notification settings are coming soon."
            icon={SettingsIcon}
          />
        ),
      },
    ],
  },
  {
    path: "/hotel",
    allowedRoles: [UserRole.HOTEL_OWNER],
    element: <AdminLayout />,
    children: [
      { path: ROUTES.HOTEL_DASHBOARD, element: <HotelDashboardPage /> },
      { path: ROUTES.HOTEL_PLACE, element: <HotelPlaceFormPage /> },
      { path: ROUTES.HOTEL_BIDS, element: <HotelBidsPage /> },
    ],
  },
  {
    path: "/admin",
    allowedRoles: [UserRole.ADMIN],
    element: <AdminLayout />,
    children: [
      { path: ROUTES.ADMIN_DASHBOARD, element: <AdminDashboardPage /> },
      { path: ROUTES.ADMIN_STUDENTS, element: <StudentsListPage /> },
      { path: ROUTES.ADMIN_STUDENT_DETAIL, element: <StudentDetailPage /> },
      { path: ROUTES.ADMIN_PLACES, element: <PlacesListPage /> },
      { path: ROUTES.ADMIN_PLACES_EDIT, element: <PlaceFormPage /> },
      { path: ROUTES.ADMIN_PLACES_NEW, element: <PlaceFormPage /> },
      {
        path: ROUTES.ADMIN_PLACES_TESTIMONIALS,
        element: <PlaceTestimonialsPage />,
      },
      { path: ROUTES.ADMIN_PLACES_DATA, element: <PlaceDataPage /> },
      { path: ROUTES.ADMIN_BIDS, element: <BidsListPage /> },
      { path: ROUTES.ADMIN_DEAL_DESK, element: <DealDeskPage /> },
      { path: ROUTES.ADMIN_NEWSLETTER, element: <NewsletterSubscribersPage /> },
      {
        path: ROUTES.ADMIN_HOTEL_APPLICATIONS,
        element: <HotelApplicationsPage />,
      },
      { path: ROUTES.ADMIN_WISHLIST, element: <WishlistTallyPage /> },
      { path: ROUTES.ADMIN_REFERRALS, element: <ReferralsPage /> },
    ],
  },
];

// Default and 404
const miscRoutes = [
  {
    path: "/",
    element: (
      <Navigate to={ROUTES.LOGIN} replace />
    ),
  },
  { path: "*", element: <NotFoundPage /> },
];

interface LocationState {
  returnUrl?: string;
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const returnUrl = locationState?.returnUrl;

  if (isAuthenticated && user) {
    // If there's a return URL, redirect there
    if (returnUrl) {
      return <Navigate to={returnUrl} replace />;
    }
    // Otherwise redirect based on role
    if (user.role === UserRole.ADMIN)
      return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
    if (user.role === UserRole.HOTEL_OWNER)
      return <Navigate to={ROUTES.HOTEL_DASHBOARD} replace />;
    return <Navigate to={ROUTES.HOME} replace />;
  }
  return <>{children}</>;
}

export function AppRouter() {
  useDocumentTitle();

  return (
    // Pages other than the marketplace load on demand, keeping the first
    // download small on phones.
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
    <Routes>
      {/* Auth routes with wrapper */}
      {authRoutes.map(({ path, element }, idx) => (
        <Route
          key={"auth-" + idx}
          path={path}
          element={<AuthWrapper>{element}</AuthWrapper>}
        />
      ))}
      {/* Public routes */}
      {publicRoutes.map(({ path, element }, idx) => (
        <Route key={"public-" + idx} path={path} element={element} />
      ))}
      <Route element={<PublicLayout />}>
        {publicLayoutRoutes.map(({ path, element }, idx) => (
          <Route key={"public-layout-" + idx} path={path} element={element} />
        ))}
      </Route>
      {/* Protected routes */}
      {protectedRoutes.map(({ path, element, allowedRoles, children }, idx) =>
        children ? (
          <Route
            key={"protected-" + idx}
            path={path}
            element={
              <ProtectedRoute allowedRoles={allowedRoles}>
                {element}
              </ProtectedRoute>
            }
          >
            {children.map((child, cidx) => (
              <Route key={cidx} path={child.path} element={child.element} />
            ))}
          </Route>
        ) : (
          <Route
            key={"protected-" + idx}
            path={path}
            element={
              <ProtectedRoute allowedRoles={allowedRoles}>
                {element}
              </ProtectedRoute>
            }
          />
        ),
      )}
      {/* Misc routes */}
      {miscRoutes.map(({ path, element }, idx) => (
        <Route key={"misc-" + idx} path={path} element={element} />
      ))}
    </Routes>
    </Suspense>
  );
}
