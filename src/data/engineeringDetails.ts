import type { Car } from "./cars.ts";
import type { SystemId } from "./systems.ts";

/** Architecture evidence never certifies the dimensions or routing of the procedural meshes. */
export type EngineeringSource = {
  title: string;
  publisher: string;
  url: string;
  scope: string;
};
export type EngineeringComponent = {
  name: string;
  role: string;
  evidence: "documented" | "representative";
  sourceIds: string[];
};
export type EngineeringDetail = {
  title: string;
  architecture: string;
  components: EngineeringComponent[];
  interfaces: string[];
  notes: string[];
  sourceIds: string[];
  geometryNotice: string;
};

export const engineeringSources: Record<string, EngineeringSource> = {
  ferrari: {
    title: "499P: The Comeback",
    publisher: "Ferrari",
    url: "https://www.ferrari.com/en-US/magazine/articles/ferrari-499p-the-comeback",
    scope: "Race-car V6 and front-axle ERS; brake-by-wire. Not the Modificata.",
  },
  toyota: {
    title: "TR010 HYBRID technical specifications",
    publisher: "Toyota Racing",
    url: "https://toyota-racing-newsroom.com/verwaltung/fafcms-filemanager/filemanager/get-file?id=173426",
    scope:
      "2026 race-car specification: torsion bars, pushrods, transmission, motor/inverter and battery.",
  },
  aston: {
    title: "Valkyrie Le Mans hypercar unveiled",
    publisher: "Aston Martin F1 Team",
    url: "https://www.astonmartinf1.com/en-GB/news/announcement/aston-martin-valkyrie-unveiled-as-le-mans-hypercar",
    scope:
      "2025 race version: V12, pushrod torsion bars, side/central dampers, seven-speed Xtrac; excludes road-car active suspension.",
  },
  aco: {
    title: "2025 24 Hours of Le Mans press kit",
    publisher: "Automobile Club de l'Ouest",
    url: "https://assets.lemans.org/explorer/pdf/courses/2025/24-heures-du-mans/presse/2025_24HA_DP_EN.pdf",
    scope: "Explicit non-hybrid Valkyrie classification.",
  },
  cadillac: {
    title: "V-Series.R race car",
    publisher: "Cadillac Racing",
    url: "https://www.cadillac.com/racing/imsa",
    scope:
      "Naturally aspirated 5.5-litre DOHC V8 and seven-speed transmission; IMSA presentation, not a WEC setup sheet.",
  },
  bmw: {
    title: "P66/3 eight-cylinder hybrid turbo engine",
    publisher: "BMW Group",
    url: "https://www.press.bmwgroup.com/usa/article/detail/T0402285EN_US/the-heart-of-the-bmw-m-hybrid-v8:-p66/3-eight-cylinder-hybrid-turbo-engine-drives-the-lmdh-prototype",
    scope:
      "Engine construction, six-cell scavenge pump, separator clutch and Dallara integration.",
  },
  genesis: {
    title: "Genesis GMR-001 Hypercar",
    publisher: "Hyundai Motorsport",
    url: "https://motorsport.hyundai.com/manufacturer-programmes/wec",
    scope: "G8MR 3.2-litre turbo V8; carbon brakes and rear-wheel drive.",
  },
  genesisChassis: {
    title: "GMR-001 full-scale debut",
    publisher: "Genesis",
    url: "https://www.genesis.com/ca/en/genesis/the-brand/brand-news/genesis-magma-racing-debuts-full-scale-gmr-001-hypercar-ushering-in-a-new-era-of-athletic-elegance.html",
    scope:
      "ORECA partnership and twin-turbo V8 architecture; reveal-stage detail.",
  },
  alpine: {
    title: "A424 track debut imminent",
    publisher: "Alpine",
    url: "https://media.alpinecars.com/alpine-a424-track-debut-imminent/?lang=eng",
    scope:
      "Explicit single-turbo 3.4-litre V6, Mecachrome and ORECA partnerships. Development-stage architecture.",
  },
  oreca2025: {
    title: "ORECA Le Mans 2025 media kit",
    publisher: "ORECA",
    url: "https://www.oreca.com/wp-content/uploads/2025/06/Media-Kit-24h-of-Le-Mans-25.pdf",
    scope:
      "Indexed manufacturer PDF: Alpine 95-degree single-turbo V6, dry sump and pushrod suspension. Direct download returned 404 at audit.",
  },
  peugeot: {
    title: "9X8 Hypercar: designed to race",
    publisher: "Peugeot / Stellantis",
    url: "https://www.media.stellantis.com/em-en/peugeot/press/new-peugeot-9x8-hypercar-designed-to-race-1632576994",
    scope:
      "Original 2.6-litre V6, front electric drive and Saft battery; original wingless body is superseded.",
  },
  peugeot2024: {
    title: "2024 9X8 new silhouette",
    publisher: "Peugeot Sport / Stellantis",
    url: "https://www.media.stellantis.com/fr-fr/peugeot-sport/press/la-peugeot-9x8-2024-devoile-une-nouvelle-silhouette-soulignee-par-une-livree-exceptionnelle",
    scope:
      "Rear wing and differentiated front/rear tyres introduced in 2024; retained chassis, revised body and mass distribution.",
  },
  oreca: {
    title: "ORECA 07 technical specifications",
    publisher: "ORECA",
    url: "https://www.oreca.com/wp-content/uploads/2022/06/DP_ORECA_2022_EN_BD.pdf",
    scope:
      "Indexed manufacturer PDF: GK428, pushrods, PKM dampers, carbon brakes, transverse six-speed Xtrac. Direct download returned 404 at audit.",
  },
  xtrac: {
    title: "P1359 transverse LMDh gearbox",
    publisher: "Xtrac",
    url: "https://www.xtrac.com/product/p1359-transverse-lmdh-gearbox/",
    scope:
      "Common seven-speed three-shaft gearbox, rear MGU integration, structural casing and plate differential.",
  },
  bosch: {
    title: "Le Mans Daytona hybrid system",
    publisher: "Bosch Motorsport",
    url: "https://www.bosch-motorsport.com/technology-and-innovation/product-highlights/hybrid-system-lmdh/",
    scope:
      "MGU, inverter, hybrid controller, wiring, rear brake-by-wire and system cutaway illustrations.",
  },
  ferrari296: {
    title: "296 GT3: first sketches",
    publisher: "Ferrari",
    url: "https://www.ferrari.com/en-BE/competizioni-gt/articles/296-gt3-the-first-sketches-of-ferraris-future-in-gt-racing",
    scope: "Explicit exclusion of the road car's electric unit from the GT3.",
  },
  ferrari296Evo: {
    title: "296 GT3 Evo: bred from victory",
    publisher: "Ferrari",
    url: "https://www.ferrari.com/en-BE/competizioni-gt/articles/ferrari-296-gt3-evo-bred-from-victory-evolved-to-push-limits?amp=true",
    scope:
      "Evo bonnet air inlets for brake/cockpit cooling and revised rear wing.",
  },
  corvette: {
    title: "Corvette racing technical specification",
    publisher: "Chevrolet",
    url: "https://www.chevrolet.com/motorsports/corvette-racing",
    scope:
      "LT6-derived flat-plane V8, six-speed transaxle, double wishbones, six/four-piston brakes.",
  },
  corvetteChassis: {
    title: "Chevrolet reveals Corvette Z06 GT3.R",
    publisher: "Chevrolet",
    url: "https://news.chevrolet.com/newsroom.detail.html/Pages/news/us/en/2023/jan/0127-corvette-racing.html",
    scope:
      "Aluminium production frame, purpose-built steel cage on secured base plate and racing suspension.",
  },
  mclaren: {
    title: "720S GT3 / GT3 Evo",
    publisher: "McLaren Automotive",
    url: "https://cars.mclaren.com/uk_en/customer-racing/models-customer/720s-gt3",
    scope:
      "M840T race engine, carbon MonoCage II and Evo development; road-car active chassis systems are not evidence for GT3.",
  },
  vantage: {
    title: "2024 Vantage GT3",
    publisher: "Aston Martin",
    url: "https://media.astonmartin.com/state-of-the-art-aston-martin-vantage-gt3-spearheads-new-era-in-top-flight-gt-racing/?lang=eng",
    scope:
      "Bonded aluminium structure, 4.0-litre V8, revised racing suspension and electronics.",
  },
  vantageSpec: {
    title: "Vantage GT3 technical specification",
    publisher: "Aston Martin (release hosted by SRO)",
    url: "https://www.gt-world-challenge-europe.com/images/News%202024/STATE-OF-THE-ART%20ASTON%20MARTIN%20VANTAGE%20GT3%20SPEARHEADS%20NEW%20ERA%20IN%20TOP-FLIGHT%20GT%20RACING_FINAL_120224.pdf",
    scope:
      "Dry sump, BorgWarner turbos, carbon propshaft, double wishbones, Alcon brakes, Bosch ABS and pedal box.",
  },
  m4: {
    title: "BMW M4 GT3 EVO",
    publisher: "BMW M Motorsport",
    url: "https://www.bmw-m.com/en/fastlane/motorsport/race-cars/bmw-m4-gt3-evo.html",
    scope:
      "P58 inline-six, revised anti-roll bars, rear discs, differential, radiator exit and modular lamps.",
  },
  mercedes: {
    title: "Mercedes-AMG GT3",
    publisher: "Mercedes-AMG",
    url: "https://www.mercedes-amg.com/en/mercedes-amg-gt3",
    scope:
      "6208 cc naturally aspirated V8, dry sump, rear transaxle, carbon torque tube and driver-adjustable ABS.",
  },
  mercedesSpec: {
    title: "GT3 / GT4 technical brochure",
    publisher: "Mercedes-AMG",
    url: "https://www.mercedes-amg.com/dam/acr/dokumente/2022/2022_GT3-GT4_Brochure.pdf/_jcr_content/renditions/original.1649340239132./2022_GT3-GT4_Brochure.pdf",
    scope:
      "GT3 column: double wishbones, adjustable dampers and balance-beam brakes; do not copy adjacent GT4 specification.",
  },
  ford: {
    title: "Mustang GT3 race car",
    publisher: "Ford",
    url: "https://www.ford.com/performance/mustang-gt3/",
    scope:
      "Coyote-derived 5.4-litre V8, bespoke short-long-arm suspension, rear transaxle and carbon bodywork.",
  },
  lexus: {
    title: "RC F GT3 technical specifications",
    publisher: "Lexus",
    url: "https://media.lexus.co.uk/lexus-present-new-2017-rc-f-gt3-geneva-motor-show/",
    scope:
      "5.4-litre V8, six-speed sequential gearbox, iron discs and centre locks. Baseline GT3, not a 2026 LMGT3 parts catalogue.",
  },
  porsche: {
    title: "992-generation 911 GT3 R technical data",
    publisher: "Porsche",
    url: "https://newsroom.porsche.com/en_US/2022/motorsport/porsche-911-gt3-r-generation-992-customer-racing-car-premiere-29222.html",
    scope:
      "Rear flat-six, front fuel cell, front wishbone/rear multi-link suspension, cockpit and dry sump; 2023 baseline.",
  },
};

