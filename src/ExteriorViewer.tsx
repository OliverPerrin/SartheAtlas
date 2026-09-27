import { useEffect, useRef, useState } from "react";
type Camera = { position: number[]; target: number[] };
type ViewerAPI = {
  start: () => void;
  addEventListener: (name: string, cb: () => void) => void;
  setBackground: (options: { color: number[] }) => void;
  getCameraLookAt: (cb: (error: unknown, camera: Camera) => void) => void;
  setCameraLookAt: (
    position: number[],
    target: number[],
    duration: number,
  ) => void;
  focusOnVisibleGeometries: () => void;
};
type ViewerConstructor = new (iframe: HTMLIFrameElement) => {
  init: (id: string, options: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    Sketchfab?: ViewerConstructor;
  }
}
let sdk: Promise<void> | undefined;
function loadSDK() {
  if (window.Sketchfab) return Promise.resolve();
  if (!sdk)
    sdk = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
      script.onload = () => resolve();
      script.onerror = () => {
        sdk = undefined;
        script.remove();
        reject(Error("Viewer SDK unavailable"));
      };
      document.head.append(script);
    });
  return sdk;
}
export default function ExteriorViewer({
  id,
  title,
  onFallback,
}: {
  id: string;
  title: string;
  onFallback: () => void;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const api = useRef<ViewerAPI | null>(null);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) setStatus((s) => (s === "loading" ? "slow" : s));
    }, 30000);
    loadSDK()
      .then(() => {
        if (cancelled || !iframe.current || !window.Sketchfab) return;
        new window.Sketchfab(iframe.current).init(id, {
          autostart: 1,
          ui_theme: "dark",
          preload: 1,
          success: (viewer: ViewerAPI) => {
            if (cancelled) return;
            api.current = viewer;
            viewer.addEventListener("viewerready", () => {
              if (cancelled) return;
              viewer.setBackground({ color: [0.89, 0.9, 0.95] });
              if (id === "e5957ead88aa4f2996bc66073734d3d7")
                viewer.getCameraLookAt((err, c) => {
                  if (!err && !cancelled)
                    viewer.setCameraLookAt(
                      c.position.map(
                        (p, i) => c.target[i] + (p - c.target[i]) * 0.2,
                      ),
                      c.target,
                      0,
                    );
                });
              setStatus("ready");
              window.clearTimeout(timer);
            });
            viewer.start();
          },
          error: () => {
            if (!cancelled) setStatus("error");
          },
        });
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      api.current = null;
      window.clearTimeout(timer);
    };
  }, [id]);
  function zoom(factor: number) {
    api.current?.getCameraLookAt((err, c) => {
      if (!err)
        api.current?.setCameraLookAt(
          c.position.map((p, i) => c.target[i] + (p - c.target[i]) * factor),
          c.target,
          0.3,
        );
    });
  }
  return (
    <div className="exterior-viewer">
      <iframe
        ref={iframe}
        title={title}
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowFullScreen
      />
      {status === "ready" ? (
        <div className="exterior-tools">
          <button onClick={() => zoom(0.65)} aria-label="Zoom exterior in">
            +
          </button>
          <button onClick={() => zoom(1.5)} aria-label="Zoom exterior out">
            −
          </button>
          <button onClick={() => api.current?.focusOnVisibleGeometries()}>
            Fit car
          </button>
        </div>
      ) : (
        <div className="exterior-status" role="status">
          {status === "loading"
            ? "Loading creator-hosted model…"
            : status === "slow"
              ? "This external model is taking longer to load."
              : "The external viewer could not load."}
          {status !== "loading" && (
            <button onClick={onFallback}>Use engineering view</button>
          )}
        </div>
      )}
    </div>
  );
}
