import "@fontsource-variable/inter";
import "@orbit/tokens/tokens.css";
import "@orbit/ui/styles.css";
import "./index.css";

import { ThemeProvider } from "@orbit/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ApiError, setUnauthorizedHandler } from "./lib/api";
import { keys } from "./lib/queries";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (n, err) => !(err instanceof ApiError && err.status < 500) && n < 2,
      refetchOnWindowFocus: true,
      staleTime: 20_000,
    },
  },
});

// A 401 anywhere means the session ended: refresh it so the login screen shows.
setUnauthorizedHandler(() => void queryClient.invalidateQueries({ queryKey: keys.session }));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* The product is designed for Aero Scenic. Transparency & motion stay user-adjustable. */}
    <ThemeProvider theme="scenic" storageKey="trustworthy:appearance">
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