type Profile = {
  architecture: string;
  suspension: string;
  cockpit: string;
  caveat: string;
  sourceIds: string[];
  engineNote: string;
  suspensionKind: "pushrod" | "wishbone" | "mixed" | "unverified";
  drySump?: boolean;
};
const cockpitStudy =
  "Sculpted racing seat, restraints, quick-release wheel, pedal box and service electronics; control positions are illustrative.";
const variantCaveat =
  "Manufacturer architecture is documented; current homologation details, line routing and component coordinates are not published here.";
const profiles: Record<string, Profile> = {
  ferrari: {
    architecture:
      "Ferrari 499P: mid-mounted V6 with a separate front-axle ERS.",
    suspension:
      "Prototype inboard suspension study; rocker geometry and heave elements are not verified by the cited race-car source.",
    cockpit: cockpitStudy,
    caveat:
      "499P race architecture only. Modificata output, controls and low-speed deployment must not be imported.",
    sourceIds: ["ferrari"],
    engineNote:
      "The combustion and electric torque paths reach different axles; total permitted power is not the sum of unrestricted peak ratings.",
    suspensionKind: "unverified",
  },
  toyota: {
    architecture:
      "Toyota TR010 HYBRID: 3.5-litre twin-turbo V6, front electric axle and Toyota lithium-ion battery.",
    suspension: "Front and rear double wishbones, pushrods and torsion bars.",
    cockpit: cockpitStudy,
    caveat: variantCaveat,
    sourceIds: ["toyota"],
    engineNote:
      "Toyota identifies DENSO / AISIN front motor and inverter hardware; the rear transmission is a transverse seven-speed unit.",
    suspensionKind: "pushrod",
  },
  aston: {
    architecture:
      "Valkyrie race car: Cosworth 6.5-litre naturally aspirated V12, seven-speed Xtrac and no hybrid drive.",
    suspension:
      "Double wishbones with pushrod torsion-bar springs, side dampers and central dampers.",
    cockpit:
      "Race cockpit developed for quick driver access and visibility; seat and switch geometry remain illustrative.",
    caveat:
      "Road Valkyrie hybrid and active-suspension specifications do not describe this race car.",
    sourceIds: ["aston", "aco"],
    engineNote:
      "Aston Martin describes lean-burn endurance tuning and reduced operating speed rather than carrying over road-car peak output.",
    suspensionKind: "pushrod",
  },
  cadillac: {
    architecture:
      "Cadillac V-Series.R: naturally aspirated 5.5-litre V8 with the common LMDh rear hybrid drivetrain.",
    suspension:
      "Prototype inboard spring/damper study; exact rocker and third-element topology is not confirmed here.",
    cockpit: cockpitStudy,
    caveat: variantCaveat,
    sourceIds: ["cadillac", "xtrac", "bosch"],
    engineNote:
      "Naturally aspirated induction requires an airbox and inlet runners, without turbochargers or charge-air coolers.",
    suspensionKind: "unverified",
  },
  bmw: {
    architecture:
      "BMW M Hybrid V8: load-bearing P66/3 twin-turbo V8 and common LMDh rear hybrid drivetrain.",
    suspension:
      "Dallara-based prototype installation; linkage dimensions and heave topology remain illustrative.",
    cockpit: cockpitStudy,
    caveat: variantCaveat,
    sourceIds: ["bmw", "xtrac", "bosch"],
    engineNote:
      "BMW documents recast block/heads, direct injection, a six-cell scavenge pump and an oil tank. A separator clutch permits electric-only running.",
    suspensionKind: "unverified",
    drySump: true,
  },
  genesis: {
    architecture:
      "Genesis GMR-001: G8MR 3.2-litre twin-turbo V8, ORECA chassis and common rear LMDh hybrid.",
    suspension:
      "ORECA prototype suspension packaging study; actual rocker and heave-element arrangement is not established by the public specification.",
    cockpit: cockpitStudy,
    caveat:
      "Public specifications confirm the main architecture, not a complete production drawing set for the 2026 car.",
    sourceIds: ["genesis", "genesisChassis", "xtrac", "bosch"],
    engineNote:
      "The G8MR is the programme's named race engine; exact compressor, plenum and fluid-line positions are illustrative.",
    suspensionKind: "unverified",
  },
  alpine: {
    architecture:
      "Alpine A424: Mecachrome-developed 3.4-litre single-turbo V6, ORECA chassis and rear LMDh hybrid.",
    suspension: "ORECA's 2025 sheet identifies double wishbones and pushrods.",
    cockpit: cockpitStudy,
    caveat:
      "The manufacturer identifies a single turbo. Indexed ORECA specifications supplement the live Alpine release; exact 2026 plumbing is unverified.",
    sourceIds: ["alpine", "oreca2025", "xtrac", "bosch"],
    engineNote:
      "One turbocharger serves the V6; paired turbo meshes would misrepresent the documented architecture. Dry sump uses a multi-stage pump.",
    suspensionKind: "pushrod",
    drySump: true,
  },
  peugeot: {
    architecture:
      "Peugeot 9X8: 2.6-litre twin-turbo V6 with front electric drive and a Peugeot Sport / Saft battery.",
    suspension:
      "Prototype suspension study; front/rear actuation type is not resolved by the cited public sources.",
    cockpit: cockpitStudy,
    caveat:
      "Use the winged 2024-on body concept. The original wingless design and equal-width tyres describe an earlier configuration.",
    sourceIds: ["peugeot", "peugeot2024"],
    engineNote:
      "The V6 drives the rear axle; electrical energy is converted to front-axle torque through a separate drive path.",
    suspensionKind: "unverified",
  },
  oreca: {
    architecture:
      "ORECA 07: naturally aspirated Gibson GK428 V8 and transverse six-speed Xtrac; no hybrid hardware.",
    suspension: "Double wishbones, pushrods and PKM adjustable dampers.",
    cockpit:
      "Manufacturer sheet confirms six-point HANS-compatible restraints and paddle shifting; detailed console layout is representative.",
    caveat:
      "Baseline ORECA technical sheet is indexed but its direct download is unavailable; class-era specification is not a team setup sheet.",
    sourceIds: ["oreca"],
    engineNote:
      "GK428 dry-sump lubrication uses staged oil scavenging; Cosworth engine electronics are identified by ORECA.",
    suspensionKind: "pushrod",
    drySump: true,
  },
  "296": {
    architecture:
      "Ferrari 296 GT3 Evo: mid-engined V6 race architecture with the road car's electric drive removed.",
    suspension:
      "GT racing wishbone/coil-over study; individual linkage and damper specifications are not established by these references.",
    cockpit: cockpitStudy,
    caveat:
      "2026 Evo aerodynamic changes are documented separately from the baseline GT3; road-car hybrid hardware is excluded.",
    sourceIds: ["ferrari296", "ferrari296Evo"],
    engineNote:
      "The race engine powers the rear drivetrain without a traction battery, inverter or electric front axle.",
    suspensionKind: "unverified",
  },
  corvette: {
    architecture:
      "Corvette Z06 GT3.R: mid-mounted LT6-derived 5.5-litre V8, six-speed transaxle and aluminium frame with steel cage.",
    suspension:
      "Motorsport double wishbones front and rear, with race springs and dampers.",
    cockpit: cockpitStudy,
    caveat: variantCaveat,
    sourceIds: ["corvette", "corvetteChassis"],
    engineNote:
      "Flat-plane, naturally aspirated V8 induction is distinct from turbocharged GT rivals; exhaust routing is represented schematically.",
    suspensionKind: "wishbone",
  },
  mclaren: {
    architecture:
      "McLaren 720S GT3 Evo: carbon MonoCage II and race-prepared M840T twin-turbo V8.",
    suspension:
      "Evo suspension updates are documented; this study does not reproduce the road car's interconnected active chassis system.",
    cockpit: cockpitStudy,
    caveat:
      "MonoCage II is carbon, unlike the metal base structures of many GT3 rivals. Exact Evo damper topology remains unverified here.",
    sourceIds: ["mclaren"],
    engineNote:
      "The two turbochargers add separate exhaust-energy and compressed-intake paths around the mid-mounted V8.",
    suspensionKind: "unverified",
  },
  vantage: {
    architecture:
      "Vantage GT3: front-mounted twin-turbo V8, carbon propshaft and six-speed Xtrac rear drivetrain.",
    suspension:
      "Optimised double wishbones at both ends with five-way adjustable dampers.",
    cockpit:
      "Adjustable floor-mounted pedal box, brake bias and quick-release carbon wheel are documented.",
    caveat: variantCaveat,
    sourceIds: ["vantage", "vantageSpec"],
    engineNote:
      "BorgWarner turbos with electric wastegates, dry-sump lubrication and a carbon propshaft are specified for the race car.",
    suspensionKind: "wishbone",
    drySump: true,
  },
  m4: {
    architecture:
      "BMW M4 GT3 Evo: front P58 3.0-litre turbo inline-six with a conventional rear-driven GT racing drivetrain.",
    suspension:
      "Evo anti-roll bars and differential changes are documented; exact front/rear arm topology is left unverified here.",
    cockpit: cockpitStudy,
    caveat:
      "The road M4's suspension description is not used as proof of the GT3 race-car layout.",
    sourceIds: ["m4"],
    engineNote:
      "The inline-six has one cylinder bank; modelling two V banks would misrepresent the P58.",
    suspensionKind: "unverified",
  },
  mercedes: {
    architecture:
      "Mercedes-AMG GT3: dry-sump 6208 cc naturally aspirated V8, carbon torque tube and rear six-speed transaxle.",
    suspension:
      "Double wishbones, adjustable racing dampers and anti-roll bars front and rear.",
    cockpit:
      "Driver-adjustable ABS and brake balance complement the racing wheel and pedal station.",
    caveat:
      "AMG markets the 6208 cc engine as 6.3 litres; it is not the road AMG GT's 4.0-litre turbo V8.",
    sourceIds: ["mercedes", "mercedesSpec"],
    engineNote:
      "The dry sump allows low engine mounting. A carbon torque tube links the engine and rear transaxle.",
    suspensionKind: "wishbone",
    drySump: true,
  },
  ford: {
    architecture:
      "Mustang GT3: Coyote-derived 5.4-litre naturally aspirated V8 and rear transaxle, developed with Multimatic and M-Sport.",
    suspension:
      "Bespoke short-long-arm racing suspension, not a direct copy of the road Mustang strut layout.",
    cockpit: cockpitStudy,
    caveat:
      "The cited baseline establishes architecture; a particular 2026 Evo brake or aero package is not certified by this study.",
    sourceIds: ["ford"],
    engineNote:
      "The front engine and rear transmission require a longitudinal torque path through the centre of the car.",
    suspensionKind: "wishbone",
  },
  lexus: {
    architecture:
      "Lexus RC F GT3: 5.4-litre V8, six-speed sequential transmission and iron brake discs.",
    suspension:
      "GT spring/damper and control-link study; exact front/rear linkage layout is not specified in the cited technical release.",
    cockpit: cockpitStudy,
    caveat:
      "2017 baseline GT3 source. It does not establish the gearbox position, latest LMGT3 electronics or current suspension detail.",
    sourceIds: ["lexus"],
    engineNote:
      "The cited race specification is the 5.4-litre V8, distinct from the production RC F engine specification.",
    suspensionKind: "unverified",
  },
  porsche: {
    architecture:
      "Porsche 911 GT3 R (992): rear-mounted 4.2-litre flat-six, six-speed sequential gearbox and front fuel cell.",
    suspension:
      "Front double wishbones; rear multi-link suspension with five-way KW dampers.",
    cockpit:
      "Inboard-shifted fixed seat, six-point harness, movable pedal box, adjustable column and illuminated multifunction wheel.",
    caveat:
      "2023 992 baseline. The rear multi-link axle and front fuel tank must not be replaced by generic GT assumptions.",
    sourceIds: ["porsche"],
    engineNote:
      "The dry-sump flat-six sits behind the rear axle; the gearbox is ahead of it, and an oil-water exchanger rejects oil heat.",
    suspensionKind: "mixed",
    drySump: true,
  },
};

