/**
 * useAutoSave — Auto-save hook for Page Builder v2
 *
 * Features:
 *   - 30-second debounce (saves 30s after last change, not 30s interval)
 *   - AbortController cancels in-flight request when new save is triggered
 *   - Exponential backoff retry: 2s, 4s, 8s (max 3 attempts)
 *   - Conflict detection: detects 409 from server and triggers onConflict
 *
 * Usage:
 *   const { saveStatus, lastSavedAt, markDirty, doSave } = useAutoSave({
 *     saveFn: async (signal) => { await api.autosave(pageId, data, signal); },
 *     onConflict: () => setConflictOpen(true),
 *   });
 *
 *   // In PuckEditor's onChange: markDirty()
 *   // In manual save button: await doSave()
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { getRetryDelay, shouldAutoSave } from "../utils/autosave-utils";
import type { SaveStatus } from "../utils/autosave-utils";

export type { SaveStatus };

export interface UseAutoSaveOptions {
  /** Async function that performs the actual save. Receives an AbortSignal. */
  saveFn: (signal: AbortSignal) => Promise<void>;
  /** Called when server returns 409 (concurrent edit detected). */
  onConflict?: () => void;
  /** Debounce interval in ms. Default: 30 000 (30s). */
  intervalMs?: number;
}

export interface UseAutoSaveResult {
  saveStatus: SaveStatus;
  lastSavedAt: number;
  /** Call when user makes any change to the editor content. */
  markDirty: () => void;
  /** Trigger an immediate save (e.g. manual save / navigate away). */
  doSave: () => Promise<void>;
}

export function useAutoSave({
  saveFn,
  onConflict,
  intervalMs = 30_000,
}: UseAutoSaveOptions): UseAutoSaveResult {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number>(Date.now());

  // Mutable refs — don't need to trigger re-render
  const isDirtyRef = useRef(false);
  const lastChangedAtRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const savingRef = useRef(false);

  // Always use latest saveFn without closing over stale value
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  const onConflictRef = useRef(onConflict);
  onConflictRef.current = onConflict;

  // ── markDirty ─────────────────────────────────────────────────
  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    lastChangedAtRef.current = Date.now();
    setSaveStatus("unsaved");
  }, []);

  // ── doSave ────────────────────────────────────────────────────
  const doSave = useCallback(async (): Promise<void> => {
    if (!isDirtyRef.current) return;
    if (savingRef.current) return; // Already saving

    // Cancel any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    savingRef.current = true;

    setSaveStatus("saving");

    try {
      await saveFnRef.current(ctrl.signal);

      if (ctrl.signal.aborted) return; // Newer save in flight

      isDirtyRef.current = false;
      retryCountRef.current = 0;
      savingRef.current = false;
      setLastSavedAt(Date.now());
      setSaveStatus("saved");

      // Revert to idle after 5s
      setTimeout(() => {
        setSaveStatus((s) => (s === "saved" ? "idle" : s));
      }, 5_000);
    } catch (err) {
      savingRef.current = false;
      if (ctrl.signal.aborted) return;

      // 409 Conflict — concurrent edit from another device
      if (err instanceof Error && err.message.includes("HTTP_409")) {
        setSaveStatus("conflict");
        onConflictRef.current?.();
        return;
      }

      // Retry with exponential backoff (max 3 attempts)
      if (retryCountRef.current < 2) {
        const attempt = retryCountRef.current;
        retryCountRef.current += 1;
        setSaveStatus("error");
        setTimeout(() => {
          savingRef.current = false;
          doSave();
        }, getRetryDelay(attempt));
      } else {
        retryCountRef.current = 0;
        setSaveStatus("error");
      }
    }
  }, []); // doSave is stable — uses refs for all mutable state

  // ── Auto-save timer ────────────────────────────────────────────
  // Poll every 5s. Fires doSave when 30s have elapsed since last change.
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        shouldAutoSave(isDirtyRef.current, lastChangedAtRef.current, Date.now(), intervalMs)
      ) {
        doSave();
      }
    }, 5_000);

    return () => clearInterval(timer);
  }, [doSave, intervalMs]);

  // ── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { saveStatus, lastSavedAt, markDirty, doSave };
}
