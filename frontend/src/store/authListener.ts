import { createListenerMiddleware } from "@reduxjs/toolkit";
import { setCredentials, logout } from "./slices/authSlice";
import { setAuthToken, removeAuthToken } from "../utils/tokenHelpers";

export const authListenerMiddleware = createListenerMiddleware();

authListenerMiddleware.startListening({
  actionCreator: setCredentials,
  effect: (action) => {
    setAuthToken(action.payload.token);
  },
});

authListenerMiddleware.startListening({
  actionCreator: logout,
  effect: () => {
    removeAuthToken();
  },
});
