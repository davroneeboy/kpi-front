"use client";

import { useEffect, useRef } from "react";
import { postAttemptSessionEvent } from "@/lib/api/attempt-flow";
import type { AttemptSessionEventPayload } from "@/lib/api/types";

type Options = {
  /** false — urinish tugagan yoki taymer tugagan */
  active: boolean;
};

const BLUR_DEFER_MS = 100;
const FOCUS_SKIP_AFTER_VISIBLE_MS = 200;

/**
 * Tab / oyna fokusi o‘zgarishida POST /api/attempts/<id>/session-events/
 * (bir harakatda visibility + blur/ focus dublikatlarini kamaytirish)
 */
export function useAttemptSessionEvents(
  attemptId: number | null,
  { active }: Options,
) {
  const leaveCountRef = useRef(0);
  const tabHiddenAtRef = useRef<number | null>(null);
  const pageVisibleSentAtRef = useRef(0);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!attemptId || !active) return;

    leaveCountRef.current = 0;
    tabHiddenAtRef.current = null;
    pageVisibleSentAtRef.current = 0;

    const send = (
      payload: Omit<AttemptSessionEventPayload, "client_timestamp">,
    ) => {
      void postAttemptSessionEvent(attemptId, {
        ...payload,
        client_timestamp: new Date().toISOString(),
      });
    };

    const onVisibilityChange = () => {
      if (blurTimerRef.current != null) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }

      if (document.visibilityState === "hidden") {
        leaveCountRef.current += 1;
        tabHiddenAtRef.current = Date.now();
        send({
          event_type: "page_hidden",
          leave_count: leaveCountRef.current,
          duration_away_ms: null,
          meta: { visibilityState: document.visibilityState },
        });
      } else {
        const awayMs =
          tabHiddenAtRef.current != null
            ? Date.now() - tabHiddenAtRef.current
            : null;
        tabHiddenAtRef.current = null;
        pageVisibleSentAtRef.current = Date.now();
        send({
          event_type: "page_visible",
          leave_count: leaveCountRef.current,
          duration_away_ms: awayMs,
          meta: { visibilityState: document.visibilityState },
        });
      }
    };

    const onWindowBlur = () => {
      if (blurTimerRef.current != null) {
        clearTimeout(blurTimerRef.current);
      }
      blurTimerRef.current = setTimeout(() => {
        blurTimerRef.current = null;
        if (document.visibilityState !== "visible") return;

        leaveCountRef.current += 1;
        send({
          event_type: "window_blur",
          leave_count: leaveCountRef.current,
          duration_away_ms: null,
          meta: {
            visibilityState: document.visibilityState,
          },
        });
      }, BLUR_DEFER_MS);
    };

    const onWindowFocus = () => {
      if (focusTimerRef.current != null) {
        clearTimeout(focusTimerRef.current);
      }
      focusTimerRef.current = setTimeout(() => {
        focusTimerRef.current = null;
        if (document.visibilityState !== "visible") return;
        if (
          Date.now() - pageVisibleSentAtRef.current <
          FOCUS_SKIP_AFTER_VISIBLE_MS
        ) {
          return;
        }
        send({
          event_type: "window_focus",
          leave_count: leaveCountRef.current,
          duration_away_ms: null,
          meta: { visibilityState: document.visibilityState },
        });
      }, BLUR_DEFER_MS);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      if (blurTimerRef.current != null) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      if (focusTimerRef.current != null) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [attemptId, active]);
}
