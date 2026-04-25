import { useState, useCallback } from "react";
import { useAuth } from "./useAuth";

export function useAuthGate() {
  const [showAuth, setShowAuth] = useState(false);
  const { isLoggedIn } = useAuth();

  const requireAuth = useCallback((action?: () => void) => {
    if (isLoggedIn) {
      if (action) action();
      // For the Flight Details page, if no action is provided but user is logged in,
      // you could add a toast here saying "Booking in progress" or similar.
    } else {
      setShowAuth(true);
    }
  }, [isLoggedIn]);

  const closeAuth = useCallback(() => {
    setShowAuth(false);
  }, []);

  return { showAuth, requireAuth, closeAuth };
}
