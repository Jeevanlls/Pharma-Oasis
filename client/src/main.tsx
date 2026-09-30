import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/trade.css";
import "./styles/concept-02.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
