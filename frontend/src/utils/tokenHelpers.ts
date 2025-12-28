import Cookies from "js-cookie";
import { supabase } from "./supabaseClient";

const TOKEN_KEY = "auth_token";
const SUPABASE_KEYS = [
  "access_token",
  "refresh_token",
  "token_type",
  "expires_in",
];

export const resetCookies = () => {
  // Store tokens in cookies
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
    expires: 7, // 7 days
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
};

export const removeAuthToken = (): void => {
  supabase.auth
    .signOut()
    .then(() => {
      Cookies.remove(TOKEN_KEY);
      localStorage.removeItem("persist:root");
      SUPABASE_KEYS.map((key) => localStorage.removeItem(key));
      resetCookies();
      window.location.reload();
    })
    .catch(() => {});
};
