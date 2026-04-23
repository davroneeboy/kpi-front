"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postAttemptSessionEvent } from "@/lib/api/attempt-flow";
import type { AttemptSessionEventPayload } from "@/lib/api/types";

type Options = {
  /** false — urinish tugagan yoki taymer tugagan */
  active: boolean;
  /** server attempt_terminated: true qaytarganida chaqiriladi */
  onTerminated?: () => void;
  /** foydalanuvchi boshqa yorliqdan qaytganida chaqiriladi */
  onPageVisible?: () => void;
};

export type SessionNotification = {
  message: string;
  /** event_type that triggered this notification */
  eventType: "page_visible" | "window_blur";
};

const BLUR_DEFER_MS = 100;
const FOCUS_SKIP_AFTER_VISIBLE_MS = 200;
const NOTIFICATION_TTL_MS = 5000;

/**
 * Tab / oyna fokusi o’zgarishida POST /api/attempts/<id>/session-events/
 * (bir harakatda visibility + blur/focus dublikatlarini kamaytirish)
 */
export function useAttemptSessionEvents(
  attemptId: number | null,
  { active, onTerminated, onPageVisible }: Options,
): { notification: SessionNotification | null; dismissNotification: () => void } {
  const leaveCountRef = useRef(0);
  const tabHiddenAtRef = useRef<number | null>(null);
  const pageVisibleSentAtRef = useRef(0);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const terminatedRef = useRef(false);
  const onTerminatedRef = useRef(onTerminated);
  onTerminatedRef.current = onTerminated;
  const onPageVisibleRef = useRef(onPageVisible);
  onPageVisibleRef.current = onPageVisible;

  const [notification, setNotification] = useState<SessionNotification | null>(null);

  const dismissNotification = useCallback(() => setNotification(null), []);

  const showNotification = useCallback((n: SessionNotification) => {
    if (notifTimerRef.current != null) clearTimeout(notifTimerRef.current);
    setNotification(n);
    notifTimerRef.current = setTimeout(() => {
      setNotification(null);
      notifTimerRef.current = null;
    }, NOTIFICATION_TTL_MS);
  }, []);

  useEffect(() => {
    if (!attemptId || !active) return;

    leaveCountRef.current = 0;
    tabHiddenAtRef.current = null;
    pageVisibleSentAtRef.current = 0;
    terminatedRef.current = false;

    const send = (
      payload: Omit<AttemptSessionEventPayload, "client_timestamp">,
      opts: { keepalive?: boolean } = {},
    ) =>
      postAttemptSessionEvent(
        attemptId,
        { ...payload, client_timestamp: new Date().toISOString() },
        opts,
      );

    const handleTerminated = () => {
      if (terminatedRef.current) return;
      terminatedRef.current = true;
      setNotification(null);
      if (notifTimerRef.current != null) {
        clearTimeout(notifTimerRef.current);
        notifTimerRef.current = null;
      }
      onTerminatedRef.current?.();
    };

    const onVisibilityChange = () => {
      if (blurTimerRef.current != null) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }

      if (document.visibilityState === "hidden") {
        if (terminatedRef.current) return;
        leaveCountRef.current += 1;
        tabHiddenAtRef.current = Date.now();
        void send({
          event_type: "page_hidden",
          leave_count: leaveCountRef.current,
          duration_away_ms: null,
          meta: { visibilityState: document.visibilityState },
        }, { keepalive: true }).then((result) => {
          if (result.terminated) handleTerminated();
        });
      } else {
        if (terminatedRef.current) {
          handleTerminated();
          return;
        }
        const awayMs =
          tabHiddenAtRef.current != null
            ? Date.now() - tabHiddenAtRef.current
            : null;
        tabHiddenAtRef.current = null;
        pageVisibleSentAtRef.current = Date.now();
        void send({
          event_type: "page_visible",
          leave_count: leaveCountRef.current,
          duration_away_ms: awayMs,
          meta: { visibilityState: document.visibilityState },
        });
        onPageVisibleRef.current?.();
        showNotification({
          eventType: "page_visible",
          message: "Siz boshqa yorliqqa o’tganingiz qayd etildi.",
        });
      }
    };

    const onWindowBlur = () => {
      if (blurTimerRef.current != null) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => {
        blurTimerRef.current = null;
        if (document.visibilityState !== "visible") return;
        if (terminatedRef.current) return;

        leaveCountRef.current += 1;
        void send({
          event_type: "window_blur",
          leave_count: leaveCountRef.current,
          duration_away_ms: null,
          meta: { visibilityState: document.visibilityState },
        }).then((result) => {
          if (result.terminated) {
            handleTerminated();
          } else {
            showNotification({
              eventType: "window_blur",
              message: "Siz boshqa ilovaga o’tganingiz qayd etildi.",
            });
          }
        });
      }, BLUR_DEFER_MS);
    };

    const onWindowFocus = () => {
      if (focusTimerRef.current != null) clearTimeout(focusTimerRef.current);
      focusTimerRef.current = setTimeout(() => {
        focusTimerRef.current = null;
        if (document.visibilityState !== "visible") return;
        if (terminatedRef.current) return;
        if (Date.now() - pageVisibleSentAtRef.current < FOCUS_SKIP_AFTER_VISIBLE_MS) return;
        void send({
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
      if (blurTimerRef.current != null) { clearTimeout(blurTimerRef.current); blurTimerRef.current = null; }
      if (focusTimerRef.current != null) { clearTimeout(focusTimerRef.current); focusTimerRef.current = null; }
      if (notifTimerRef.current != null) { clearTimeout(notifTimerRef.current); notifTimerRef.current = null; }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [attemptId, active, showNotification]);

  return { notification, dismissNotification };
}
