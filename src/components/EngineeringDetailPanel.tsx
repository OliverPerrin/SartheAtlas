import { engineeringSources } from "../data/engineeringDetails.ts";
import type { EngineeringDetail } from "../data/engineeringDetails.ts";
import type { SystemId } from "../data/systems.ts";

export default function EngineeringDetailPanel({
  detail,
  systemId,
  sectioned,
}: {
  detail: EngineeringDetail;
  systemId: SystemId;
  sectioned: boolean;
}) {
  return (
    <div className="engineering-detail">
      <h3>{detail.title}</h3>
      <p className="engineering-architecture">{detail.architecture}</p>
      {(systemId === "engine" || systemId === "gearbox") && (
        <div className="machinery-note">
          <h4>Inside the housing</h4>
          <p>
            {systemId === "engine"
              ? "The sectional study exposes pistons, connecting rods, crank journals, cams and valve gear. Cylinder architecture follows the selected engine; timing and internal dimensions are illustrative."
              : "The sectional study exposes shafts, bearings, gear pairs and selector hardware. The displayed gear count follows the specification; tooth counts, ratios and engagement positions are illustrative."}
          </p>
          <small>
            {sectioned
              ? "Housings are open."
              : "Use Open housings to inspect these mechanisms."}
          </small>
        </div>
      )}
      <div className="engineering-components">
        {detail.components.map((part) => (
          <details key={part.name}>
            <summary>
              <span>{part.name}</span>
              <small>
                {part.evidence === "documented"
                  ? "Source documented"
                  : "Illustrated assembly"}
              </small>
            </summary>
            <p>{part.role}</p>
            {part.sourceIds.length > 0 && (
              <div className="engineering-part-sources">
                {part.sourceIds.map((id) => {
                  const source = engineeringSources[id];
                  return source ? (
                    <a
                      key={id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.publisher}
                    </a>
                  ) : null;
                })}
              </div>
            )}
          </details>
        ))}
      </div>
      <h4>How the assemblies connect</h4>
      <ul>
        {detail.interfaces.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      {detail.notes.map((text) => (
        <p className="engineering-note" key={text}>
          {text}
        </p>
      ))}
      <p className="engineering-model-note">{detail.geometryNotice}</p>
      <details className="engineering-source-list">
        <summary>Technical sources</summary>
        {detail.sourceIds.map((id) => {
          const source = engineeringSources[id];
          return source ? (
            <a key={id} href={source.url} target="_blank" rel="noreferrer">
              <strong>{source.publisher}</strong> {source.title}
              <small>{source.scope}</small>
            </a>
          ) : null;
        })}
      </details>
    </div>
  );
}
