import "@fontsource-variable/inter";
import "@orbit/tokens/tokens.css";
import "@orbit/ui/styles.css";
import "./app.css";

import { ThemeProvider } from "@orbit/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { IssueStoreProvider } from "./state/store";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider storageKey="orbit-projects:theme">
      <IssueStoreProvider>
        <App />
      </IssueStoreProvider>
    </ThemeProvider>
  </StrictMode>,
);
