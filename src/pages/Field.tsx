import { Search, X } from "lucide-react";
import {
  carById,
  cars,
  classInfo,
  classOrder,
  entrySource,
} from "../data/cars.ts";
import type { ClassName } from "../data/cars.ts";
import { classPanel, entries, surname } from "../data/entries.ts";
import { platformLabel } from "../data/systems.ts";
import { linkProps, navigate } from "../router.ts";
import StudyImage from "../components/StudyImage.tsx";
import "./Pages.css";

type Filter = "All" | ClassName;
type Mode = "entries" | "cars";
type Sort = "grid" | "number" | "name";
const normalise = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae");

export default function Field({ params }: { params: URLSearchParams }) {
  const selectedClass = params.get("class") as ClassName | null;
  const filter: Filter =
    selectedClass && classOrder.includes(selectedClass) ? selectedClass : "All";
  const mode: Mode = params.get("view") === "cars" ? "cars" : "entries";
  const q = params.get("q") ?? "";
  const sort: Sort =
    params.get("sort") === "number"
      ? "number"
      : params.get("sort") === "name"
        ? "name"
        : "grid";
  const update = (next: {
    filter?: Filter;
    mode?: Mode;
    q?: string;
    sort?: Sort;
  }) => {
    const f = next.filter ?? filter;
    const m = next.mode ?? mode;
    const order = next.sort ?? sort;
    navigate(
      "field",
      {
        class: f === "All" ? undefined : f,
        view: m === "cars" ? "cars" : undefined,
        q: next.q === undefined ? q : next.q || undefined,
        sort: order === "grid" ? undefined : order,
      },
      true,
    );
  };
  const query = normalise(q.trim());
  const list = (() => {
    const result = entries.filter((e) => {
      const car = carById(e.carId)!;
      if (filter !== "All" && car.category !== filter) return false;
      return (
        !query ||
        normalise(
          [
            e.number,
            e.team,
            car.make,
            car.name,
            e.nation,
            car.platform,
            car.engine.label,
            ...e.drivers,
          ].join(" "),
        ).includes(query)
      );
    });
    if (sort === "number")
      return result.toSorted((a, b) => Number(a.number) - Number(b.number));
    if (sort === "name")
      return result.toSorted((a, b) => a.team.localeCompare(b.team));
    return result;
  })();
  const carList = (() => {
    const result = cars.filter((c) => {
      if (filter !== "All" && c.category !== filter) return false;
      const crews = entries.filter((e) => e.carId === c.id);
      return (
        !query ||
        normalise(
          [
            c.make,
            c.name,
            c.category,
            c.platform,
            c.engine.label,
            ...crews.flatMap((e) => [e.number, e.team, e.nation, ...e.drivers]),
          ].join(" "),
        ).includes(query)
      );
    });
    if (sort === "name")
      return result.toSorted((a, b) =>
        `${a.make} ${a.name}`.localeCompare(`${b.make} ${b.name}`),
      );
    if (sort === "number")
      return result.toSorted(
        (a, b) =>
          Math.min(
            ...entries
              .filter((e) => e.carId === a.id)
              .map((e) => Number(e.number)),
          ) -
          Math.min(
            ...entries
              .filter((e) => e.carId === b.id)
              .map((e) => Number(e.number)),
          ),
      );
    return result;
  })();
  const resultCount = mode === "entries" ? list.length : carList.length;
  const countIn = (c: Filter) =>
    c === "All"
      ? entries.length
      : entries.filter((e) => carById(e.carId)?.category === c).length;
  return (
    <main className="content field-page">
      <div className="page-head field-head">
        <h1>The 2026 field</h1>
        <p className="lead">
          {entries.length} entries in {cars.length} car designs, from the
          provisional list of 5 May 2026. Filter by class or search for a team
          or driver, then open any car. The pictures are colour studies, not
          official artwork.
        </p>
      </div>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Filter by class">
          {(["All", ...classOrder] as Filter[]).map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              style={
                f !== "All"
                  ? ({ "--cls": classInfo[f].color } as React.CSSProperties)
                  : undefined
              }
              onClick={() => update({ filter: f })}
            >
              {f !== "All" && <i className="dot" />}
              {f}
              <span className="seg-count">{countIn(f)}</span>
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Show">
          {(["entries", "cars"] as Mode[]).map((m) => (
            <button
              key={m}
              aria-pressed={mode === m}
              onClick={() => update({ mode: m })}
            >
              {m === "entries" ? "Entries" : "Car designs"}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={16} />
          <input
            type="search"
            aria-label="Search the field"
            placeholder="Team, driver, number or car"
            value={q}
            onChange={(e) => update({ q: e.target.value })}
          />
          {q && (
            <button aria-label="Clear search" onClick={() => update({ q: "" })}>
              <X size={14} />
            </button>
          )}
        </label>
        <label className="select">
          <span>Sort by</span>
          <select
            aria-label="Sort the field"
            value={sort}
            onChange={(e) => update({ sort: e.target.value as Sort })}
          >
            <option value="grid">Class</option>
            <option value="number">Car number</option>
            <option value="name">
              {mode === "entries" ? "Team name" : "Manufacturer"}
            </option>
          </select>
        </label>
      </div>
      <p className="field-results" role="status" aria-live="polite">
        {resultCount}{" "}
        {mode === "entries"
          ? resultCount === 1
            ? "entry"
            : "entries"
          : resultCount === 1
            ? "car design"
            : "car designs"}
        {filter !== "All" ? ` in ${filter}` : ""}
        {q ? ` matching “${q}”` : ""}
      </p>
      {filter !== "All" && (
        <div
          className="class-banner"
          style={{ "--cls": classInfo[filter].color } as React.CSSProperties}
        >
          <strong>{classInfo[filter].tagline}</strong>
          <p>{classInfo[filter].text}</p>
        </div>
      )}
      {mode === "entries" ? (
        <div className="entry-grid">
          {list.map((e) => {
            const car = carById(e.carId)!;
            return (
              <a
                key={e.number}
                className="entry-card"
                style={
                  { "--cls": classPanel[car.category] } as React.CSSProperties
                }
                {...linkProps("car", { car: car.id, entry: e.number })}
              >
                <StudyImage
                  entry={e.number}
                  alt={`Number ${e.number}, ${e.team} ${car.make} ${car.name} colour study`}
                />
                <div className="entry-body">
                  <span className="plate">{e.number}</span>
                  <div>
                    <strong>
                      {car.make} {car.name}
                    </strong>
                    <span className="entry-team">{e.team}</span>
                  </div>
                </div>
                <p className="entry-crew">
                  {e.drivers.map((d) => surname(d)).join(", ")}
                </p>
                <p className="entry-meta">
                  <span className="cls-tag">{car.category}</span>
                  {e.proAm && <span>Pro-Am</span>}
                  <span>{e.nation}</span>
                </p>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="model-grid">
          {carList.map((c) => {
            const list = entries.filter((e) => e.carId === c.id);
            return (
              <a
                key={c.id}
                className="model-card"
                style={
                  { "--cls": classPanel[c.category] } as React.CSSProperties
                }
                {...linkProps("car", { car: c.id })}
              >
                <StudyImage
                  car={c.id}
                  alt={`${c.make} ${c.name} colour study`}
                />
                <span className="cls-tag">{c.category}</span>
                <h2>
                  {c.make} {c.name}
                </h2>
                <p>
                  {c.engine.label}. {platformLabel(c)},{" "}
                  {c.hybrid ? "hybrid" : "non-hybrid"}.
                </p>
                <div className="model-numbers">
                  {list.map((e) => (
                    <span key={e.number} className="plate small">
                      {e.number}
                    </span>
                  ))}
                </div>
              </a>
            );
          })}
        </div>
      )}
      {((mode === "entries" && !list.length) ||
        (mode === "cars" && !carList.length)) && (
        <div className="empty">
          <h2>No {mode === "entries" ? "entries" : "car designs"} match</h2>
          <p>Try a car number, a manufacturer or a driver's surname.</p>
          <button
            className="btn secondary"
            onClick={() => update({ q: "", filter: "All", sort: "grid" })}
          >
            Clear filters
          </button>
        </div>
      )}
      <p className="source-note">
        Numbers, teams and crews come from the FIA WEC 2026 Le Mans provisional
        entry list, version 2, dated 5 May 2026. The final grid may differ.{" "}
        <a href={entrySource} target="_blank" rel="noreferrer">
          Read the entry list (PDF)
        </a>
      </p>
    </main>
  );
}
