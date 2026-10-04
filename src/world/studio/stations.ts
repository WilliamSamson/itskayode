/**
 * Clickable stations on the studio island. Positions and focus framings come
 * from the studio portal registry; staff assignments and portal actions stay
 * in the portal and are deliberately not copied here.
 */
export type StudioObjectId =
  | "command-desk"
  | "engineering-desk"
  | "release-bench"
  | "operations-board"
  | "runbook-cabinet"
  | "intelligence-desk"
  | "research-table"
  | "research-evidence-library"
  | "research-findings-board"
  | "implementation-desk"
  | "prototype-bench"
  | "test-station"
  | "prototype-shelf"
  | "legal-desk"
  | "legal-review-table"
  | "legal-matter-archive"
  | "legal-governance-board"
  | "ambassador-desk"
  | "ambassador-conversation-table"
  | "ambassador-relationship-wall"
  | "ambassador-followup-rail"
  | "talent-desk"
  | "venture-wall"
  | "boardroom"
  | "lounge"
  | "break-room"
  | "desk-kayode"
  | "ceo-strategy-table"
  | "advanced-tech-lab"
  | "power-grid";

export interface StudioStation {
  label: string;
  subtitle: string;
  department: string;
  worldPosition: [number, number, number];
  focusCameraTarget?: [number, number, number];
  focusCameraPosition?: [number, number, number];
  boundingRadius: number;
}

