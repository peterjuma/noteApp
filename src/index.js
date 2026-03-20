import { StrictMode } from "react";
import ReactDOM from "react-dom";
import "github-markdown-css/github-markdown.css";
import "highlight.js/styles/github.css";
import App from "./App";
import ErrorBoundary from "./ErrorBoundary";
import "./styles.css";

const rootElement = document.getElementById("root");
ReactDOM.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
  rootElement
);

// Register service worker for offline support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(process.env.PUBLIC_URL + "/sw.js")
      .catch(() => {});
  });
}