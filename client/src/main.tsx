import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.addEventListener("unhandledrejection", (event) => {
  const msg = event.reason?.message || String(event.reason || "");
  if (
    msg.includes("MetaMask") ||
    msg.includes("User rejected") ||
    msg.includes("wallet") ||
    msg.includes("requestAccounts") ||
    msg.includes("PUBLIC_requestAccounts") ||
    msg.includes("4001")
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
