import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CornerDownLeft, Search } from "lucide-react";
import { carById, cars, classInfo, classOrder } from "../data/cars.ts";
import { entries } from "../data/entries.ts";
import { navigate } from "../router.ts";
import type { Page } from "../router.ts";
import { CloseButton } from "./Chrome.tsx";
import "./CommandPalette.css";

type Item = {
  id: string;
  group: string;
  label: string;
  hint: string;
  color?: string;
  keywords: string;
  go: () => void;
};

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function buildItems(): Item[] {
  const pages: [Page, string, string][] = [
    ["home", "Home", "The endurance explorer"],
    ["field", "The 2026 field", "62 entries, three classes"],
    ["car", "Car explorer", "Exteriors and engineering studies"],
    ["circuit", "Circuit de la Sarthe", "Aerial atlas and lap study"],
    ["about", "Sources & accuracy", "Where every fact comes from"],
  ];
  return [
    ...pages.map(([page, label, hint]) => ({
      id: `page-${page}`,
      group: "Pages",
      label,
      hint,
      keywords: `${label} ${hint} ${page}`,
      go: () => navigate(page),
    })),
    ...classOrder.map((category) => ({
      id: `class-${category}`,
      group: "Classes",
      label: category,
      hint: classInfo[category].tagline,
      color: classInfo[category].color,
      keywords: `${category} class ${classInfo[category].tagline}`,
      go: () => navigate("field", { class: category }),
    })),
    ...cars.map((car) => ({
      id: `car-${car.id}`,
      group: "Cars",
      label: `${car.make} ${car.name}`,
      hint: `${car.category} · ${car.engine.label}`,
      color: classInfo[car.category].color,
      keywords: `${car.make} ${car.name} ${car.category} ${car.platform} ${car.engine.label}`,
      go: () => navigate("car", { car: car.id }),
    })),
    ...(
      [
        ["garage", "Teardown · garage layout"],
        ["build", "Teardown · build sequence"],
        ["tunnel", "Teardown · wind tunnel"],
      ] as const
    ).map(([view, label]) => ({
      id: `view-${view}`,
      group: "Studio",
      label,
      hint: "Ferrari 499P engineering study",
      keywords: `${label} teardown studio engineering ${view}`,
      go: () => navigate("car", { car: "ferrari", view }),
    })),
    ...entries.map((entry) => {
      const car = carById(entry.carId)!;
      return {
        id: `entry-${entry.number}`,
        group: "Entries",
        label: `#${entry.number} ${entry.team}`,
        hint: `${car.make} ${car.name} · ${entry.drivers.join(", ")}`,
        color: classInfo[car.category].color,
        keywords: `#${entry.number} ${entry.number} ${entry.team} ${car.make} ${car.name} ${entry.nation} ${entry.drivers.join(" ")}`,
        go: () => navigate("car", { car: car.id, entry: entry.number }),
      };
    }),
  ];
}

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const items = useMemo(() => buildItems(), []);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const results = useMemo(() => {
    const terms = fold(query.trim()).split(/\s+/).filter(Boolean);
    if (!terms.length)
      return items.filter((item) => item.group !== "Entries").slice(0, 14);
    return items
      .map((item) => {
        const haystack = fold(item.keywords);
        const label = fold(item.label);
        if (!terms.every((term) => haystack.includes(term))) return null;
        const score =
          (label.startsWith(terms[0]) ? 0 : 1) +
          (item.group === "Entries" ? 0.5 : 0);
        return { item, score };
      })
      .filter((result) => result !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 40)
      .map((result) => result.item);
  }, [items, query]);

  useEffect(() => {
    input.current?.focus();
    const previous = document.activeElement as HTMLElement | null;
    document.documentElement.classList.add("palette-open");
    return () => {
      document.documentElement.classList.remove("palette-open");
      previous?.focus?.();
    };
  }, []);
  useEffect(() => {
    list.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (item: Item | undefined) => {
    if (!item) return;
    onClose();
    item.go();
  };
  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab") {
      event.preventDefault();
    }
  };

  return (
    <div className="cmdp-backdrop" onMouseDown={onClose}>
      <div
        className="cmdp"
        role="dialog"
        aria-modal="true"
        aria-label="Search the atlas"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onKey}
      >
        <div className="cmdp-input">
          <Search size={18} />
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={
              results[active] ? `palette-${results[active].id}` : undefined
            }
            aria-autocomplete="list"
            placeholder="Search cars, entries, drivers, pages…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
          />
          <CloseButton onClick={onClose} />
        </div>
        <ul id="palette-results" role="listbox" ref={list} aria-label="Results">
          {results.map((item, index) => {
            const heading =
              item.group !== results[index - 1]?.group ? item.group : null;
            return (
              <li key={item.id} role="presentation">
                {heading && (
                  <span className="cmdp-group" aria-hidden="true">
                    {heading}
                  </span>
                )}
                <div
                  id={`palette-${item.id}`}
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  className="cmdp-item"
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(item)}
                >
                  <i style={{ background: item.color ?? "var(--accent)" }} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                  {index === active ? (
                    <CornerDownLeft size={14} />
                  ) : (
                    <ArrowUpRight size={14} />
                  )}
                </div>
              </li>
            );
          })}
          {!results.length && (
            <li className="cmdp-empty">
              Nothing matches “{query}”. Try a car number, team or driver.
            </li>
          )}
        </ul>
        <div className="cmdp-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
          <span className="cmdp-count">{results.length} results</span>
        </div>
      </div>
    </div>
  );
}
