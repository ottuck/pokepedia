/**
 * Dark mode is switched off for now: every page renders light and the header toggle is hidden.
 * The dark tokens (globals.css), the theme script and ThemeToggle stay; set this to true to
 * bring the toggle back.
 */
export const DARK_MODE_ENABLED = false;

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "theme";
const CHANGE_EVENT = "pokepedia:theme-change";

/**
 * Runs in <head> before the first paint. Pages are prerendered, so the server cannot know the
 * saved choice; without this a dark-theme reader would see a light flash on every load.
 * "system" is the absence of `data-theme`: globals.css then follows `prefers-color-scheme`.
 */
export const themeScript = `try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function toTheme(value: string | null | undefined): Theme {
  return value === "light" || value === "dark" ? value : "system";
}

/** The theme this page shows: `data-theme`, set by themeScript or the toggle. */
export function readTheme(): Theme {
  return toTheme(document.documentElement.dataset.theme);
}

function setRootTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
}

export function applyTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Not persisted, but the choice still applies to this page view.
  }
  setRootTheme(theme);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** For useSyncExternalStore: this tab's toggle, and other tabs through the storage event. */
export function subscribeTheme(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    setRootTheme(toTheme(event.newValue));
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
}
