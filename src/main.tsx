import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Anti-phishing: block cloned sites running on unauthorized domains
const ALLOWED_HOSTS = ["corex-ai.app", "www.corex-ai.app", "localhost", "127.0.0.1"];
const currentHost = window.location.hostname;

if (!ALLOWED_HOSTS.includes(currentHost) && !currentHost.endsWith(".vercel.app")) {
  document.title = "Security Warning";
  document.getElementById("root")!.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0c0a08;color:#ef4444;font-family:sans-serif;padding:24px;text-align:center">
      <div>
        <h1 style="font-size:24px;font-weight:bold;margin-bottom:12px">⚠ Warning: Unauthorized Website</h1>
        <p style="color:#fca5a5;margin-bottom:8px">This is NOT the official CoreX Finance website.</p>
        <p style="color:#fca5a5;margin-bottom:24px">DO NOT connect your wallet or make any transactions here.</p>
        <a href="https://corex-ai.app" style="color:#C9A227;text-decoration:underline;font-size:18px">Go to the official site: corex-ai.app</a>
      </div>
    </div>
  `;
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
