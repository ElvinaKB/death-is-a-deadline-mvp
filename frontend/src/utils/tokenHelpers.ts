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

export const getAuthToken = (): string | undefined => {
  return Cookies.get(TOKEN_KEY);
};

export const setAuthToken = (token: string): void => {
  Cookies.set(TOKEN_KEY, token, {
    expires: 7,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
};

export const removeAuthToken = (): void => {
  const clearLocal = () => {
    Cookies.remove(TOKEN_KEY);
    localStorage.removeItem("persist:root");
    SUPABASE_KEYS.map((key) => localStorage.removeItem(key));
    resetCookies();
  };

  if (PREVIEW_BYPASS) {
    setPreviewBypassLoggedOut();
    clearLocal();
    return;
  }

  supabase.auth.signOut().then(clearLocal).catch(clearLocal);
};
