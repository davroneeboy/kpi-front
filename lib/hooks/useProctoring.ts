"use client";

import { useRef, useCallback, useState } from "react";
import { getAccessToken } from "@/lib/auth-storage";

export type CameraStatus = "idle" | "pending" | "granted" | "denied";

export function useProctoring() {
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");

  const acquireCamera = useCallback(async (): Promise<boolean> => {
    if (streamRef.current) return true;
    setCameraStatus("pending");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraStatus("granted");
      return true;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setCameraStatus(name === "NotAllowedError" ? "denied" : "idle");
      console.warn("[proctoring] camera error:", err);
      return false;
    }
  }, []);

  const start = useCallback(async (attemptId: number): Promise<void> => {
    const token = getAccessToken();
    if (!token) { console.warn("[proctoring] no auth token"); return; }

    if (!streamRef.current) {
      const ok = await acquireCamera();
      if (!ok) return;
    }
    const mediaStream = streamRef.current;
    if (!mediaStream) return;

    const video = document.createElement("video");
    video.srcObject = mediaStream;
    video.muted = true;
    videoRef.current = video;
    await video.play().catch((err) => { console.warn("[proctoring] video.play failed:", err); });

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d")!;

    const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001");
    const protocol = apiUrl.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(
      `${protocol}://${apiUrl.host}/ws/proctoring/${attemptId}/?role=streamer&token=${token}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "streamer_connected", attempt_id: attemptId, timestamp: new Date().toISOString() }));
      intervalRef.current = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ws.send(JSON.stringify({ type: "frame", data: canvas.toDataURL("image/jpeg", 0.4) }));
      }, 200);
    };

    ws.onclose = () => {
      if (intervalRef.current !== null) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };

    ws.onerror = (err) => { console.warn("[proctoring] ws error:", err); ws.close(); };
  }, [acquireCamera]);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) { clearInterval(intervalRef.current); intervalRef.current = null; }
    wsRef.current?.close();
    wsRef.current = null;
    if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setCameraStatus("idle");
  }, []);

  return { acquireCamera, start, stop, stream, cameraStatus };
}
