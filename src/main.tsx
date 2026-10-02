import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { activateFontStyles } from "./data/fontLoading.ts";

void activateFontStyles();

const root = createRoot(document.getElementById("root")!);
if (new URLSearchParams(location.search).has("lab")) {
  root.render(<div className="page-loading">Preparing the studio…</div>);
  void import("./dev/Lab.tsx").then(({ default: Lab }) => {
    root.render(
      <StrictMode>
        <Lab />
      </StrictMode>,
    );
  });
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
