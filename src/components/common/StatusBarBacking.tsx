/**
 * iOS home-screen app only. The status bar is "black-translucent" (index.html): the page runs
 * under it edge to edge, and iOS draws the time/battery in white. With "default" iOS 26 left
 * the web view one status-bar height short of the screen bottom (a blank strip under sheets
 * and the bottom nav). White text needs a dark backing in the light theme, so this paints the
 * status-bar inset black there, above every layer (modals included) and never takes taps.
 */
export function StatusBarBacking() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[2147483647] hidden h-[env(safe-area-inset-top,0px)] bg-black standalone:light:block"
    />
  );
}
