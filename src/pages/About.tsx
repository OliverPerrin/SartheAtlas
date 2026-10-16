import { ArrowUpRight } from "lucide-react";
import { carById, entrySource } from "../data/cars.ts";
import { exteriorReferences } from "../data/references.ts";
import { ruleInfo } from "../data/systems.ts";
import type { Rule } from "../data/systems.ts";
import { linkProps } from "../router.ts";
import "./Pages.css";

export default function About() {
  return (
    <main className="content about">
      <div className="page-head">
        <span className="kicker">Sources & accuracy</span>
        <h1>
          What you are <em>looking at.</em>
        </h1>
        <p className="lead">
          Sarthe Atlas is an independent guide. Here is where each piece of
          information comes from, and where the 3D models are approximations.
        </p>
      </div>
      <div className="accuracy-summary">
        <div>
          <span className="kicker">The reference</span>
          <strong>Public technical sources</strong>
          <p>
            Entry details, powertrain layouts and circuit geometry are
            source-linked.
          </p>
        </div>
        <div>
          <span className="kicker">The interpretation</span>
          <strong>Models built to explain</strong>
          <p>
            Surface detail, colour studies and driving speeds are educational
            approximations.
          </p>
        </div>
      </div>
      <div className="about-grid">
        <article>
          <span className="kicker">01 · The entry list</span>
          <h2>62 entries, dated 5 May 2026</h2>
          <p>
            Car numbers, teams, crews and nationalities follow the FIA WEC
            provisional entry list V2. It is a snapshot: driver changes and
            reserve entries after that date are not reflected.
          </p>
          <a href={entrySource} target="_blank" rel="noreferrer">
            FIA WEC entry list (PDF) <ArrowUpRight size={14} />
          </a>
        </article>
        <article>
          <span className="kicker">02 · The 3D cars</span>
          <h2>Detailed exteriors, separate cutaways</h2>
          <p>
            The default view uses detailed creator-hosted exterior models, with
            each model’s original materials and finish. Its year, variant and
            uploader remain labelled; a model can depict an earlier car or a
            related track variant.
          </p>
          <p>
            The engineering cutaway contains detailed cockpit controls,
            hydraulic and electrical routing, engine and transmission hardware,
            cooling circuits and wheel-end assemblies. Manufacturer sources
            establish the architecture; component positions and dimensions are
            illustrative. Selecting a system opens its component roles,
            interfaces and technical sources.
          </p>
        </article>
        <article>
          <span className="kicker">03 · Parts & powertrains</span>
          <h2>Architecture and assembly detail</h2>
          <p>
            Engine configuration (cylinder count, V angle, turbocharging,
            position), hybrid axle, gearbox and chassis supplier come from
            public sources for each car. Internal positions and shapes are representative engineering
            studies, not verified manufacturer assemblies.
          </p>
          <div className="legend-list">
            {(Object.keys(ruleInfo) as Rule[]).map((r) => (
              <div key={r}>
                <i style={{ background: ruleInfo[r].color }} />
                <div>
                  <strong>{ruleInfo[r].label}</strong>
                  <p>{ruleInfo[r].text}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article>
          <span className="kicker">04 · Liveries</span>
          <h2>Colour studies for every entry</h2>
          <p>
            Each entry gets a colour scheme based on its team colours, with its
            race number, class-colour number panel, team name and crew painted
            on in the style of the real cars. Sponsor logos are not reproduced.
          </p>
        </article>
        <article>
          <span className="kicker">05 · The circuit</span>
          <h2>Aerial imagery and measured ground</h2>
          <p>
            The circuit outline and corner positions come from OpenStreetMap via
            track-atlas. IGN orthorectified aerial photographs show the circuit
            and its surroundings. RGE ALTI supplies ground elevation; BD TOPO
            supplies 15,950 building footprints and source-reported heights. Six
            connected OpenStreetMap ways trace the pit entry, service lane and
            exit. The map uses true vertical scale by default. The optional 3×
            relief view exaggerates it for inspection.
          </p>
          <p>
            The elevation profile measures ground, which can differ from raised
            road and bridge decks. Buildings are simplified footprint volumes;
            unknown heights remain flat. Imagery is an aerial mosaic with an
            unverified capture date. Animated class speeds are an illustrative
            lap model, not telemetry.
          </p>
          <a
            href="https://github.com/tobi/track-atlas"
            target="_blank"
            rel="noreferrer"
          >
            track-atlas <ArrowUpRight size={14} />
          </a>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap contributors, ODbL <ArrowUpRight size={14} />
          </a>
          <a href={`${import.meta.env.BASE_URL}data/sarthe.geojson`} download>
            Download the circuit geometry <ArrowUpRight size={14} />
          </a>
          <a href="https://geoservices.ign.fr" target="_blank" rel="noreferrer">
            © IGN · RGE ALTI, BD TOPO, BD ORTHO <ArrowUpRight size={14} />
          </a>
          <a
            href="https://github.com/etalab/licence-ouverte/blob/master/LO.md"
            target="_blank"
            rel="noreferrer"
          >
            IGN data · Open Licence 2.0 <ArrowUpRight size={14} />
          </a>
        </article>
        <article>
          <span className="kicker">06 · Community exterior models</span>
          <h2>18 hosted exterior references</h2>
          <p>
            Every car family has a detailed external reference. These remain on
            their original host and retain their own rights. Some uploads have
            unverified upstream provenance; no source mesh files are
            redistributed. Preview images are renders of the models, rather than
            photographs.
          </p>
          <p>
            The visible exterior keeps its own livery. Selecting a race entry
            opens a separate colour study rather than pretending the source
            model reproduces that entry. Aston’s interactive exterior depicts
            the related Valkyrie LM track variant; an optional original-artist
            film shows a 2026 race model.
          </p>
          {Object.entries(exteriorReferences).map(([id, r]) => {
            const c = carById(id);
            return (
              <a
                key={id}
                href={`https://sketchfab.com/3d-models/${r.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {c?.make} {c?.name} · {r.author} <ArrowUpRight size={14} />
              </a>
            );
          })}
        </article>
        <article>
          <span className="kicker">07 · Open source</span>
          <h2>Help improve the atlas</h2>
          <p>
            Explore the code, report a problem or contribute a source-backed
            correction. Documentation, accessibility and rendering improvements
            are welcome too.
          </p>
          <p>
            Original code is MIT-licensed. Geographic data and creator-hosted
            models retain their separate terms; the code license does not grant
            rights to third-party assets or trademarks.
          </p>
          <a href="https://github.com/OliverPerrin/SartheAtlas">
            View the source <ArrowUpRight size={14} />
          </a>
          <a href="https://github.com/OliverPerrin/SartheAtlas/blob/main/CONTRIBUTING.md">
            Contribution guide <ArrowUpRight size={14} />
          </a>
          <a href="https://github.com/OliverPerrin/SartheAtlas/issues/new/choose">
            Report a bug or source correction <ArrowUpRight size={14} />
          </a>
          <a href="https://github.com/OliverPerrin/SartheAtlas/blob/main/THIRD_PARTY_NOTICES.md">
            Licenses & third-party notices <ArrowUpRight size={14} />
          </a>
        </article>
      </div>
      <div className="about-next">
        <div>
          <span className="kicker">Start with a machine</span>
          <h2>See the engineering for yourself.</h2>
        </div>
        <a className="btn primary" {...linkProps("field", { view: "cars" })}>
          Explore the cars <ArrowUpRight size={16} />
        </a>
      </div>
      <p className="source-note">
        Independent educational project. Not affiliated with the ACO, FIA, FIA
        WEC, IMSA, manufacturers or teams. Names are used only to identify the
        cars. Code is MIT-licensed; the circuit outline is ODbL and IGN
        geography is provided under Open Licence 2.0.
      </p>
    </main>
  );
}
