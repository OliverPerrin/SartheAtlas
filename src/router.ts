import { useEffect, useState } from "react";

export type Page = "home" | "field" | "car" | "circuit" | "about";
const pages: Page[] = ["home", "field", "car", "circuit", "about"];

export type Route = { page: Page; params: URLSearchParams };

function read(): Route {
  const params = new URLSearchParams(location.search);
  const p = params.get("page") as Page | null;
  // Older links used page=explorer / page=garage.
  const legacy = p === ("explorer" as Page) ? "car" : p === ("garage" as Page) ? "field" : p;
  return { page: legacy && pages.includes(legacy) ? legacy : params.get("car") ? "car" : "home", params };
}

const listeners = new Set<() => void>();

export function navigate(page: Page, params: Record<string, string | undefined> = {}, replace = false) {
  const url = new URL(location.href);
  url.search = "";
  if (page !== "home") url.searchParams.set("page", page);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  if (replace) history.replaceState(null, "", url);
  else {
    history.pushState(null, "", url);
    window.scrollTo({ top: 0 });
  }
  listeners.forEach((l) => l());
}

export function href(page: Page, params: Record<string, string | undefined> = {}) {
  const u = new URLSearchParams();
  if (page !== "home") u.set("page", page);
  for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
  const s = u.toString();
  return s ? `?${s}` : "./";
}

export function useRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const update = () => setRoute(read());
    listeners.add(update);
    window.addEventListener("popstate", update);
    return () => {
      listeners.delete(update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  return route;
}

export function linkProps(page: Page, params: Record<string, string | undefined> = {}) {
  return {
    href: href(page, params),
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(page, params);
    },
  };
}
