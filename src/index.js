import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "github-markdown-css/github-markdown.css";
import "highlight.js/styles/github.css";
import "katex/dist/katex.min.css";
import App from "./App";
import ErrorBoundary from "./ErrorBoundary";
import "./styles.css";

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

// Register service worker for offline support + update detection
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(process.env.PUBLIC_URL + "/sw.js")
      .then((registration) => {
        // Detect new service worker waiting to activate
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available — dispatch event for App to show update banner
              window.dispatchEvent(new CustomEvent("sw-update-available", { detail: { registration } }));
            }
          });
        });
      })
      .catch(() => {});
  });

  // Reload when the new SW takes control
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}