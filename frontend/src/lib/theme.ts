export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'legal_clarity_theme';

/**
 * Resolves current active theme from localStorage or system preference.
 */
export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // LocalStorage unavailable
  }

  // Check system preference
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

/**
 * Applies the theme class ('dark') to document.documentElement and saves to localStorage.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // LocalStorage unavailable
  }
}

/**
 * Toggles the theme between light and dark.
 */
export function toggleTheme(current: Theme): Theme {
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}
