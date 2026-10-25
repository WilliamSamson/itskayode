# Engineering Playbook: Streamlined System Implementation & Decluttering

## 1. Core Principle: The REA Framework (Reason, Execution, Assertion)

Every system refinement must be grounded in real operational constraints rather than cosmetic additions.

* **Reason (Objective Clarity):** Identify the authoritative mathematical or functional ground truth before authoring components. Distinguish authentic system physics from superficial interactive decorations.
* **Execution (Subtractive Streamlining):** Solve problems by eliminating vestigial intermediate layers and un-hydrated state rather than layering compensatory abstractions. Consolidate design tokens semantically rather than scattering arbitrary inline values.
* **Assertion (Structural Invariant Verification):** Lock down performance boundaries and architectural limits directly through automated test suites. A rule without an automated two-sided test is merely aspirational.

---

## 2. Case Scenario: High-Complexity Subsystem Consolidation

### Scenario Context
A multi-subsystem engineering tool requires high-throughput updates, dense state representation, and complex domain kinematics. Over successive iterations, the interface accumulated disconnected utilities: manual export triggers, redundant coordinate views, mock wire looms, and intermediate cache wrappers storing read-only values without reactive listeners.

### The Objective
Consolidate the workspace into a calm, high-agency physical instrument without losing domain rigor, while optimizing runtime resource consumption and maintaining strict brand boundaries.

---

## 3. Anti-Patterns Identified & Eliminated

### 3.1 The Additive Bias Trap
* **Symptom:** Attempting to "complete" an incomplete or decorative feature by writing more scaffolding around it (e.g., adding mock modals, fake download handlers, or unlinked connection lists).
* **Remedy:** Prune the feature entirely. If a capability lacks backend backing or physical necessity, removing it clarifies the workflow and eliminates phantom maintenance overhead.

### 3.2 Vestigial Proxy State
* **Symptom:** Wrapping child workbenches in intermediate components that declare extensive state arrays with no mutation setters, then copying those static values into disconnected reference caches.
* **Remedy:** Eliminate the proxy layer. Let active tools read directly from the authoritative state machine or context. Keep props minimal, typed, and bidirectional.

### 3.3 Traversal Overhead in Active Loops
* **Symptom:** Recursively traversing element trees or allocating transformation vectors during interactive renders, selection highlights, or frame ticks.
* **Remedy:** Pre-cache unique material references and kinematic nodes once during instantiation. Pre-compose coordinate matrices directly onto geometry arrays to collapse fragmented draw calls into batch operations.

---

## 4. Streamlining & Decluttering Playbook

### Step 1: Discover Authority & Calibrate Against Reality
* Identify the authoritative specification (e.g., real kinematics equations, physical dimensions, actual power limits).
* Refuse to guess missing specifications or fabricate realistic-looking placeholders. Treat unknown parameters explicitly as unverified envelopes until confirmed.

### Step 2: Prune Boilerplate & Protect First-Order Interactions
* Strip decorative buttons that replicate natural gestures (e.g., rigid perspective presets that duplicate orbital panning).
* Replace raw visual literals with centralized semantic design tokens that reflect surface hierarchy (deck, bezel, card, track, ink).
* Use tactile, physical layout geometry (e.g., continuous segmented pill controls with integrated boundary radii) to clarify state transitions.

### Step 3: Enforce Invariants with Structural Tests
* Do not restrict unit tests to happy-path component rendering.
* Write structural assertions that verify:
  1. **Batching Budgets:** Assert that aggregated structures remain below a strict threshold of child meshes or draw units.
  2. **Boundary Precision:** Assert that numeric inputs strictly reject boundary violations (out-of-range inputs, negative capacities, NaN/Infinity) while accepting valid limits.
  3. **Token Integrity:** Assert that layout containers adhere to semantic token styling rather than arbitrary ad-hoc styling.
