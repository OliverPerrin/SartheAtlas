let stylesheet: Promise<void> | undefined;

// The page can paint with its system fallbacks while the optional web fonts load.
export function activateFontStyles() {
  if (typeof document === "undefined") return Promise.resolve();
  if (!stylesheet)
    stylesheet = new Promise<void>((resolve) => {
      const link = document.getElementById(
        "site-fonts",
      ) as HTMLLinkElement | null;
      if (!link) {
        resolve();
        return;
      }
      const finish = () => {
        link.media = "all";
        resolve();
      };
      if (link.sheet) finish();
      else {
        link.addEventListener("load", finish, { once: true });
        link.addEventListener("error", () => resolve(), { once: true });
      }
    });
  return stylesheet;
}