export const engineeringGeometryNotice =
  "Illustrative assembly study. Sources establish architecture; meshes, fasteners, cable routes and clearances are not manufacturer CAD.";
export function carEngineeringSummary(car: Car) {
  const p = profiles[car.id];
  if (!p) throw new Error(`Missing engineering profile: ${car.id}`);
  return {
    architecture: p.architecture,
    suspension: p.suspension,
    cockpit: p.cockpit,
    caveat: p.caveat,
    sourceIds: p.sourceIds,
  };
}

/** Verified exceptions for geometry. An unknown field must remain labelled illustrative. */
export function engineeringLayoutFor(car: Car) {
  return {
    turboCount: (!car.engine.turbo ? 0 : (car.engine.turboCount ?? 2)) as
      0 | 1 | 2,
    suspensionKind: profiles[car.id]?.suspensionKind ?? "unverified",
    springMedium: (["toyota", "aston"].includes(car.id)
      ? "torsion-bar"
      : "unverified") as "torsion-bar" | "unverified",
    fuelLocation: (car.id === "porsche" ? "front" : "unverified") as
      "front" | "unverified",
    gearboxLocation: (car.id === "porsche"
      ? "ahead-of-rear-engine"
      : ["toyota", "vantage", "mercedes", "ford", "corvette"].includes(
            car.id,
          ) || car.platform === "LMDh"
        ? "rear"
        : "unverified") as "rear" | "ahead-of-rear-engine" | "unverified",
  };
}

