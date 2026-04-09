// ============================================================
// BODY SCROLL LOCK — ref-counted body overflow management
// Prevents multiple modals from interfering with each other.
// Only restores body scroll when ALL modals have released.
// ============================================================

let lockCount = 0;

/** Lock body scroll. Must be paired with unlockBodyScroll(). */
export function lockBodyScroll(): void {
  lockCount++;
  if (lockCount === 1) {
    document.body.style.overflow = "hidden";
  }
}

/** Unlock body scroll. Only restores when all locks are released. */
export function unlockBodyScroll(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = "";
  }
}

/** Force-reset all locks (safety net for orphaned modals). */
export function forceUnlockBodyScroll(): void {
  lockCount = 0;
  document.body.style.overflow = "";
}
