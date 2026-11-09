import { Moon, Sun, Sunrise, Sunset } from "lucide-react";
import type { Phase } from "../data/racePhase.ts";

export const phaseIcon: Record<Phase, typeof Sun> = {
  day: Sun,
  dusk: Sunset,
  night: Moon,
  dawn: Sunrise,
};
