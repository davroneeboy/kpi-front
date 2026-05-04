// @ts-ignore
import { getAccessToken } from "@/lib/auth-storage";

export async function testStream(attemptId?: number) {
  const token = getAccessToken();
  if (!token) {
    console.error("No auth token in localStorage");
    return;
  }

  // Get current attemptId from sessionStorage or use provided
  let aid = attemptId;
  if (!aid) {
    // Try to find from sessionStorage
    const keys = Object.keys(sessionStorage);
    const attemptKey = keys.find(k => k.startsWith('attempt_bootstrap_'));
    if (attemptKey) {
      try {
        const data = JSON.parse(sessionStorage.getItem(attemptKey)!);
        aid = data.id;
      } catch (e) {
        console.error("Could not parse attempt data from sessionStorage");
      }
    }
  }

  if (!aid) {
    console.error("No attemptId provided and none found in sessionStorage");
    return;
  }

  console.log(`Testing WebSocket for attemptId: ${aid}, token: ${token.substring(0, 20)}...`);

  const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001");
  const protocol = apiUrl.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${protocol}://${apiUrl.host}/ws/proctoring/${aid}/?role=streamer&token=${token}`;

  console.log(`Connecting to: ${wsUrl}`);

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("✅ WebSocket connected successfully");

    ws.send(JSON.stringify({
      type: "streamer_connected",
      attempt_id: aid,
      timestamp: new Date().toISOString(),
    }));

    let frameCount = 0;
    const maxFrames = 25;

    const sendFrame = () => {
      if (frameCount >= maxFrames) {
        ws.close();
        console.log("🔚 Closed test connection after 25 frames");
        return;
      }

      frameCount++;
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d")!;

      // Create a test image with frame number
      ctx.fillStyle = "red";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";
      ctx.font = "20px Arial";
      ctx.fillText(`FRAME ${frameCount}/25`, 80, 120);

      const frame = canvas.toDataURL("image/jpeg", 0.4);
      ws.send(JSON.stringify({ type: "frame", data: frame }));
      console.log(`📤 Sent frame ${frameCount}/25`);
    };

    // Send frames every 200ms, like real proctoring (5 FPS)
    const interval = setInterval(sendFrame, 200);

    ws.onclose = () => {
      clearInterval(interval);
      console.log(`🔚 WebSocket closed with code: ${ws.readyState === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN'}`);
    };
  };

  ws.onmessage = (event) => {
    console.log("📨 Received message:", event.data);
  };

  ws.onclose = (event) => {
    console.log(`🔚 WebSocket closed with code: ${event.code}, reason: ${event.reason}`);
  };

  ws.onerror = (error) => {
    console.error("❌ WebSocket error:", error);
  };

  return ws;
}

// Make it available globally for console testing
// @ts-ignore
if (typeof window !== "undefined") {
  // @ts-ignore
  window.testStream = testStream;
}