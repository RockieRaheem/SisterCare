"use client";

import { useEffect, useRef } from "react";
import type { DailyCall } from "@daily-co/daily-js";

interface DailyAudioCallProps {
  roomUrl: string;
  token: string;
  onConnected: () => void;
  onDisconnected: () => void;
  onFailure: (code: string) => void;
}

export default function DailyAudioCall({
  roomUrl,
  token,
  onConnected,
  onDisconnected,
  onFailure,
}: DailyAudioCallProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbacksRef = useRef({
    onConnected,
    onDisconnected,
    onFailure,
  });

  useEffect(() => {
    callbacksRef.current = { onConnected, onDisconnected, onFailure };
  }, [onConnected, onDisconnected, onFailure]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let call: DailyCall | null = null;
    let disposed = false;
    let joined = false;
    let departureReported = false;

    const reportDeparture = () => {
      if (!joined || departureReported) return;
      departureReported = true;
      callbacksRef.current.onDisconnected();
    };

    const start = async () => {
      try {
        const { default: Daily } = await import("@daily-co/daily-js");
        if (disposed) return;
        const support = Daily.supportedBrowser();
        if (!support.supported) {
          callbacksRef.current.onFailure("unsupported_browser");
          return;
        }
        call = Daily.createFrame(container, {
          showLeaveButton: false,
          showParticipantsBar: false,
          showLocalVideo: false,
          showFullscreenButton: false,
          showUserNameChangeUI: false,
          startVideoOff: true,
          startAudioOff: false,
          videoSource: false,
          audioSource: true,
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "0",
            backgroundColor: "#0f172a",
          },
        });
        call
          .on("joined-meeting", () => {
            if (disposed) return;
            joined = true;
            callbacksRef.current.onConnected();
          })
          .on("left-meeting", () => {
            if (disposed) return;
            reportDeparture();
          })
          .on("error", () => {
            if (disposed) return;
            callbacksRef.current.onFailure("daily_connection_error");
          })
          .on("load-attempt-failed", () => {
            if (disposed) return;
            callbacksRef.current.onFailure("daily_load_failed");
          });
        await call.join({
          url: roomUrl,
          token,
          videoSource: false,
          audioSource: true,
          startVideoOff: true,
          startAudioOff: false,
        });
      } catch {
        if (!disposed) {
          callbacksRef.current.onFailure("daily_join_failed");
        }
      }
    };

    void start();
    return () => {
      reportDeparture();
      disposed = true;
      if (call && !call.isDestroyed()) {
        void call.leave().catch(() => undefined);
        void call.destroy().catch(() => undefined);
      }
      container.replaceChildren();
    };
  }, [roomUrl, token]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full bg-slate-950 sm:h-72"
      aria-label="Private Daily audio call"
    />
  );
}
