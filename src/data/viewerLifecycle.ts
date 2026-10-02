export type ViewerDetail = "standard" | "high";

// Only documented host options: defer texture preload and unused inspector data.
// No mesh decimation or hard texture-resolution ceiling is introduced.
export function viewerStartupOptions(compact: boolean) {
  return {
    autostart: 0,
    preload: 0,
    wireframe_preload: 0,
    ui_inspector: 0,
    camera: 0,
    dnt: 1,
    ui_theme: "dark",
    animation_autoplay: 0,
    annotations_visible: 0,
    dof_circle: 0,
    scrollwheel: compact ? 0 : 1,
    ui_infos: 0,
    ui_controls: 0,
    ui_hint: 0,
  };
}

export function viewerPostProcessing(
  authored: Record<string, unknown>,
  requested: Record<string, unknown>,
  detail: ViewerDetail,
) {
  const changes: Record<string, unknown> = { enable: true };
  for (const key of [
    "grainEnable",
    "bloomEnable",
    "sharpenEnable",
    "dofEnable",
    "chromaticAberrationEnable",
  ])
    if (Object.hasOwn(authored, key)) changes[key] = false;
  if (Object.hasOwn(authored, "ssaoEnable")) changes.ssaoEnable = true;
  if (Object.hasOwn(authored, "ssrEnable"))
    changes.ssrEnable = authored.ssrEnable;
  for (const [key, value] of Object.entries(requested))
    if (Object.hasOwn(authored, key)) changes[key] = value;
  if (detail === "standard")
    for (const key of ["ssaoEnable", "ssrEnable"])
      if (Object.hasOwn(authored, key)) changes[key] = false;
  return changes;
}

// Serialize expensive hosted bootstrap, with cancelled navigation removed from
// the queue. A ready scene releases the slot; its rendering is visibility managed.
export class ViewerStartupQueue {
  private occupied = false;
  private waiting: (() => void)[] = [];

  acquire(signal: AbortSignal): Promise<() => void> {
    return new Promise((resolve, reject) => {
      const abort = () => {
        this.waiting = this.waiting.filter((item) => item !== begin);
        reject(new DOMException("Viewer startup cancelled", "AbortError"));
      };
      const begin = () => {
        signal.removeEventListener("abort", abort);
        if (signal.aborted) {
          abort();
          this.next();
          return;
        }
        this.occupied = true;
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          this.next();
        });
      };
      if (signal.aborted) {
        abort();
        return;
      }
      signal.addEventListener("abort", abort, { once: true });
      if (this.occupied) this.waiting.push(begin);
      else begin();
    });
  }

  private next() {
    const begin = this.waiting.shift();
    if (begin) begin();
    else this.occupied = false;
  }
}

export const viewerStartupQueue = new ViewerStartupQueue();
