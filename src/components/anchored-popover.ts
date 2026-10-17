/**
 * Places a header popover right under its button, right edges aligned. The page column is
 * narrow and centered, so a fixed corner of the window would leave the menu far from its
 * button on wide screens. Call it from the button's click handler (before the popover opens).
 */
export function placeUnder(button: HTMLElement, popoverId: string) {
  const popover = document.getElementById(popoverId);
  if (!popover) return;
  const rect = button.getBoundingClientRect();
  popover.style.top = `${Math.round(rect.bottom + 8)}px`;
  popover.style.right = `${Math.max(8, Math.round(document.documentElement.clientWidth - rect.right))}px`;
}
