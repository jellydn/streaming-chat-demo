import { createRoot } from "react-dom/client";
import { App } from "./App";
import { GemmaProvider } from "./GemmaContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <GemmaProvider>
    <App />
  </GemmaProvider>,
);
