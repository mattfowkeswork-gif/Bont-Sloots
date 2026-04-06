import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    if (registrations.length > 0) {
      Promise.all(registrations.map(r => r.unregister())).then(() => {
        window.location.reload();
      });
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
