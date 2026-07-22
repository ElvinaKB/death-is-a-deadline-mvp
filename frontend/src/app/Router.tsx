import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { ROUTES, getRoute } from "../config/routes.config";
import { UserRole } from "../types/auth.types";

// Layouts
import { AdminLayout } from "./layouts/AdminLayout";
import { StudentLayout } from "./layouts/StudentLayout";
// Pages
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { SignupSuccessPage } from "./pages/SignupSuccessPage";
import { LinkedInCallbackPage } from "./pages/LinkedInCallbackPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { HomePage } from "./pages/HomePage";
import { PlaceDetailPage as StudentPlacesDetailPage } from "./pages/student/PlacesDetailPage";
import { MyBidsPage } from "./pages/student/MyBidsPage";
import { CheckoutPage } from "./pages/student/CheckoutPage";
import { ProfilePage } from "./pages/student/ProfilePage";
import { ComingSoonPage } from "./pages/student/ComingSoonPage";
import { Heart, Bookmark, CreditCard, UserPlus, Settings as SettingsIcon } from "lucide-react";
import { HotelDashboardPage } from "./pages/hotel/HotelDashboardPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { StudentsListPage } from "./pages/admin/StudentsListPage";
import { StudentDetailPage } from "./pages/admin/StudentDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { UnauthorizedPage } from "./pages/UnauthorizedPage";
// Components
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RedirectPage } from "./pages/RedirectPage";

// AuthWrapper: redirect to protected base if already authenticated
import { useAppSelector } from "../store/hooks";
import { ResubmitPage } from "./pages/ResubmitPage";
import { PlaceFormPage } from "./pages/admin/PlaceFormPage";
import { PlacesListPage } from "./pages/admin/PlacesListPage";
import { BidsListPage } from "./pages/admin/BidsListPage";
import { NewsletterSubscribersPage } from "./pages/admin/NewsletterSubscribersPage";
import { HotelApplicationsPage } from "./pages/admin/HotelApplicationsPage";
import { WishlistTallyPage } from "./pages/admin/WishlistTallyPage";
import { PlaceTestimonialsPage } from "./pages/admin/PlaceTestimonialsPage";
import { HotelBidsPage } from "./pages/hotel/HotelBidsListPage";
import { HotelPlaceFormPage } from "./pages/hotel/HotelPlaceFormPage";
import { HotelSignupPage } from "./pages/hotel/HotelSignupPage";
import { HotelPlacesListPage } from "./pages/hotel/HotelPlaceListPage";
import { PublicLayout } from "./layouts/PublicLayout";
import { TermsPage } from "./pages/legal/TermsPage";
import { PrivacyPage } from "./pages/legal/PrivacyPage";
import { AccessibilityPage } from "./pages/legal/AccessibilityPage";
import { ContactPage } from "./pages/ContactPage";
import { WaitlistPage } from "./pages/WaitlistPage";
import { HotelsLandingPage } from "./pages/HotelsLandingPage";
import { HotelJoinPage } from "./pages/HotelJoinPage";
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
  { path: ROUTES.HOTELS_JOIN, element: <HotelJoinPage /> },
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
      { path: ROUTES.STUDENT_CHECKOUT, element: <CheckoutPage /> },
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
      { path: ROUTES.ADMIN_BIDS, element: <BidsListPage /> },
      { path: ROUTES.ADMIN_NEWSLETTER, element: <NewsletterSubscribersPage /> },
      {
        path: ROUTES.ADMIN_HOTEL_APPLICATIONS,
        element: <HotelApplicationsPage />,
      },
      { path: ROUTES.ADMIN_WISHLIST, element: <WishlistTallyPage /> },
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
  );
}
