// Runs before the app bundle: applies the saved theme to the status bar (theme-color) and the
// page canvas, so a light-theme home-screen app doesn't launch under a dark status bar.
// A file, not an inline script: the CSP allows only `script-src 'self'`.
// Colours = --bg-titlebar in src/styles/tokens.css; App.tsx takes over once it mounts.
(function () {
  var light = false;
  try {
    light = localStorage.getItem('theme') === 'light';
  } catch (e) {
    // Storage blocked: keep the dark default.
  }
  if (!light) return;
  document.documentElement.classList.add('light-theme');
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#f8f8f8');
})();
