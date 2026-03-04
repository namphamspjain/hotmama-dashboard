import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// #region agent log
fetch("http://127.0.0.1:7481/ingest/934277c5-6459-4000-bd4c-12ed98a856ca", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Debug-Session-Id": "bc3d1f",
  },
  body: JSON.stringify({
    sessionId: "bc3d1f",
    runId: "tsconfig-app-debug",
    hypothesisId: "H-tsconfig",
    location: "src/main.tsx:5",
    message: "App entry rendered",
    data: {},
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion agent log

createRoot(document.getElementById("root")!).render(<App />);
