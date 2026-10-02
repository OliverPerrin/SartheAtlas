// Three.js owns this mutable renderer service. Keep its imperative shadow-map
// controls separate from React hook values and request refresh only for scene
// geometry/lighting changes, rather than for every orbit-camera frame.
type ShadowRenderer = {
  shadowMap: { autoUpdate: boolean; needsUpdate: boolean };
};

export function refreshShadows(renderer: ShadowRenderer) {
  renderer.shadowMap.needsUpdate = true;
}

export function cacheStaticShadows(renderer: ShadowRenderer) {
  renderer.shadowMap.autoUpdate = false;
  refreshShadows(renderer);
}
