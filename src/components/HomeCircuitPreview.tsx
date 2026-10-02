import { useTrack } from "../data/trackGeo.ts";
import TrackMap from "./TrackMap.tsx";

export default function HomeCircuitPreview() {
  const { track } = useTrack({ context: false });
  return track ? <TrackMap track={track} labels={false} /> : null;
}