const part = (
  name: string,
  role: string,
  sourceIds: string[] = [],
): EngineeringComponent => ({
  name,
  role,
  evidence: sourceIds.length ? "documented" : "representative",
  sourceIds,
});

export function engineeringDetailsFor(
  car: Car,
  id: SystemId,
): EngineeringDetail | undefined {
  if (id === "hybrid" && !car.hybrid) return undefined;
  const p = profiles[car.id];
  if (!p) throw new Error(`Missing engineering profile: ${car.id}`);
  const gt = car.category === "LMGT3";
  const lmdh = car.platform === "LMDh";
  const frontEngine = car.engine.position === "front-mid";
  const s = p.sourceIds;
  const result = (
    title: string,
    architecture: string,
    components: EngineeringComponent[],
    interfaces: string[],
    notes: string[] = [],
    extraSources: string[] = [],
  ): EngineeringDetail => ({
    title,
    architecture,
    components,
    interfaces,
    notes,
    sourceIds: [...new Set([...s, ...extraSources])],
    geometryNotice: engineeringGeometryNotice,
  });
  switch (id) {
    case "engine":
      return result(
        "Engine assembly",
        p.architecture,
        [
          part(
            car.engine.config === "I"
              ? "Inline cylinder block and head"
              : car.engine.config === "F"
                ? "Opposed cylinder banks and crankcase"
                : "Cylinder banks and crankcase",
            "Cylinder pressure acts through pistons and connecting rods onto the crankshaft; bank shape follows this car's engine architecture.",
            s,
          ),
          part(
            "Cam covers and valvetrain",
            "Covers enclose the camshaft/valve actuation hardware; valve count and drive layout are not inferred from these meshes.",
          ),
          part(
            car.engine.turbo
              ? car.id === "alpine"
                ? "Single turbocharger"
                : "Turbocharger assemblies"
              : "Airbox and intake runners",
            car.engine.turbo
              ? "Exhaust energy drives a compressor; charge air then passes through cooling and intake plumbing."
              : "Filtered inlet air reaches the cylinders without an exhaust-driven compressor.",
            s,
          ),
          part(
            "Exhaust headers and heat shielding",
            "Collect exhaust pulses and isolate hot surfaces from wiring, oil lines and body panels.",
          ),
          part(
            p.drySump
              ? "Dry-sump scavenge circuit and reservoir"
              : "Lubrication circuit study",
            p.drySump
              ? "Scavenge stages remove oil from the crankcase; a reservoir supplies the pressure circuit. Line routes are schematic."
              : "Represents pressure feed and oil return. Exact sump type and pump-stage count are unverified for this entry.",
            p.drySump ? s : [],
          ),
        ],
        [
          "Crankshaft torque passes through the clutch into the transmission.",
          "Coolant and oil transfer combustion heat to the cooling assembly.",
        ],
        [
          p.engineNote,
          "Turbo housings, header lengths and reservoir positions are not measured production geometry.",
        ],
      );
    case "hybrid":
      return result(
        "Electrical drive and recovery",
        lmdh
          ? "Common LMDh hardware acts through the rear transmission."
          : "A separate front electric axle complements the rear combustion drivetrain.",
        [
          part(
            lmdh
              ? "Gearbox-integrated Bosch MGU"
              : "Front motor-generator and reduction drive",
            "Converts electrical energy into axle torque and reverses that energy flow during recovery.",
            lmdh ? ["xtrac", "bosch"] : s,
          ),
          part(
            "Traction battery",
            "Stores recovered energy; the enclosure and safety systems protect the cells.",
            lmdh ? ["xtrac"] : s,
          ),
          part(
            "Inverter / motor controller",
            "Switches DC battery power into controlled motor phase currents.",
            lmdh ? ["bosch"] : car.id === "toyota" ? ["toyota"] : [],
          ),
          part(
            "High-voltage cables and isolation hardware",
            "Connect energy storage and power electronics; the displayed paths are representative.",
          ),
          part(
            "Hybrid control unit",
            "Coordinates torque demand, state of charge and braking recovery.",
            lmdh ? ["bosch"] : [],
          ),
        ],
        [
          lmdh
            ? "Rear brake-by-wire blends hydraulic torque with MGU recuperation."
            : "Front recovery interacts with friction braking at the electrically driven axle.",
          "Motor, inverter and battery heat must be rejected by their thermal circuits.",
        ],
        [
          "Hardware capability is distinct from event-specific deployment limits; no fixed boost or speed threshold is implied.",
        ],
        lmdh ? ["bosch", "xtrac"] : [],
      );
    case "gearbox":
      return result(
        "Transmission and final drive",
        lmdh
          ? "Xtrac P1359: transverse three-shaft seven-speed unit with integrated rear MGU drive."
          : car.id === "lexus"
            ? "Six-speed sequential; exact gearbox placement is not verified by the cited Lexus release."
            : car.id === "porsche"
              ? "Six-speed gearbox ahead of the rear-mounted flat-six."
              : car.gearbox,
        [
          part(
            "Clutch and input housing",
            "Connects the combustion engine to the gear train; the housing also defines drivetrain installation space.",
          ),
          part(
            "Sequential gear cassette",
            "Selected gear pairs establish ratio; dog engagement replaces a road-car synchromesh shift sequence.",
          ),
          part(
            "Shift actuator",
            "Transforms paddle commands into selector motion; actuator technology varies by car.",
          ),
          part(
            "Final drive and differential",
            "Reduces shaft speed and apportions drive across the rear wheels.",
          ),
          part(
            frontEngine && car.id !== "lexus"
              ? "Longitudinal drive connection"
              : "Output flanges and half-shafts",
            "Carries torque toward the driven hubs while joints accommodate suspension motion.",
          ),
        ],
        [
          "Driveshafts couple the final drive to the wheel hubs.",
          lmdh
            ? "The casing carries rear suspension, wing and impact-structure loads as well as gear forces."
            : "Engine torque, differential locking and tyre load jointly determine traction.",
        ],
        [
          "Case ribs, gear proportions and linkage mounting points are illustrative.",
        ],
        lmdh ? ["xtrac"] : [],
      );
    case "suspension":
      return result(
        "Wheel control and platform",
        p.suspension,
        [
          part(
            p.suspensionKind === "mixed"
              ? "Front wishbones / rear multi-link arms"
              : p.suspensionKind === "unverified"
                ? "Wheel-location links"
                : "Upper and lower wishbones",
            "Locate the upright and control camber/toe as the wheel travels.",
            p.suspensionKind !== "unverified" ? s : [],
          ),
          part(
            "Uprights and spherical joints",
            "Transfer tyre and braking forces into suspension links without treating the brake disc as a structural hub.",
          ),
          part(
            p.suspensionKind === "pushrod"
              ? "Pushrods and inboard rockers"
              : "Damper attachments and motion linkage",
            "Transmit wheel displacement to the spring/damper; motion ratio changes both wheel rate and damper velocity.",
            p.suspensionKind === "pushrod" ? s : [],
          ),
          part(
            car.id === "toyota" || car.id === "aston"
              ? "Torsion bars and dampers"
              : "Spring and damper units",
            "Elastic elements support load; dampers dissipate motion energy rather than providing the primary static spring force.",
            [
              "toyota",
              "aston",
              "oreca",
              "porsche",
              "vantage",
              "mercedes",
              "corvette",
            ].includes(car.id)
              ? s
              : [],
          ),
          part(
            "Anti-roll coupling",
            "Resists the difference between left and right wheel motion, affecting lateral load-transfer distribution.",
          ),
          part(
            car.id === "aston"
              ? "Central damper"
              : "Heave / platform-control study",
            car.id === "aston"
              ? "The race specification explicitly includes central dampers alongside side dampers."
              : "A conceptual third element illustrates common-mode wheel motion. Its installation is not established for this car.",
            car.id === "aston" ? ["aston"] : [],
          ),
        ],
        [
          "Ride height and pitch alter the floor's aerodynamic operating condition.",
          "Tyre stiffness, spring motion ratio and anti-roll coupling must be considered together.",
        ],
        [
          "Brake migration changes torque distribution during a stop; suspension pitch response also changes axle loads.",
          "No spring rates, shim stacks, motion ratios or team damper settings are inferred.",
        ],
      );
    case "brakes":
      return result(
        "Friction braking and torque balance",
        gt
          ? "GT friction braking with driver-adjustable balance; exact ABS hardware depends on the homologation."
          : car.hybrid
            ? "Carbon friction braking works with electrical recovery at the hybrid axle."
            : "Non-hybrid prototype friction braking; no regenerative blending hardware.",
        [
          part(
            gt ? "Iron / steel brake rings" : "Carbon brake discs",
            "Turn wheel kinetic energy into heat through contact with the pads.",
            ["oreca", "genesis", "lexus"].includes(car.id) ? s : [],
          ),
          part(
            "Calipers, pistons and pads",
            "Hydraulic pressure creates clamp load on each side of the disc.",
          ),
          part(
            "Pedal box and master cylinders",
            "Convert pedal force into two hydraulic circuits; the balance mechanism sets their relationship.",
          ),
          part(
            car.hybrid
              ? "Brake-by-wire / recovery interface"
              : "Brake balance adjuster",
            car.hybrid
              ? "Coordinates friction torque with changing recuperation. Its exact calibration is not exposed."
              : "Changes front/rear hydraulic balance; it does not recover energy.",
            lmdh ? ["bosch"] : car.id === "ferrari" ? ["ferrari"] : [],
          ),
          part(
            "Disc bell, hub and cooling duct",
            "The bell mounts the ring to the hub; the duct supplies cooling flow to the working assembly.",
          ),
        ],
        [
          "Stopping balance depends on axle load, tyre grip, engine drag and, where fitted, recovery torque.",
          "Brake temperature changes affect both friction behaviour and heat flowing into the wheel.",
        ],
        [
          "Brake migration is variation of front/rear braking contribution during a stop, not another caliper. No particular migration map is claimed.",
          gt
            ? "ABS calibration and intervention levels are not simulated."
            : "Brake-by-wire should not be confused with an anti-lock braking system.",
        ],
        lmdh ? ["bosch"] : [],
      );
    case "cooling":
      return result(
        "Thermal circuits and ducting",
        `${car.make} ${car.name}: ${car.engine.turbo ? "engine, oil and compressed-intake heat" : "engine and oil heat"}${car.hybrid ? ", plus hybrid thermal loads" : ""}.`,
        [
          part(
            "Coolant radiator core",
            "Rejects cylinder/head coolant heat to ambient airflow.",
          ),
          part(
            "Oil heat exchanger",
            "Transfers lubricant heat while keeping the oil and cooling streams separated.",
          ),
          ...(car.engine.turbo
            ? [
                part(
                  "Charge-air cooler and boost pipes",
                  "Cool compressed intake air between compressor outlet and engine inlet; exact air-to-air or liquid topology is unverified.",
                ),
              ]
            : []),
          ...(car.hybrid
            ? [
                part(
                  "Electrical thermal circuit",
                  "Removes motor, inverter and battery heat; separate or shared loops are not asserted.",
                ),
              ]
            : []),
          part(
            "Inlet duct and outlet plenum",
            "Pressure difference drives flow through the core; duct leakage reduces useful cooling mass flow.",
          ),
          part(
            "Hoses, fittings and expansion volume",
            "Accommodate circulation and thermal expansion; fittings shown are assembly cues rather than a hose-routing drawing.",
          ),
        ].slice(0, 6),
        [
          "Larger cooling flow can increase aerodynamic drag; duct exits also affect surrounding body flow.",
          "Exhaust shielding reduces unwanted radiant heat reaching the cooling lines.",
        ],
        [
          car.id === "296"
            ? "Ferrari documents Evo bonnet inlets for brake and cockpit cooling."
            : car.id === "m4"
              ? "BMW documents a revised radiator exit channel on the Evo."
              : "Exact radiator orientation, cooling-loop count and exchanger technology remain unverified.",
          "Naturally aspirated cars have no turbo charge-air cooling hardware in this study.",
        ],
      );
    case "cockpit":
      return result(
        "Driver station and service systems",
        p.cockpit,
        [
          part(
            "Seat shell and energy-absorbing insert",
            "Supports the driver and defines harness routing; shell and insert contours are illustrative.",
            car.id === "porsche" ? ["porsche"] : [],
          ),
          part(
            "Harness straps and central release",
            "Shoulder, lap and anti-submarining restraints transfer occupant loads into approved mountings.",
            car.id === "porsche"
              ? ["porsche"]
              : car.id === "oreca"
                ? ["oreca"]
                : [],
          ),
          part(
            "Quick-release wheel and shift paddles",
            "Combines steering input with gear requests and reachable controls; button assignments are not a factory map.",
            car.id === "porsche"
              ? ["porsche"]
              : car.id === "vantage"
                ? ["vantageSpec"]
                : [],
          ),
          part(
            "Pedal box and brake-bias control",
            "Links driver input to throttle and brake systems while allowing ergonomic adjustment.",
            car.id === "porsche"
              ? ["porsche"]
              : car.id === "vantage"
                ? ["vantageSpec"]
                : [],
          ),
          part(
            "Display, switch panel and data-logger study",
            "Represents warnings, driver requests and sensor logging. The screen is a static study graphic, not telemetry.",
          ),
          part(
            "Fire bottle, loom and ventilation",
            "Illustrates suppression, protected electrical distribution and cockpit airflow. Bottle position and loom routing are representative.",
          ),
        ],
        [
          "Paddle requests pass through drivetrain control; brake bias changes hydraulic distribution.",
          "Driver swaps must preserve restraint fit and access to release controls.",
        ],
        [
          "Seat, restraint and extinguisher meshes are explanatory shapes, not safety-certified designs.",
          "No proprietary button layout, logger model, wiring pinout or fire-system installation is inferred.",
        ],
      );
    case "chassis":
      return result(
        "Structure and load paths",
        car.chassis,
        [
          part(
            gt
              ? car.id === "mclaren"
                ? "Carbon MonoCage II"
                : "Production-derived structural shell"
              : "Carbon survival cell",
            "Carries the driver and connects the major structural assemblies.",
            car.id === "mclaren" ? ["mclaren"] : [],
          ),
          part(
            gt
              ? "Safety cage and attachment nodes"
              : "Front bulkhead and suspension attachments",
            "Distributes concentrated loads into the primary structure; joints are shown schematically.",
          ),
          part(
            "Side-impact structure",
            "Provides protective structure beside the occupant; internal laminate and energy absorption are unverified.",
          ),
          part(
            "Front and rear crash structures",
            "Sacrificial structures manage impact energy ahead of and behind the primary cell.",
          ),
          part(
            "Rear drivetrain interface",
            "Connects powertrain and rear assembly; an engine is not assumed to be stressed merely because it is mid-mounted.",
          ),
        ],
        [
          "Suspension forces enter through local hardpoints; body panels need not carry those loads.",
          "The cockpit, fuel containment and electrical systems must fit within protected structural envelopes.",
        ],
        [
          car.id === "bmw"
            ? "BMW explicitly describes the P66/3 as load-bearing."
            : "Laminate lay-up, cage tube sizes and crash performance are not reproduced.",
          p.caveat,
        ],
      );
    case "fuel":
      return result(
        "Fuel containment and delivery",
        car.id === "porsche"
          ? "The 992 GT3 R has its safety fuel cell in the front of the car."
          : "Crash-resistant fuel containment feeds the combustion engine; exact tank envelope is illustrative.",
        [
          part(
            "Flexible safety fuel cell",
            "Contains liquid fuel within a protected enclosure.",
            car.id === "porsche"
              ? ["porsche"]
              : car.id === "oreca"
                ? ["oreca"]
                : [],
          ),
          part(
            "Collector and lift-pump study",
            "Illustrates maintaining fuel supply under changing acceleration; exact internal plumbing is not disclosed.",
          ),
          part(
            "Pressure feed and rail interface",
            "Supplies the engine's injection system; pressure and pump specification are car dependent.",
          ),
          part(
            "Refuelling coupling and vent path",
            "Transfers fuel at pit stops while allowing controlled gas displacement; route is schematic.",
          ),
        ],
        [
          "Fuel mass alters axle loads over a stint.",
          "Electrical energy storage, where fitted, belongs to the hybrid assembly and is not the fuel tank.",
        ],
        [
          "Tank capacity and stint-energy allowance depend on the race specification; the mesh is not a volume measurement.",
        ],
      );
    case "wheels":
      return result(
        "Hub, rim and tyre",
        `${car.tyres} tyres on centre-lock racing wheels.`,
        [
          part(
            "Centre-lock nut and drive interface",
            "Clamps the wheel to the hub while locating features transmit drive and braking torque.",
          ),
          part(
            "Rim barrel and spokes",
            "Carry tyre bead loads into the hub; spoke thickness is not structural analysis.",
          ),
          part(
            "Tyre carcass and tread",
            "Generate combined lateral and longitudinal force through a deforming contact patch.",
          ),
          part(
            "Hub bearing and upright interface",
            "Supports wheel rotation and transfers load into the suspension.",
          ),
        ],
        [
          "Braking heat enters the wheel region; pressure and carcass temperature affect tyre behaviour.",
          "Camber, toe and load distribution influence wear across a long stint.",
        ],
        [
          "Visible lettering, tread and sidewall are representative; compound, pressure and carcass specification are not inferred.",
        ],
      );
    case "body":
      return result(
        "Body panels and service access",
        `${car.make} ${car.name} exterior architecture: ${car.identify[0]}.`,
        [
          part(
            "Nose and front fender panels",
            "Shape inlet flow and provide replaceable body surfaces around the front assembly.",
          ),
          part(
            "Cooling inlets and exit louvres",
            "Connect exterior pressure regions to thermal-system ducts.",
          ),
          part(
            "Cockpit canopy / roof structure",
            "Defines visibility, access and the upper body airflow.",
          ),
          part(
            "Rear cover and service fasteners",
            "Encloses the powertrain while allowing maintenance access.",
          ),
        ],
        [
          "Panel edges, ducts and seals control how much air reaches radiators or escapes around them.",
          "A removable panel is different from the underlying load-bearing chassis.",
        ],
        [p.caveat],
      );
    case "wing":
      return result(
        "Rear aerodynamic assembly",
        car.id === "peugeot"
          ? "9X8 uses a rear wing from its 2024 redesign onward."
          : "Rear wing installation balances downforce and drag with the rest of the car.",
        [
          part(
            "Main aerofoil",
            "Creates a pressure distribution that produces rear downforce.",
          ),
          part(
            "Trailing-edge element / edge treatment",
            "Illustrates local flow control; exact section and adjustment range are unverified.",
          ),
          part(
            "Endplates",
            "Influence spanwise flow and the wing's interaction with the wake.",
          ),
          part(
            "Pylons and mounting interfaces",
            "Transmit aerodynamic load into supporting structure.",
          ),
        ],
        [
          "Wing load changes rear tyre load and pitching balance.",
          "The diffuser and body wake affect the air arriving at the wing.",
        ],
        [
          "Wing angle, section coordinates and resulting aerodynamic coefficients are not calibrated.",
        ],
      );
    case "floor":
      return result(
        "Underfloor and diffuser",
        "An underbody flow study coupled to ride height, pitch and rear wake.",
        [
          part(
            "Front splitter / floor inlet",
            "Defines the leading flow boundary beneath the car.",
          ),
          part(
            "Floor working surface",
            "Guides accelerated underbody flow; exact tunnel cross-sections are not published here.",
          ),
          part(
            "Diffuser ramp and fences",
            "Guide expanding flow toward the rear exit.",
          ),
          part(
            "Skid / wear-surface study",
            "Illustrates contact protection; regulated dimensions and wear are not represented quantitatively.",
          ),
        ],
        [
          "Suspension platform control changes the gap between floor and road.",
          "Kerbs, pitch and yaw can disturb underfloor flow; the view is not CFD.",
        ],
        [
          "Do not infer measured downforce, sealing performance or homologation geometry from this mesh.",
        ],
      );
    case "lights":
      return result(
        "Lighting and electrical services",
        `${car.make} ${car.name}: ${car.identify.find((cue) => /light|LED/i.test(cue)) ?? "Endurance racing lighting installation"}.`,
        [
          part(
            "Headlamp optical modules",
            "Project the forward illumination pattern; beam photometry is not simulated.",
          ),
          part(
            "Tail and rain-light modules",
            "Provide visibility to following traffic.",
          ),
          part(
            "Class / identification lighting study",
            "Represents race identification hardware; event-specific display rules are not encoded here.",
          ),
          part(
            "Low-voltage loom and power distribution",
            "Supplies lamp modules through protected electrical circuits.",
          ),
        ],
        [
          "Lamp housings and cooling apertures share limited bodywork space.",
          "Driver controls and electrical protection connect through the cockpit and loom.",
        ],
        [
          "The visible light signature is a spotting cue, not an exact optical assembly.",
        ],
      );
  }
}
