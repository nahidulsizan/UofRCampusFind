const root = document.documentElement;
const toggle = document.querySelector('[data-theme-toggle]');
const savedTheme = localStorage.getItem('campusfindTheme');
let theme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function applyTheme() {
  root.setAttribute('data-theme', theme);
  if (toggle) {
    toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.querySelector('span').textContent = theme === 'dark' ? '☀' : '◐';
  }
}

applyTheme();
toggle?.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('campusfindTheme', theme);
  applyTheme();
});
