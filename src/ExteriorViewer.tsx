import { useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  Image,
  Sparkles,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import "./ExteriorViewer.css";
import {
  viewerPostProcessing,
  viewerStartupOptions,
  viewerStartupQueue,
} from "./data/viewerLifecycle.ts";
import { applyMaterialOverride } from "./data/materialApplication.ts";
import type {
  MaterialOverride,
  ViewerMaterial,
} from "./data/materialApplication.ts";
export type { MaterialOverride } from "./data/materialApplication.ts";

type ViewerNode = { name?: string; instanceID: number; type?: string };
export type EnvironmentOverrides = {
  exposure?: number;
  lightIntensity?: number;
  rotation?: number;
  shadowEnabled?: boolean;
};

type Camera = { position: number[]; target: number[] };
type SceneNode = {
  name?: string;
  type: string;
  instanceID: number;
  children?: SceneNode[];
};
type ViewerAPI = {
  start: () => void;
  stop: () => void;
  addEventListener: (name: string, cb: () => void) => void;
  setBackground: (options: { color: number[] }) => void;
  setTextureQuality: (quality: "sd" | "hd") => void;
  getNodeMap: (
    cb: (error: unknown, nodes: Record<string, ViewerNode>) => void,
  ) => void;
  hide: (id: number, cb?: (error: unknown) => void) => void;
  setEnvironment: (
    settings: EnvironmentOverrides,
    cb?: (error: unknown) => void,
  ) => void;
  getMaterialList: (
    cb: (error: unknown, materials: ViewerMaterial[]) => void,
  ) => void;
  setMaterial: (
    material: ViewerMaterial,
    cb?: (error?: unknown) => void,
  ) => void;
  setShadingStyle: (style: "pbr", options: { type: "lit" }) => void;
  getPostProcessing: (cb: (settings: Record<string, unknown>) => void) => void;
  setPostProcessing: (settings: Record<string, unknown>) => void;
  setEnableCameraConstraints: (
    enabled: boolean,
    options: { preventCameraConstraintsFocus: boolean },
  ) => void;
  getSceneGraph: (cb: (error: unknown, root: SceneNode) => void) => void;
  getMatrix: (
    id: number,
    cb: (error: unknown, matrix: { local: number[] }) => void,
  ) => void;
  setMatrix: (
    id: number,
    matrix: number[],
    cb: (error: unknown) => void,
  ) => void;
  getCameraLookAt: (cb: (error: unknown, camera: Camera) => void) => void;
  setCameraLookAt: (
    position: number[],
    target: number[],
    duration: number,
    callback?: (error: unknown) => void,
  ) => void;
  focusOnVisibleGeometries: (cb?: (error: unknown) => void) => void;
  setCameraLookAtEndAnimationCallback: (cb: (error: unknown) => void) => void;
};
export type ExteriorCameraOptions = {
  fitScale?: number;
  cameraYaw?: number;
  cameraElevation?: number;
  initialDirection?: readonly [number, number, number];
  modelRotation?: {
    modelId: string;
    nodeName: string;
    angle: number;
    axis: readonly [number, number, number];
  };
};
const authoredDirections = new WeakMap<ViewerAPI, number[]>();
const rotatedViewers = new WeakSet<ViewerAPI>();
function prepareModelRotation(
  viewer: ViewerAPI,
  element: HTMLDivElement | null,
  options: ExteriorCameraOptions,
  done: () => void,
  isCurrent: () => boolean,
) {
  const rotation = options.modelRotation;
  if (
    !rotation ||
    rotatedViewers.has(viewer) ||
    element?.dataset.modelId !== rotation.modelId
  ) {
    done();
    return;
  }
  viewer.getSceneGraph((graphError, graph) => {
    if (!isCurrent()) return;
    if (graphError) {
      done();
      return;
    }
    const matches: SceneNode[] = [];
    const walk = (node: SceneNode) => {
      if (node.name === rotation.nodeName && node.type === "MatrixTransform")
        matches.push(node);
      node.children?.forEach(walk);
    };
    walk(graph);
    if (matches.length !== 1) {
      done();
      return;
    }
    const id = matches[0].instanceID;
    viewer.getMatrix(id, (matrixError, matrix) => {
      if (!isCurrent()) return;
      if (matrixError || matrix.local.length !== 16) {
        done();
        return;
      }
      const length = Math.hypot(...rotation.axis);
      if (length < 0.0001) {
        done();
        return;
      }
      const [x, y, z] = rotation.axis.map((value) => value / length);
      const c = Math.cos(rotation.angle),
        sn = Math.sin(rotation.angle),
        t = 1 - c;
      const r = [
        x * x * t + c,
        y * x * t + z * sn,
        z * x * t - y * sn,
        0,
        x * y * t - z * sn,
        y * y * t + c,
        z * y * t + x * sn,
        0,
        x * z * t + y * sn,
        y * z * t - x * sn,
        z * z * t + c,
        0,
        0,
        0,
        0,
        1,
      ];
      const transformed = Array.from({ length: 16 }, (_, i) => {
        const row = i % 4,
          column = Math.floor(i / 4);
        return [0, 1, 2, 3].reduce(
          (sum, k) => sum + r[k * 4 + row] * matrix.local[column * 4 + k],
          0,
        );
      });
      viewer.setMatrix(id, transformed, (setError) => {
        if (!isCurrent()) return;
        if (!setError) {
          rotatedViewers.add(viewer);
          if (element) element.dataset.modelRotation = rotation.nodeName;
        }
        done();
      });
    });
  });
}
type FitState = {
  busy: boolean;
  callbacks: (() => void)[];
  options: ExteriorCameraOptions;
  element: HTMLDivElement | null;
  baseline: Map<string, { distance: number; target: number[] }>;
  disposed: boolean;
  timers: Set<number>;
};
const fitStates = new WeakMap<ViewerAPI, FitState>();
function disposeViewerFit(viewer: ViewerAPI) {
  const state = fitStates.get(viewer);
  if (!state) return;
  state.disposed = true;
  state.callbacks.length = 0;
  state.timers.forEach((timer) => window.clearTimeout(timer));
  fitStates.delete(viewer);
}
function fitViewer(
  viewer: ViewerAPI,
  element: HTMLDivElement | null,
  options: ExteriorCameraOptions,
  done?: () => void,
) {
  let state = fitStates.get(viewer);
  if (!state) {
    state = {
      busy: false,
      callbacks: [],
      options,
      element,
      baseline: new Map(),
      disposed: false,
      timers: new Set(),
    };
    fitStates.set(viewer, state);
  }
  state.options = options;
  state.element = element;
  if (done) state.callbacks.push(done);
  if (state.busy) return;
  state.busy = true;
  let processedViewport = "";
  const finish = () => {
    if (state!.disposed) return;
    state!.busy = false;
    const latest = state!.element
      ? `${state!.element.clientWidth}:${state!.element.clientHeight}`
      : "1:1";
    if (processedViewport && latest !== processedViewport) {
      fitViewer(viewer, state!.element, state!.options);
      return;
    }
    const callbacks = state!.callbacks.splice(0);
    callbacks.forEach((callback) => callback());
  };
  prepareModelRotation(
    viewer,
    element,
    options,
    () => {
      viewer.getCameraLookAt((sourceError, initial) => {
        if (state!.disposed) return;
        if (sourceError) {
          finish();
          return;
        }
        if (!authoredDirections.has(viewer))
          authoredDirections.set(
            viewer,
            initial.position.map((p, i) => p - initial.target[i]),
          );
        const width = state!.element?.clientWidth ?? 1,
          height = state!.element?.clientHeight ?? 1;
        const viewportKey = `${width}:${height}`;
        processedViewport = viewportKey;
        const apply = (baseline: { distance: number; target: number[] }) => {
          if (state!.disposed) return;
          const active = state!.options;
          const source =
            active.initialDirection ?? authoredDirections.get(viewer)!;
          const sourceDistance = Math.hypot(...source),
            sourceRadius = Math.hypot(source[0], source[1]);
          const topDown = sourceRadius < sourceDistance * 0.08;
          const azimuth =
            (topDown ? -Math.PI / 4 : Math.atan2(source[1], source[0])) +
            ((active.cameraYaw ?? 0) * Math.PI) / 180;
          const elevation =
            active.cameraElevation ??
            (topDown ? 0.3 : source[2] / Math.max(sourceRadius, 0.0001));
          const scale = Math.max(0.2, Math.min(2, active.fitScale ?? 1));
          const aspect = state!.element
            ? state!.element.clientWidth /
              Math.max(1, state!.element.clientHeight)
            : 1;
          const distance =
            baseline.distance * scale * (aspect < 0.95 ? 1.15 : 1);
          const radius = distance / Math.sqrt(1 + elevation * elevation);
          const position = [
            baseline.target[0] + radius * Math.cos(azimuth),
            baseline.target[1] + radius * Math.sin(azimuth),
            baseline.target[2] + radius * elevation,
          ];
          if (state!.element)
            state!.element.dataset.fitBaseline = JSON.stringify({
              distance: baseline.distance,
              viewport: viewportKey,
              scale,
            });
          let poseFinished = false;
          let poseFallback: number | undefined;
          const completePose = () => {
            if (poseFinished || state!.disposed) return;
            poseFinished = true;
            window.clearTimeout(poseFallback);
            if (poseFallback !== undefined) state!.timers.delete(poseFallback);
            finish();
          };
          viewer.setCameraLookAtEndAnimationCallback((error) => {
            if (!error) completePose();
          });
          viewer.setCameraLookAt(
            position,
            baseline.target,
            0.3,
            (moveError) => {
              if (!moveError && state!.element)
                state!.element.dataset.cameraPose = JSON.stringify({
                  position,
                  target: baseline.target,
                });
              if (moveError) completePose();
            },
          );
          poseFallback = window.setTimeout(completePose, 500);
          state!.timers.add(poseFallback);
        };
        const cached = state!.baseline.get(viewportKey);
        if (cached) {
          apply(cached);
          return;
        }
        let measured = false;
        let fallback: number | undefined;
        const measure = () => {
          if (measured || state!.disposed) return;
          measured = true;
          window.clearTimeout(fallback);
          if (fallback !== undefined) state!.timers.delete(fallback);
          viewer.getCameraLookAt((error, camera) => {
            if (state!.disposed) return;
            if (error) {
              finish();
              return;
            }
            const delta = camera.position.map((p, i) => p - camera.target[i]);
            const baseline = {
              distance: Math.hypot(...delta),
              target: camera.target,
            };
            state!.baseline.set(viewportKey, baseline);
            apply(baseline);
          });
        };
        // The focus callback acknowledges the command before its camera animation ends.
        // Measure once at the official completion event, with a finite fallback for an already-fitted view.
        viewer.setCameraLookAtEndAnimationCallback((error) => {
          if (!error) measure();
        });
        viewer.focusOnVisibleGeometries((error) => {
          if (error) {
            measured = true;
            window.clearTimeout(fallback);
            finish();
          }
        });
        fallback = window.setTimeout(measure, 2600);
        state!.timers.add(fallback);
      });
    },
    () => !state!.disposed,
  );
}

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
  if (!sdk) {
    sdk = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
      script.async = true;
      const fail = () => {
        window.clearTimeout(timeout);
        script.onload = null;
        script.onerror = null;
        script.remove();
        sdk = undefined;
        reject(Error("Viewer SDK unavailable"));
      };
      const timeout = window.setTimeout(fail, 15000);
      script.onload = () => {
        window.clearTimeout(timeout);
        if (window.Sketchfab) resolve();
        else fail();
      };
      script.onerror = fail;
      document.head.append(script);
    });
  }
  return sdk;
}

