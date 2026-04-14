export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  return (localStorage.getItem('tj_theme') as Theme) || 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('tj_theme', theme);
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'light' ? 'dark' : 'light';
  applyTheme(next);
  return next;
}
