import { useEffect, useState } from "react";
import { activateFontStyles } from "../data/fontLoading.ts";

let ready = false;
const loading =
  typeof document !== "undefined" && document.fonts
    ? Promise.race([
        activateFontStyles().then(() =>
          Promise.all([
            document.fonts.load("800 60px 'Barlow Condensed'"),
            document.fonts.load("italic 800 60px 'Barlow Condensed'"),
            document.fonts.load("700 20px 'DM Sans'"),
          ]),
        ),
        new Promise((r) => setTimeout(r, 2500)),
      ]).then(() => {
        ready = true;
      })
    : Promise.resolve();

// Canvas-painted liveries need the web fonts to be loaded before they are drawn.
export function useFonts() {
  const [ok, setOk] = useState(ready);
  useEffect(() => {
    if (!ok) void loading.then(() => setOk(true));
  }, [ok]);
  return ok;
}