type ViewerProps = ExteriorCameraOptions & {
  id: string;
  title: string;
  onFallback?: () => void;
  poster?: string;
  compact?: boolean;
  /** Start automatically only when visible. False leaves a poster until intent. */
  autoLoad?: boolean;
  /** Optional controlled activation. False unloads the hosted viewer completely. */
  active?: boolean;
  hideControls?: boolean;
  spin?: boolean;
  onInteraction?: () => void;
  materialOverrides?: readonly MaterialOverride[];
  hiddenNodeNames?: readonly string[];
  environmentOverrides?: EnvironmentOverrides;
  postProcessingOverrides?: Record<string, unknown>;
};
type Status = "idle" | "loading" | "slow" | "ready" | "error";

export default function ExteriorViewer({
  id,
  title,
  onFallback,
  poster,
  compact = false,
  autoLoad = true,
  active,
  hideControls = false,
  spin,
  onInteraction,
  materialOverrides,
  hiddenNodeNames,
  environmentOverrides,
  postProcessingOverrides,
  fitScale,
  cameraYaw,
  cameraElevation,
  initialDirection,
  modelRotation,
}: ViewerProps) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const api = useRef<ViewerAPI | null>(null);
  const ready = useRef(false);
  const authoredCamera = useRef<Camera | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const [eligibleId, setEligibleId] = useState<string | null>(null);
  const enabled = active ?? (autoLoad || requestedId === id);
  const shouldLoad = enabled && eligibleId === id;
  const [qualityChoice, setQualityChoice] = useState({ key: "", high: false });
  const authoredPostProcessing = useRef<Record<string, unknown> | null>(null);
  const appliedTextureQuality = useRef<"sd" | "hd" | null>(null);
  const overrideSignature = JSON.stringify(materialOverrides ?? []);
  const hiddenSignature = JSON.stringify(hiddenNodeNames ?? []);
  const environmentSignature = JSON.stringify(environmentOverrides ?? {});
  const postProcessingSignature = JSON.stringify(postProcessingOverrides ?? {});
  const cameraSignature = JSON.stringify({
    fitScale,
    cameraYaw,
    cameraElevation,
    initialDirection,
    modelRotation,
  });
  const cameraOptions = useMemo(
    () => JSON.parse(cameraSignature) as ExteriorCameraOptions,
    [cameraSignature],
  );
  const key = `${id}:${attempt}:${compact ? "hero" : "studio"}:${overrideSignature}:${hiddenSignature}:${environmentSignature}:${postProcessingSignature}:${cameraSignature}`;
  const [loadState, setLoadState] = useState<{ key: string; status: Status }>({
    key,
    status: "loading",
  });
  const status = !shouldLoad
    ? "idle"
    : loadState.key === key
      ? loadState.status
      : "loading";
  const highDetail = qualityChoice.key === key && qualityChoice.high;
  const [localSpin, setLocalSpin] = useState(false);
  const rotating = spin ?? localSpin;

  useEffect(() => {
    if (!enabled || !container.current) return;
    const element = container.current;
    const consider = () => {
      const bounds = element.getBoundingClientRect();
      if (!document.hidden && bounds.bottom > 0 && bounds.top < innerHeight)
        setEligibleId(id);
    };
    const observer = new IntersectionObserver(consider);
    observer.observe(element);
    document.addEventListener("visibilitychange", consider);
    consider();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", consider);
    };
  }, [enabled, id]);

  useEffect(() => {
    if (!shouldLoad) return;
    const hostFrame = iframe.current;
    const hostElement = container.current;
    const controller = new AbortController();
    let releaseStartup: (() => void) | undefined;
    let ownedViewer: ViewerAPI | null = null;
    let cancelled = false;
    let fitTimer: number | undefined;
    let started = false;
    ready.current = false;
    authoredCamera.current = null;
    authoredPostProcessing.current = null;
    appliedTextureQuality.current = null;
    const settle = (next: Status) => {
      if (cancelled) return;
      if (next === "error") {
        controller.abort();
        ownedViewer?.stop();
        if (ownedViewer) disposeViewerFit(ownedViewer);
        if (hostFrame) hostFrame.src = "about:blank";
      }
      if (next === "error" || next === "ready") releaseStartup?.();
      setLoadState({ key, status: next });
    };
    const slow = window.setTimeout(() => settle("slow"), 9000);
    const timeout = window.setTimeout(() => settle("error"), 45000);
    const clearTimers = () => {
      window.clearTimeout(slow);
      window.clearTimeout(timeout);
    };
    const visibility = () => {
      if (!ready.current || !api.current || !container.current) return;
      const bounds = container.current.getBoundingClientRect();
      const visible =
        !document.hidden && bounds.bottom > 0 && bounds.top < innerHeight;
      container.current.dataset.rendering = visible ? "active" : "paused";
      if (visible && !started) {
        api.current.start();
        started = true;
      } else if (!visible && started) {
        api.current.stop();
        started = false;
      }
    };
    const fit = () => {
      if (ready.current && api.current)
        fitViewer(api.current, container.current, cameraOptions, () => {
          api.current?.getCameraLookAt((err, camera) => {
            if (!cancelled && !controller.signal.aborted && !err)
              authoredCamera.current = camera;
          });
        });
    };
    const observer = new ResizeObserver(() => {
      window.clearTimeout(fitTimer);
      fitTimer = window.setTimeout(fit, 400);
    });
    const intersection = new IntersectionObserver(visibility);
    if (container.current) {
      observer.observe(container.current);
      intersection.observe(container.current);
    }
    document.addEventListener("visibilitychange", visibility);
    viewerStartupQueue
      .acquire(controller.signal)
      .then((release) => {
        releaseStartup = release;
        if (cancelled || controller.signal.aborted) {
          release();
          return;
        }
        setLoadState({ key, status: "loading" });
        return loadSDK();
      })
      .then(() => {
        if (
          cancelled ||
          controller.signal.aborted ||
          !iframe.current ||
          !window.Sketchfab
        )
          return;
        new window.Sketchfab(iframe.current).init(id, {
          ...viewerStartupOptions(compact),
          // The host enforces owner watermark and interface rights.
          success: (viewer: ViewerAPI) => {
            if (cancelled || controller.signal.aborted) return;
            ownedViewer = viewer;
            api.current = viewer;
            viewer.addEventListener("viewerready", async () => {
              if (cancelled || controller.signal.aborted) return;
              started = true;
              // Stream standard textures first; full HD remains an explicit option.
              // Original texture descriptors and material repairs are preserved.
              viewer.setTextureQuality("sd");
              appliedTextureQuality.current = "sd";
              viewer.setShadingStyle("pbr", { type: "lit" });
              const environment = JSON.parse(
                environmentSignature,
              ) as EnvironmentOverrides;
              if (Object.keys(environment).length)
                viewer.setEnvironment(environment);
              const hiddenNames = JSON.parse(hiddenSignature) as string[];
              if (hiddenNames.length)
                await new Promise<void>((resolve) => {
                  viewer.getNodeMap((error, nodes) => {
                    if (
                      cancelled ||
                      controller.signal.aborted ||
                      error ||
                      !nodes
                    ) {
                      resolve();
                      return;
                    }
                    const targets = Object.values(nodes).filter(
                      (node) => node.name && hiddenNames.includes(node.name),
                    );
                    let remaining = targets.length;
                    const hidden: string[] = [];
                    if (!remaining) {
                      resolve();
                      return;
                    }
                    for (const node of targets)
                      viewer.hide(node.instanceID, (hideError) => {
                        if (
                          !cancelled &&
                          !controller.signal.aborted &&
                          !hideError &&
                          node.name
                        ) {
                          hidden.push(node.name);
                          if (container.current)
                            container.current.dataset.hiddenNodes =
                              JSON.stringify(hidden);
                        }
                        if (!--remaining) resolve();
                      });
                  });
                });
              if (cancelled || controller.signal.aborted) return;
              const overrides = JSON.parse(
                overrideSignature,
              ) as MaterialOverride[];
              if (overrides.length)
                await new Promise<void>((resolve) =>
                  viewer.getMaterialList((error, materials) => {
                    if (
                      cancelled ||
                      controller.signal.aborted ||
                      error ||
                      !Array.isArray(materials)
                    ) {
                      resolve();
                      return;
                    }
                    const targets = materials.filter((source) =>
                      overrides.some((item) => item.name === source.name),
                    );
                    let remaining = targets.length;
                    if (!remaining) {
                      resolve();
                      return;
                    }
                    const applied: string[] = [];
                    for (const source of targets) {
                      const override = overrides.find(
                        (item) => item.name === source.name,
                      );
                      if (!override) continue;
                      const material = applyMaterialOverride(source, override);
                      viewer.setMaterial(material, (error) => {
                        if (
                          !cancelled &&
                          !controller.signal.aborted &&
                          !error
                        ) {
                          applied.push(source.name);
                          if (container.current)
                            container.current.dataset.materialsOverridden =
                              JSON.stringify(applied);
                        }
                        if (!--remaining) resolve();
                      });
                    }
                  }),
                );
              if (cancelled || controller.signal.aborted) return;
              viewer.getPostProcessing((settings) => {
                if (cancelled || controller.signal.aborted || !settings) return;
                authoredPostProcessing.current = settings;
                const requested = JSON.parse(postProcessingSignature) as Record<
                  string,
                  unknown
                >;
                const changes = viewerPostProcessing(
                  settings,
                  requested,
                  "standard",
                );
                viewer.setPostProcessing(changes);
              });
              viewer.setBackground({ color: [0.047, 0.059, 0.074] });
              viewer.setEnableCameraConstraints(false, {
                preventCameraConstraintsFocus: true,
              });
              // A ready SDK can still be fitting the car. Finish that pose before
              // showing controls or starting the turntable, and capture reset here.
              fitViewer(viewer, container.current, cameraOptions, () => {
                if (cancelled || controller.signal.aborted) return;
                viewer.getCameraLookAt((err, camera) => {
                  if (!cancelled && !controller.signal.aborted && !err)
                    authoredCamera.current = camera;
                });
                clearTimers();
                ready.current = true;
                settle("ready");
                visibility();
              });
            });
            viewer.start();
          },
          error: () => {
            clearTimers();
            settle("error");
          },
        });
      })
      .catch(() => {
        clearTimers();
        settle("error");
      });
    return () => {
      cancelled = true;
      controller.abort();
      releaseStartup?.();
      ownedViewer?.stop();
      if (ownedViewer) disposeViewerFit(ownedViewer);
      if (api.current === ownedViewer) api.current = null;
      // Tear down the captured frame, not a new frame mounted during navigation.
      // This ends the old renderer and aborts its in-flight hosted resources.
      if (hostFrame) hostFrame.src = "about:blank";
      ready.current = false;
      if (hostElement) {
        delete hostElement.dataset.rendering;
        delete hostElement.dataset.hiddenNodes;
        delete hostElement.dataset.materialsOverridden;
        delete hostElement.dataset.modelRotation;
      }
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      window.clearTimeout(fitTimer);
      clearTimers();
    };
  }, [
    shouldLoad,
    id,
    key,
    compact,
    overrideSignature,
    cameraSignature,
    cameraOptions,
    hiddenSignature,
    environmentSignature,
    postProcessingSignature,
  ]);

  useEffect(() => {
    if (status !== "ready" || !api.current) return;
    if (container.current)
      container.current.dataset.detail = highDetail ? "high" : "standard";
    const desired = highDetail ? "hd" : "sd";
    if (appliedTextureQuality.current === desired) return;
    api.current.setTextureQuality(desired);
    appliedTextureQuality.current = desired;
    const authored = authoredPostProcessing.current;
    if (authored)
      api.current.setPostProcessing(
        viewerPostProcessing(
          authored,
          JSON.parse(postProcessingSignature) as Record<string, unknown>,
          highDetail ? "high" : "standard",
        ),
      );
  }, [highDetail, status, postProcessingSignature]);

  useEffect(() => {
    if (!rotating || status !== "ready") return;
    let cancelled = false;
    let frame = 0;
    let previous = 0;
    let origin: Camera | null = null;
    let elapsed = 0;
    let lastActive = 0;
    api.current?.getCameraLookAt((error, camera) => {
      if (!cancelled && !error) origin = camera;
    });
    const visible = () => {
      const bounds = container.current?.getBoundingClientRect();
      return (
        !document.hidden &&
        !!bounds &&
        bounds.bottom > 0 &&
        bounds.top < innerHeight
      );
    };
    const turn = (time: number) => {
      frame = 0;
      if (cancelled || !visible()) {
        lastActive = 0;
        return;
      }
      if (origin && !document.hidden && time - previous > 120) {
        const bounds = container.current?.getBoundingClientRect();
        if (bounds && bounds.bottom > 0 && bounds.top < innerHeight) {
          if (lastActive) elapsed += time - lastActive;
          lastActive = time;
          const angle = elapsed * 0.00012;
          const [x, y, z] = origin.position.map(
            (p, i) => p - origin!.target[i],
          );
          api.current?.setCameraLookAt(
            [
              origin.target[0] + x * Math.cos(angle) - y * Math.sin(angle),
              origin.target[1] + x * Math.sin(angle) + y * Math.cos(angle),
              origin.target[2] + z,
            ],
            origin.target,
            0.12,
          );
        } else lastActive = 0;
        previous = time;
      } else if (document.hidden) lastActive = 0;
      frame = requestAnimationFrame(turn);
    };
    const sync = () => {
      if (visible()) {
        if (!frame) frame = requestAnimationFrame(turn);
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
        lastActive = 0;
      }
    };
    const observer = new IntersectionObserver(sync);
    if (container.current) observer.observe(container.current);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [rotating, status, key]);

  function pauseInteraction() {
    setLocalSpin(false);
    onInteraction?.();
  }
  function zoom(factor: number) {
    pauseInteraction();
    const viewer = api.current;
    viewer?.getCameraLookAt((err, camera) => {
      if (!err && viewer === api.current)
        viewer.setCameraLookAt(
          camera.position.map(
            (p, i) => camera.target[i] + (p - camera.target[i]) * factor,
          ),
          camera.target,
          0.3,
        );
    });
  }
  function reset() {
    pauseInteraction();
    const camera = authoredCamera.current;
    if (camera)
      api.current?.setCameraLookAt(camera.position, camera.target, 0.5);
    else if (api.current)
      fitViewer(api.current, container.current, cameraOptions);
  }
  const messages = {
    idle: "",
    loading: "Loading detailed 3D model",
    slow: "The 3D model is taking a little longer",
    error: "Interactive 3D is unavailable right now",
    ready: "",
  };
  return (
    <div
      className={`exterior-viewer realistic-viewer ${compact ? "exterior-compact" : ""}`}
      ref={container}
      data-viewer-status={status}
      data-status={status}
      data-model-id={id}
    >
      {poster && status !== "ready" && (
        <img
          className="exterior-poster"
          src={poster}
          alt={`${title} creator preview`}
          decoding="async"
          draggable={false}
        />
      )}
      {shouldLoad && (
        <iframe
          key={key}
          ref={iframe}
          title={title}
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className={
            status === "ready" ? "exterior-frame ready" : "exterior-frame"
          }
        />
      )}
      {status === "idle" ? (
        active === undefined && (
          <button className="exterior-start" onClick={() => setRequestedId(id)}>
            <Play size={18} /> Load interactive 3D
          </button>
        )
      ) : status === "ready" ? (
        !hideControls && (
          <div
            className="exterior-actions"
            aria-label="Exterior model controls"
            role="group"
          >
            <button
              onClick={() => zoom(0.8)}
              aria-label="Zoom exterior in"
              title="Zoom in"
            >
              <ZoomIn size={15} />
            </button>
            <button
              onClick={() => zoom(1.25)}
              aria-label="Zoom exterior out"
              title="Zoom out"
            >
              <ZoomOut size={15} />
            </button>
            <button
              onClick={() => {
                pauseInteraction();
                if (api.current)
                  fitViewer(api.current, container.current, cameraOptions);
              }}
              aria-label="Fit whole car"
              title="Fit whole car"
            >
              <Maximize2 size={15} />
            </button>
            <button
              onClick={reset}
              aria-label="Reset exterior camera"
              title="Reset camera"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={() => setQualityChoice({ key, high: !highDetail })}
              aria-label={
                highDetail
                  ? "Use standard 3D quality"
                  : "Load high detail 3D textures"
              }
              aria-pressed={highDetail}
              title={
                highDetail ? "High detail enabled" : "Load high detail textures"
              }
            >
              {highDetail ? <Sparkles size={15} /> : <Image size={15} />}
            </button>
            {spin === undefined && (
              <button
                onClick={() => setLocalSpin(!localSpin)}
                aria-pressed={localSpin}
                aria-label={
                  localSpin
                    ? "Pause exterior turntable"
                    : "Start exterior turntable"
                }
                title="Turntable"
              >
                {localSpin ? <Pause size={15} /> : <Play size={15} />}
              </button>
            )}
          </div>
        )
      ) : (
        <div
          className={`exterior-load-state ${poster ? "with-poster" : ""}`}
          role="status"
          aria-live="polite"
        >
          <div className="exterior-load-message">
            {status !== "error" && (
              <span className="exterior-spinner" aria-hidden="true" />
            )}
            <span>{messages[status]}</span>
          </div>
          {poster && status === "error" && (
            <small>Creator preview shown above</small>
          )}
          <div className="exterior-load-links">
            {(status === "slow" || status === "error") && (
              <button onClick={() => setAttempt((value) => value + 1)}>
                Try again
              </button>
            )}
            {onFallback && (
              <button onClick={onFallback}>Engineering study</button>
            )}
            {status === "error" && (
              <a
                href={`https://sketchfab.com/3d-models/${id}`}
                target="_blank"
                rel="noreferrer"
              >
                Open creator model <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
