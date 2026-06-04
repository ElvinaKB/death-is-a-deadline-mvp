import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { logout } from "../../../store/slices/authSlice";
import { getAuthToken, setAuthToken } from "../../../utils/tokenHelpers";

/** Keeps cookie/localStorage token in sync with Redux after login and rehydrate. */
export function AuthTokenSync() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, token } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && token) {
      if (getAuthToken() !== token) {
        setAuthToken(token);
      }
      return;
    }

    if (isAuthenticated && !token) {
      const stored = getAuthToken();
      if (!stored) {
        dispatch(logout());
      }
    }
  }, [isAuthenticated, token, dispatch]);

  return null;
}
