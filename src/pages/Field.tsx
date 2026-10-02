import { ArrowUpRight, Search, X } from "lucide-react";
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
import CarPreview from "../components/CarPreview.tsx";
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
  return (
    <main className="content field-page">
      <div className="page-head">
        <span className="kicker">The 2026 field</span>
        <h1>
          {entries.length} entries. <em>{cars.length} designs.</em>
        </h1>
        <p className="lead">
          Meet the machines that share the same 13.6 kilometres. Compare all
          three classes, find a favourite crew, then explore what sits beneath
          the bodywork.
        </p>
      </div>
      <div className="field-overview" aria-label="Field by class">
        {classOrder.map((c) => (
          <button
            key={c}
            className={filter === c ? "on" : ""}
            style={{ "--cls": classInfo[c].color } as React.CSSProperties}
            onClick={() => update({ filter: filter === c ? "All" : c })}
            aria-pressed={filter === c}
          >
            <span>
              <i className="dot" />
              {c}
            </span>
            <strong>
              {entries.filter((e) => carById(e.carId)?.category === c).length}
            </strong>
            <small>
              <span className="overview-entry-label">entries · </span>
              {cars.filter((car) => car.category === c).length}{" "}
              {cars.filter((car) => car.category === c).length === 1
                ? "design"
                : "designs"}
            </small>
          </button>
        ))}
      </div>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Filter by class">
          {(["All", ...classOrder] as Filter[]).map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              className={filter === f ? "on" : ""}
              style={
                f !== "All"
                  ? ({ "--cls": classInfo[f].color } as React.CSSProperties)
                  : undefined
              }
              onClick={() => update({ filter: f })}
            >
              {f !== "All" && <i className="dot" />}
              {f}
            </button>
          ))}
        </div>
        <div className="seg small" role="group" aria-label="Show">
          {(["entries", "cars"] as Mode[]).map((m) => (
            <button
              key={m}
              aria-pressed={mode === m}
              className={mode === m ? "on" : ""}
              onClick={() => update({ mode: m })}
            >
              {m === "entries" ? "Entries" : "Car models"}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={16} />
          <input
            type="search"
            aria-label="Search the field"
            placeholder="Search team, driver, number or car"
            value={q}
            onChange={(e) => update({ q: e.target.value })}
          />
          {q && (
            <button aria-label="Clear search" onClick={() => update({ q: "" })}>
              <X size={14} />
            </button>
          )}
        </label>
      </div>
      <div className="field-results">
        <p role="status" aria-live="polite">
          <strong>{resultCount}</strong>{" "}
          {mode === "entries"
            ? resultCount === 1
              ? "entry"
              : "entries"
            : resultCount === 1
              ? "car design"
              : "car designs"}
          {filter !== "All" ? ` in ${filter}` : " across all classes"}
          {q ? ` matching “${q}”` : ""}
        </p>
        <label>
          Sort by{" "}
          <select
            aria-label="Sort the field"
            value={sort}
            onChange={(e) => update({ sort: e.target.value as Sort })}
          >
            <option value="grid">Class / grid order</option>
            <option value="number">Car number</option>
            <option value="name">
              {mode === "entries" ? "Team name" : "Manufacturer"}
            </option>
          </select>
        </label>
      </div>
      {filter !== "All" && (
        <div
          className="class-banner"
          style={{ "--cls": classInfo[filter].color } as React.CSSProperties}
        >
          <strong>{filter}</strong>
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
                  {
                    "--cls": classInfo[car.category].color,
                  } as React.CSSProperties
                }
                {...linkProps("car", { car: car.id, entry: e.number })}
              >
                <div
                  className="entry-visual"
                  style={
                    {
                      "--base": e.livery.base,
                      "--second": e.livery.second,
                    } as React.CSSProperties
                  }
                >
                  <CarPreview car={car} label />
                </div>
                <div className="entry-body">
                  <span
                    className="plate"
                    style={{ background: classPanel[car.category] }}
                  >
                    {e.number}
                  </span>
                  <div>
                    <span className="entry-team">{e.team}</span>
                    <strong>
                      {car.make} {car.name}
                    </strong>
                  </div>
                </div>
                <div className="entry-crew">
                  {e.drivers.map((d) => (
                    <span key={d} title={d}>
                      {surname(d)}
                    </span>
                  ))}
                </div>
                <div className="entry-meta">
                  <span className="entry-class">
                    <i className="dot" />
                    {car.category}
                  </span>
                  {e.proAm && <span>Pro-Am</span>}
                  <span>{e.nation}</span>
                  <span className="swatches" aria-hidden="true">
                    <i style={{ background: e.livery.base }} />
                    <i style={{ background: e.livery.second }} />
                    <i style={{ background: e.livery.accent }} />
                  </span>
                </div>
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
                  {
                    "--cls": classInfo[c.category].color,
                  } as React.CSSProperties
                }
                {...linkProps("car", { car: c.id })}
              >
                <CarPreview car={c} label />
                <div>
                  <span className="cls-tag">{c.category}</span>
                  <h2>
                    {c.make} <strong>{c.name}</strong>
                  </h2>
                  <p>{c.engine.label}</p>
                  <p className="muted">
                    {platformLabel(c)} · {c.hybrid ? "Hybrid" : "Non-hybrid"}
                  </p>
                  <div className="model-numbers">
                    {list.map((e) => (
                      <span
                        key={e.number}
                        className="plate small"
                        style={{ background: classPanel[c.category] }}
                      >
                        {e.number}
                      </span>
                    ))}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
      {((mode === "entries" && !list.length) ||
        (mode === "cars" && !carList.length)) && (
        <div className="empty">
          <h2>No {mode === "entries" ? "entries" : "car designs"} found</h2>
          <p>
            Try a car number, manufacturer or driver surname, or reset your
            filters.
          </p>
          <button
            className="btn ghost"
            onClick={() => update({ q: "", filter: "All", sort: "grid" })}
          >
            Reset filters
          </button>
        </div>
      )}
      <p className="source-note">
        Numbers, teams and crews: FIA WEC 2026 Le Mans provisional entry list
        V2, 5 May 2026. It is a dated snapshot, and the final grid may differ.
        Liveries are colour studies based on each entry, not official artwork.{" "}
        <a href={entrySource} target="_blank" rel="noreferrer">
          Entry list PDF <ArrowUpRight size={12} />
        </a>
      </p>
    </main>
  );
}
