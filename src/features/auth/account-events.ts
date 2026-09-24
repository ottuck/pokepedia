/**
 * Signals that the signed-in account changed outside the browser Supabase client, so its
 * `onAuthStateChange` never fires: a guest session created by a Server Action, or a nickname
 * saved on the server. The header's AccountMenu listens and reloads.
 */
const ACCOUNT_CHANGED = "pokepedia:account-changed";

export function announceAccountChange() {
  window.dispatchEvent(new Event(ACCOUNT_CHANGED));
}

export function onAccountChange(listener: () => void) {
  window.addEventListener(ACCOUNT_CHANGED, listener);
  return () => window.removeEventListener(ACCOUNT_CHANGED, listener);
}
