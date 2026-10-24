import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./index-print.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import ErrorBoundary from "./components/common/ErrorBoundary.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppWrapper>
        <App />
      </AppWrapper>
    </ErrorBoundary>
  </StrictMode>
);
