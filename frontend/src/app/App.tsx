import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "../store";
import { Toaster } from "./components/ui/sonner";
import { Loader2 } from "lucide-react";

// Layouts

// Pages

// Components
import { AppRouter } from "./Router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppLoader() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<AppLoader />} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppRouter />
            <Toaster position="top-right" richColors />
          </BrowserRouter>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}
