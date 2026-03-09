import { createContext, useContext, useRef, useState, useCallback } from 'react';

const NavigationGuardContext = createContext(null);

/**
 * Provides a lightweight navigation guard that works with BrowserRouter.
 *
 * Usage:
 *  - ProfilePage registers a guard via `registerGuard(() => isDirtyRef.current)`
 *    and unregisters it on unmount via `clearGuard()`.
 *  - Sidebar calls `requestNavigate(href, navigate)` before every link click.
 *    If the guard returns true the navigation is blocked and stored as pending.
 *  - ProfilePage's dialog calls `proceed()` to run the pending navigation,
 *    or `cancel()` to abort it.
 */
export function NavigationGuardProvider({ children }) {
  // guardRef holds () => boolean. Returns true when navigation should be blocked.
  const guardRef  = useRef(null);
  const pendingRef = useRef(null); // { href, navigateFn }

  const [isBlocked, setIsBlocked] = useState(false);

  const registerGuard = useCallback((fn) => { guardRef.current = fn; }, []);
  const clearGuard    = useCallback(() => { guardRef.current = null; }, []);

  /** Called by Sidebar before each navigation. Returns true if blocked. */
  const requestNavigate = useCallback((href, navigateFn) => {
    if (guardRef.current?.()) {
      pendingRef.current = { href, navigateFn };
      setIsBlocked(true);
      return true;
    }
    return false;
  }, []);

  /** Proceed with the pending navigation (called after save / discard). */
  const proceed = useCallback(() => {
    setIsBlocked(false);
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) pending.navigateFn(pending.href);
  }, []);

  /** Abort the pending navigation (user chose "Return to Profile"). */
  const cancel = useCallback(() => {
    setIsBlocked(false);
    pendingRef.current = null;
  }, []);

  return (
    <NavigationGuardContext.Provider
      value={{ registerGuard, clearGuard, requestNavigate, isBlocked, proceed, cancel }}
    >
      {children}
    </NavigationGuardContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useNavigationGuard = () => useContext(NavigationGuardContext);
