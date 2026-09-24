"use client";
import React, { useEffect, useRef, useState } from "react";
import { C, Card } from "@/lib/ui";
import { api } from "@/lib/api-client";

type CameraStatus = "loading" | "connecting" | "live" | "offline" | "not_configured";

export function LiveCameraPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<CameraStatus>("loading");
  const [label, setLabel] = useState("Loading Dock");

  useEffect(() => {
    let hls: any = null;
    let cancelled = false;

    api<{ configured: boolean; streamUrl: string | null; label: string }>("/api/camera").then(async (res) => {
      if (cancelled) return;
      setLabel(res.label);
      if (!res.configured || !res.streamUrl) {
        setStatus("not_configured");
        return;
      }
      setStatus("connecting");
      const video = videoRef.current;
      if (!video) return;

      try {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari/iOS supports HLS natively
          video.src = res.streamUrl;
          video.addEventListener("loadedmetadata", () => !cancelled && setStatus("live"));
          video.addEventListener("error", () => !cancelled && setStatus("offline"));
        } else {
          const Hls = (await import("hls.js")).default;
          if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(res.streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => !cancelled && setStatus("live"));
            hls.on(Hls.Events.ERROR, (_: any, data: any) => { if (data.fatal && !cancelled) setStatus("offline"); });
          } else {
            setStatus("offline");
          }
        }
      } catch {
        if (!cancelled) setStatus("offline");
      }
    }).catch(() => !cancelled && setStatus("offline"));

    return () => { cancelled = true; if (hls) hls.destroy(); };
  }, []);

  return (
    <Card style={{ marginBottom: 16, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>LIVE CAMERA — {label}</div>
        <StatusBadge status={status} />
      </div>
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#0E2A2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: status === "live" ? "block" : "none" }} />
        {status !== "live" && (
          <div style={{ color: "#fff", textAlign: "center", padding: 20 }}>
            {status === "loading" && <div style={{ fontSize: 13, opacity: 0.8 }}>Checking camera status…</div>}
            {status === "connecting" && <div style={{ fontSize: 13, opacity: 0.8 }}>CONNECTING…</div>}
            {status === "offline" && <div style={{ fontSize: 13, color: "#F0A79A" }}>CAMERA OFFLINE</div>}
            {status === "not_configured" && (
              <div style={{ fontSize: 13, opacity: 0.85, maxWidth: 320 }}>
                CAMERA OFFLINE — no stream configured.
                <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 6 }}>
                  Set CAMERA_STREAM_URL to a real HLS endpoint from your loading-dock camera/NVR to go live here.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: CameraStatus }) {
  const map: Record<CameraStatus, { text: string; color: string; dot: string }> = {
    loading: { text: "CHECKING", color: C.inkSoft, dot: C.inkSoft },
    connecting: { text: "CONNECTING…", color: C.gold, dot: C.gold },
    live: { text: "LIVE", color: C.green, dot: C.green },
    offline: { text: "OFFLINE", color: C.red, dot: C.red },
    not_configured: { text: "NOT CONFIGURED", color: C.inkSoft, dot: C.inkSoft },
  };
  const s = map[status];
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: s.color }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: s.dot, animation: status === "live" ? "rw-pulse 1.4s ease infinite" : "none" }} />
      {s.text}
      <style>{`@keyframes rw-pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }`}</style>
    </span>
  );
}
