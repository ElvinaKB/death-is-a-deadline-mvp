import Cookies from "js-cookie";
import {
  PREVIEW_BYPASS,
  setPreviewBypassLoggedOut,
} from "../config/previewBypass";
import { supabase } from "./supabaseClient";

const TOKEN_KEY = "auth_token";
const SUPABASE_KEYS = [
  "access_token",
  "refresh_token",
  "token_type",
  "expires_in",
];

export const resetCookies = () => {
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");
  Cookies.remove("token_type");
  Cookies.remove("expires_in");
};

/** Read API token from cookie or localStorage (mobile Safari fallback). */
export const getAuthToken = (): string | undefined => {
  return Cookies.get(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || undefined;
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
  Cookies.set(TOKEN_KEY, token, {
    expires: 7,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
  });
};

export const removeAuthToken = (): void => {
  const clearLocal = () => {
    Cookies.remove(TOKEN_KEY, { path: "/" });
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("persist:root");
    SUPABASE_KEYS.map((key) => localStorage.removeItem(key));
    resetCookies();
  };

  supabase.auth.signOut().then(clearLocal).catch(clearLocal);
};
