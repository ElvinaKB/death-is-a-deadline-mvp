import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ROUTES } from "../config/routes.config";
import { UserRole } from "../types/auth.types";

// Layouts
import { AdminLayout } from "./layouts/AdminLayout";
import { StudentLayout } from "./layouts/StudentLayout";
// Pages
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { PlacesListPage as StudentPlacesListPage } from "./pages/student/PlacesListPage";
import { PlaceDetailPage as StudentPlacesDetailPage } from "./pages/student/PlacesDetailPage";
import { MyBidsPage } from "./pages/student/MyBidsPage";
import { CheckoutPage } from "./pages/student/CheckoutPage";
import { HotelDashboardPage } from "./pages/HotelDashboardPage";
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

// Auth routes (redirect to protected base if already authenticated)
const authRoutes = [
  { path: ROUTES.LOGIN, element: <LoginPage /> },
  { path: ROUTES.SIGNUP, element: <SignupPage /> },
  { path: ROUTES.RESUBMIT, element: <ResubmitPage /> },
];

// Public routes (no auth required, no redirect)
const publicRoutes = [
  { path: ROUTES.UNAUTHORIZED, element: <UnauthorizedPage /> },
  { path: ROUTES.REDIRECT, element: <RedirectPage /> },
  { path: ROUTES.HOME, element: <StudentPlacesListPage /> },
  {
    path: ROUTES.PUBLIC_PLACE_DETAIL,
    element: <StudentPlacesDetailPage />,
  },
];

// Protected routes (require auth, role-based)
const protectedRoutes = [
  {
    path: "/student",
    allowedRoles: [UserRole.STUDENT],
    element: <StudentLayout />,
    children: [
      { path: ROUTES.STUDENT_MY_BIDS, element: <MyBidsPage /> },
      { path: ROUTES.STUDENT_CHECKOUT, element: <CheckoutPage /> },
    ],
  },
  {
    path: ROUTES.HOTEL_DASHBOARD,
    allowedRoles: [UserRole.HOTEL_OWNER],
    element: <HotelDashboardPage />,
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
      { path: ROUTES.ADMIN_BIDS, element: <BidsListPage /> },
    ],
  },
];

// Default and 404
const miscRoutes = [
  { path: "/", element: <Navigate to={ROUTES.LOGIN} replace /> },
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
        )
      )}
      {/* Misc routes */}
      {miscRoutes.map(({ path, element }, idx) => (
        <Route key={"misc-" + idx} path={path} element={element} />
      ))}
    </Routes>
  );
}