export const STUDIO_STATIONS: Record<StudioObjectId, StudioStation> = {
  "command-desk": {
    label: "The West Pavilion",
    subtitle: "Monumental Residence & Cosmic Panorama",
    department: "Residence",
    worldPosition: [-11.8, 0, 0.0],
    focusCameraTarget: [-11.8, 1.1, 0.0],
    focusCameraPosition: [-6.2, 4.8, 4.8],
    boundingRadius: 5.5,
  },
  "engineering-desk": {
    label: "MLOps & Infrastructure",
    subtitle: "Systems Command, Release Verification & Operational Health",
    department: "Engineering",
    worldPosition: [-19.3, 0, -7.2],
    focusCameraTarget: [-19.3, 0.85, -7.2],
    focusCameraPosition: [-16.8, 3.8, -4.8],
    boundingRadius: 3.1,
  },
  "release-bench": {
    label: "Release Bench",
    subtitle: "Change Preparation, Readiness Verification & Deployment Record",
    department: "Engineering",
    worldPosition: [-19.3, 0, -9.6],
    focusCameraTarget: [-19.3, 0.78, -9.6],
    focusCameraPosition: [-16.8, 3.8, -7.2],
    boundingRadius: 3.1,
  },
  "operations-board": {
    label: "Operations Board",
    subtitle: "Operational Conditions, Active Incidents & Change Timeline",
    department: "Engineering",
    worldPosition: [-22.1, 1.45, -8.5],
    focusCameraTarget: [-22.1, 1.45, -8.5],
    focusCameraPosition: [-20, 3, -8.5],
    boundingRadius: 2.8,
  },
  "runbook-cabinet": {
    label: "Runbook Cabinet",
    subtitle: "Repeatable Operational Procedures & Incident Playbooks",
    department: "Engineering",
    worldPosition: [-16.7, 0, -8.5],
    focusCameraTarget: [-16.7, 1.2, -8.5],
    focusCameraPosition: [-18.8, 3, -8.5],
    boundingRadius: 2.8,
  },
  "intelligence-desk": {
    label: "Research & Data",
    subtitle: "Strategic Inquiry, Empirical Evidence & Studio Briefings",
    department: "Research",
    worldPosition: [-13.5, 0, -7.2],
    focusCameraTarget: [-13.5, 0.85, -7.2],
    focusCameraPosition: [-10.8, 3.8, -4.8],
    boundingRadius: 3.1,
  },
  "research-table": {
    label: "Research Table",
    subtitle: "Evidence Examination & Synthesis",
    department: "Research",
    worldPosition: [-13.5, 0, -9.5],
    focusCameraTarget: [-13.5, 0.78, -9.5],
    focusCameraPosition: [-10.8, 3.8, -7.2],
    boundingRadius: 3.1,
  },
  "research-evidence-library": {
    label: "Evidence Library",
    subtitle: "Institutional Research Memory & Sources",
    department: "Research",
    worldPosition: [-14.5, 0, -11.3],
    focusCameraTarget: [-14.5, 1.2, -11.3],
    focusCameraPosition: [-12, 3.2, -9],
    boundingRadius: 3.1,
  },
  "research-findings-board": {
    label: "Findings Board",
    subtitle: "Validated Studio Knowledge & Discoveries",
    department: "Research",
    worldPosition: [-16.35, 1.45, -8.5],
    focusCameraTarget: [-16.35, 1.45, -8.5],
    focusCameraPosition: [-13.8, 3, -8.5],
    boundingRadius: 3.1,
  },
  "implementation-desk": {
    label: "Technology & Prototyping",
    subtitle: "Active Inquiry, Feasibility Prototyping & Technical Proof",
    department: "Research",
    worldPosition: [-7.7, 0, -7.2],
    focusCameraTarget: [-7.7, 0.85, -7.2],
    focusCameraPosition: [-5.2, 3.8, -4.8],
    boundingRadius: 3.1,
  },
  "prototype-bench": {
    label: "Prototype Bench",
    subtitle: "Active Technical Exploration & Prototype References",
    department: "Research",
    worldPosition: [-7.7, 0, -9.6],
    focusCameraTarget: [-7.7, 0.78, -9.6],
    focusCameraPosition: [-5, 3.8, -7.2],
    boundingRadius: 3.1,
  },
  "test-station": {
    label: "Test Station",
    subtitle: "Empirical Assumption Testing & Diagnostic Bench",
    department: "Research",
    worldPosition: [-5.1, 0, -8.5],
    focusCameraTarget: [-5.1, 1.1, -8.5],
    focusCameraPosition: [-7.2, 3, -8.5],
    boundingRadius: 2.8,
  },
  "prototype-shelf": {
    label: "Prototype Shelf",
    subtitle: "Concluded Experiments & Institutional Technical Memory",
    department: "Research",
    worldPosition: [-10.4, 0, -8.5],
    focusCameraTarget: [-10.4, 1.4, -8.5],
    focusCameraPosition: [-8.2, 3, -8.5],
    boundingRadius: 2.8,
  },
  "legal-desk": {
    label: "Legal & Governance",
    subtitle: "Operating Guardrails & IP Protection",
    department: "Legal",
    worldPosition: [-14.2, 0, 5.8],
    focusCameraTarget: [-14.2, 0.85, 5.8],
    focusCameraPosition: [-10.8, 4.6, 9.2],
    boundingRadius: 3.1,
  },
  "legal-review-table": {
    label: "Legal Review Table",
    subtitle: "Matter Examination & Document Execution",
    department: "Legal",
    worldPosition: [-14, 0, 8.8],
    focusCameraTarget: [-14, 0.75, 8.8],
    focusCameraPosition: [-11, 3.8, 11.2],
    boundingRadius: 2.5,
  },
  "legal-matter-archive": {
    label: "Matter Archive",
    subtitle: "Authoritative Records & Executed Deeds",
    department: "Legal",
    worldPosition: [-16.4, 0, 7.2],
    focusCameraTarget: [-16.4, 1.1, 7.2],
    focusCameraPosition: [-12.8, 3.6, 7.2],
    boundingRadius: 2.5,
  },
  "legal-governance-board": {
    label: "Governance Board",
    subtitle: "Obligations, Deadlines & Board Resolutions",
    department: "Legal",
    worldPosition: [-10.7, 0, 6.5],
    focusCameraTarget: [-10.7, 1.4, 6.5],
    focusCameraPosition: [-14.5, 3.5, 6.5],
    boundingRadius: 2.5,
  },
  "ambassador-desk": {
    label: "Ambassador Relations Desk",
    subtitle: "Ecosystem Intake & Relationship Ledger",
    department: "Community",
    worldPosition: [-7.7, 0, 6.5],
    focusCameraTarget: [-7.7, 0.9, 6.5],
    focusCameraPosition: [-5.2, 3.8, 9.2],
    boundingRadius: 2.8,
  },
  "ambassador-conversation-table": {
    label: "Conversation Table",
    subtitle: "Dialogue Inspection & Strategic Dossier",
    department: "Community",
    worldPosition: [-7.5, 0, 8.8],
    focusCameraTarget: [-7.5, 0.75, 8.8],
    focusCameraPosition: [-5, 3.6, 11],
    boundingRadius: 2.5,
  },
  "ambassador-relationship-wall": {
    label: "Curated Relationship Wall",
    subtitle: "Strategic Ecosystem Context & Network Roster",
    department: "Community",
    worldPosition: [-10.45, 0, 7.8],
    focusCameraTarget: [-10.45, 1.45, 7.8],
    focusCameraPosition: [-6.8, 3.2, 7.8],
    boundingRadius: 2.5,
  },
  "ambassador-followup-rail": {
    label: "Follow-Up Rail",
    subtitle: "Action Ledger & Committed Deadlines",
    department: "Community",
    worldPosition: [-5.38, 0, 7.4],
    focusCameraTarget: [-5.38, 1.1, 7.4],
    focusCameraPosition: [-8.8, 3.2, 7.4],
    boundingRadius: 2.5,
  },
  "talent-desk": {
    label: "Southern Garden Solarium",
    subtitle: "Indoor Flora Terrace & Cosmic Space Panorama",
    department: "Oasis",
    worldPosition: [5.9, 0, 8.85],
    focusCameraTarget: [5.9, 1.05, 9.2],
    focusCameraPosition: [5.9, 2.4, 5.2],
    boundingRadius: 3.5,
  },
  "venture-wall": {
    label: "Venture Gallery & Product Wall",
    subtitle: "Harmoniq, Acauide & Incubation States",
    department: "Ventures",
    worldPosition: [-0.55, 0, 4.8],
    boundingRadius: 2,
  },
  "boardroom": {
    label: "The Study",
    subtitle: "Private library, research desk & garden terrace",
    department: "Studio",
    worldPosition: [16.6, 0, 6.6],
    focusCameraTarget: [16.6, 0.75, 6.6],
    focusCameraPosition: [33.6, 21.5, 23.6],
    boundingRadius: 4.8,
  },
  "lounge": {
    label: "Living Flora Lounge",
    subtitle: "Focus Breakout & Deep Work Space",
    department: "Shared",
    worldPosition: [10.8, 0, 0.8],
    boundingRadius: 2.2,
  },
  "break-room": {
    label: "Atelier Kitchen & Walk-In Snack Pantry",
    subtitle: "Provisions, restock tracking & ephemeral kitchen runs",
    department: "Shared",
    worldPosition: [6, 0, -4.3],
    focusCameraTarget: [6, 0.9, -4.3],
    focusCameraPosition: [17.5, 14, 7],
    boundingRadius: 3.5,
  },
  "desk-kayode": {
    label: "West Pavilion Lounge",
    subtitle: "Low-Slung Cashmere Sectional & Nero Marquina Table",
    department: "Residence",
    worldPosition: [-21.2, 0, 0.1],
    focusCameraTarget: [-21.2, 0.75, 0.1],
    focusCameraPosition: [-16.5, 4.8, 4.8],
    boundingRadius: 3.5,
  },
  "ceo-strategy-table": {
    label: "West Pavilion Hearth & Bar",
    subtitle: "Fluted Basalt Ribbon Fireplace & Smoked Glass Credenza",
    department: "Residence",
    worldPosition: [-21.2, 0, 2.75],
    focusCameraTarget: [-21.5, 0.85, -2.5],
    focusCameraPosition: [-17.2, 4.6, 2.0],
    boundingRadius: 3.0,
  },
  "advanced-tech-lab": {
    label: "Advanced Tech Lab",
    subtitle: "Hardware & Prototyping",
    department: "Research",
    worldPosition: [-3.15, 0, -40.988],
    focusCameraTarget: [-3.15, 1.0, -40.988],
    focusCameraPosition: [15.5, 16.5, -23.988],
    boundingRadius: 7.0,
  },
  "power-grid": {
    label: "100 kW Power Grid",
    subtitle: "Micro-Grid Substation & Generators",
    department: "Infrastructure",
    worldPosition: [41.0, 0, -53.0],
    focusCameraTarget: [41.0, 2.0, -53.0],
    focusCameraPosition: [62.0, 16.0, -36.0],
    boundingRadius: 18.0,
  },
};
