# SONARIS Engineering Workspace Implementation Plan

**Goal:** Build the supplied lifecycle workspace, feature by feature, without manufacturing hardware evidence.
**Architecture:** A dedicated `/sonaris/workspace` route, local validated JSON project persistence/export, pure tested engineering functions and an interactive Three.js viewport. The uploaded specification supersedes stale P2/A2M12 documents. Unknown component envelopes remain unknown until entered with evidence. The browser workspace is not an Onshape-authoritative CAD system or physical telemetry endpoint.
**Execution:** superpowers:subagent-driven-development; independent engine and viewport implementation, followed by integrated UI, verification and review. No commits, pushes or publication requested.

- [ ] Define typed component inventory, provenance, electrical inputs and guarded calculations; test normal, unknown and invalid data.
- [ ] Build functional 3D selection, orbit/views, placement, scale/measurement for supplied envelopes, room geometry and scan overlays; clean up GPU resources.
- [ ] Build component inspector, electrical register, configurable power scenarios, mecanum mobility and raycast-based mapping with explicit simulated status.
- [ ] Add mechanical placement/collision checks, 300 × 300 mm fabrication bed checks with unknown Z, CAD revision records and imported models.
- [ ] Add requirements, decisions, risks, procurement, physical trials, comparison and evidence exports; local persistence and validated import.
- [ ] Connect Overview without changing approved landing visuals; SONARIS-specific metadata.
- [ ] Run unit tests, typecheck, lint, browser interactions and rollback-on-copy; record measured completion and remaining engineering gates.

Acceptance: controls change actual state, numeric unknowns never become zero claims, simulation outputs carry assumptions, local restore/import rejects bad data, metadata remains SONARIS, and unrelated changes are preserved.
Recovery: preserve original page and agent notes, keep a diff and executable rollback; test restoration in scratch.
