import { useEffect } from "react";
import {
  PREVIEW_BYPASS,
  isPreviewBypassLoggedOut,
} from "../../../config/previewBypass";
import { getPreviewBypassAuthResponse } from "../../../services/mockApiHandlers";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { setCredentials } from "../../../store/slices/authSlice";
import { setAuthToken } from "../../../utils/tokenHelpers";

export function PreviewBypassBoot() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  useEffect(() => {
    if (!PREVIEW_BYPASS || isAuthenticated || isPreviewBypassLoggedOut()) return;
    const { user, token } = getPreviewBypassAuthResponse();
    setAuthToken(token.access_token);
    dispatch(setCredentials({ user, token: token.access_token }));
  }, [dispatch, isAuthenticated]);

  return null;
}
