import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Fix for PerformanceObserver buffered flag error in some browsers/libraries
if (typeof window !== "undefined" && window.PerformanceObserver) {
  const originalObserve = PerformanceObserver.prototype.observe;
  PerformanceObserver.prototype.observe = function (options) {
    try {
      if (options && options.entryTypes && options.buffered) {
        const { buffered, ...rest } = options;
        return originalObserve.call(this, rest);
      }
    } catch (e) {
      // Fallback to original
    }
    return originalObserve.call(this, options);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
