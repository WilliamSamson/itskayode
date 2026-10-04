import type { Project } from "@/types/content";

export const projects: Project[] = [
  {
    slug: "magma-terminal-workspace",
    title: "Magma",
    category: "Desktop",
    shortDescription:
      "GPU-accelerated Linux terminal workspace combining shell sessions, live JSON logs, files, and the web.",
    description:
      "A Rust-powered GTK4 and VTE developer workspace built to keep terminal sessions, application traces, documentation, and project files visible without constant window switching.",
    problem:
      "Backend and DevOps workflows become fragmented when shell sessions, live logs, documentation, and file inspection are spread across separate applications.",
    solution:
      "Built a native Linux workspace with terminal tabs and split panes, a streaming JSON log viewer, an embedded browser, file previews, persisted sessions, and Debian packaging.",
    impact:
      "Created a focused developer environment that reduces context switching while supporting real deployment workflows, malformed log recovery, filters, exports, and workspace restoration.",
    stack: ["Rust", "GTK4", "VTE", "WebKitGTK", "Ratatui", "Tokio"],
    role: "Creator and Systems Engineer",
    timeline: "2026 - Present",
    featured: true,
    githubUrl: "https://github.com/WilliamSamson/magma",
    coverImage: "/images/projects/magma-terminal.png",
    coverAlt: "Magma terminal workspace with integrated live log viewer",
    visualKind: "terminal",
    gallery: [
      {
        src: "/images/projects/magma-terminal.png",
        alt: "Magma terminal workspace with integrated live log viewer"
      },
      {
        src: "/images/projects/magma-files.png",
        alt: "Magma terminal workspace showing the project file viewer"
      }
    ]
  },
  {
    slug: "valen-distributed-rate-limiter",
    title: "Valen",
    category: "Backend",
    shortDescription:
      "High-availability distributed rate limiter with leased quota, durable analytics, and bounded failure recovery.",
    description:
      "A distributed quota platform that serves low-latency decisions from small in-process leases while Redis coordinates global ownership and PostgreSQL stores configuration and analytics.",
    problem:
      "A conventional Redis call for every request adds latency and becomes a reliability bottleneck, while local-only counters cannot safely enforce global quota across instances.",
    solution:
      "Designed fenced Redis leases, Lua-based atomic allocation, cross-instance request claims, bounded emergency allowances, a disk-backed outbox, NATS JetStream delivery, and idempotent PostgreSQL analytics.",
    impact:
      "Produced an auditable rate-limiting architecture that minimizes coordinator traffic, prevents quota double spending, survives partial infrastructure outages, and exposes benchmark and observability tooling.",
    stack: ["TypeScript", "Fastify", "Redis", "PostgreSQL", "NATS JetStream", "Prometheus"],
    role: "Distributed Systems Engineer",
    timeline: "2026",
    featured: true,
    visualKind: "architecture"
  },
  {
    slug: "orbit-mobile-automation",
    title: "Orbit",
    category: "Mobile",
    shortDescription:
      "Autonomous mobile automation system for context-aware routines, voice creation, and device control.",
    description:
      "A Flutter mobile agent that turns natural-language or structured requests into typed automation routines that react to device, location, calendar, network, battery, and sensor context.",
    problem:
      "Mobile automation tools often require brittle manual configuration and provide limited visibility into why an action ran, failed, or was blocked.",
    solution:
      "Built a routine intelligence layer with voice input, simulation, dry runs, execution policies, transaction logging, local persistence, Firebase sync, and native system-control plugins.",
    impact:
      "Created a testable mobile automation platform with explainable execution history, safe action policies, background operation, responsive layouts, and device-aware suggestions.",
    stack: ["Flutter", "Dart", "Firebase", "Hive", "Android APIs", "WebSockets"],
    role: "Mobile Systems Engineer",
    timeline: "2026 - Present",
    featured: true,
    coverImage: "/images/projects/orbit-home.webp",
    coverAlt: "Orbit mobile automation interface and routine builder",
    visualKind: "automation",
    gallery: [
      {
        src: "/images/projects/orbit-home.webp",
        alt: "Orbit mobile automation interface and routine builder"
      },
      {
        src: "/images/projects/orbit-routines.webp",
        alt: "Orbit routine creation and device automation screens"
      }
    ]
  },
  {
    slug: "slate-offline-teaching-assistant",
    title: "Slate",
    category: "Desktop",
    shortDescription:
      "Offline-first desktop workspace for curriculum planning, lesson scheduling, and local teaching-assistant inference.",
    description:
      "A cross-platform Flutter desktop application that combines curriculum management, lesson planning, scheduling, and private local teaching support.",
    problem:
      "Teachers need a dependable planning workspace that protects educational data and remains useful without internet connectivity or cloud AI services.",
    solution:
      "Built an offline-first desktop architecture using SQLite and native file storage, with local llama.cpp inference through a bundled quantized Qwen model.",
    impact:
      "Created a private teaching workflow that keeps planning data and assistant inference on-device while supporting Linux, macOS, and Windows.",
    stack: ["Flutter", "Dart", "SQLite", "llama.cpp", "Qwen", "FFI"],
    role: "Desktop and AI Systems Engineer",
    timeline: "2026 - Present",
    featured: true,
    visualKind: "planner"
  },
  {
    slug: "acauide-web",
    title: "Acauide",
    category: "Web",
    shortDescription:
      "Personalized study-guide platform with course-specific resources, reading streaks, leaderboards, and guide commerce.",
    description:
      "An educational platform that organizes study guides around each student's class level, department, faculty, and enrolled courses, with tools for reading, uploads, discovery, progress, and payments.",
    problem:
      "Tertiary students often search through generic, poorly organized material that does not match their institution, course level, department, or current subjects.",
    solution:
      "Built authenticated student dashboards, a PDF guide reader, personal uploads, course taxonomy, search, reading streaks, privacy-aware leaderboards, notifications, payments, curator workflows, and administrative operations.",
    impact:
      "Created a scalable academic resource system that personalizes discovery, rewards consistent study, supports paid and uploaded guides, and gives operators structured content controls.",
    stack: ["Next.js", "TypeScript", "Firebase", "Genkit", "Paystack", "PDF.js"],
    role: "Solo Full-Stack Product Engineer",
    timeline: "2024 - Present",
    featured: true,
    liveUrl: "https://acauideco.web.app/",
    coverImage: "/images/projects/acauide-og.png",
    coverAlt: "Acauide personalized study guide platform"
  },
  {
    slug: "ws-tech-venture-studio",
    title: "WS Tech Venture Studio",
    category: "Web",
    shortDescription:
      "Operating platform for a deep-tech venture studio, its products, experiments, programs, and internal workflows.",
    description:
      "A full studio platform used to present ventures, publish research and experiments, recruit talent, manage product access, and coordinate protected internal operations.",
    problem:
      "The studio needed one maintainable system for public product storytelling, venture launches, applications, staff access, gated previews, and operational data.",
    solution:
      "Built a Next.js platform with venture microsites, Firebase-backed accounts and staff tools, Forge applications, gated Vault previews, Genkit integrations, analytics, legal pages, and static export support.",
    impact:
      "Created a reusable operating surface that supports venture launches and internal delivery without splitting the studio across disconnected tools.",
    stack: ["Next.js", "TypeScript", "Firebase", "Genkit", "Framer Motion", "Remotion"],
    role: "Solo Platform Architect and Engineer",
    timeline: "2023 - Present",
    featured: true,
    liveUrl: "https://ws-tech-studio.web.app/"
  },
  {
    slug: "harmoniq",
    title: "Harmoniq",
    category: "Mobile",
    shortDescription:
      "Digital identity and networking app for sharing the right contact card instantly and keeping the relationship alive.",
    description:
      "An Android-first identity platform for creating multiple personal and professional cards, sharing them without requiring the recipient to install an app, and retaining the context needed to follow up.",
    problem:
      "Introductions are frequently lost after an event because business cards disappear, manually saved contacts lack context, and follow-up depends on memory.",
    solution:
      "Built contextual identity cards with link, QR, NFC, and nearby sharing, recipient browser views, location and event context, smart memos, automatic follow-up reminders, access revocation, and biometric or PIN protection.",
    impact:
      "Turned contact exchange into a persistent networking workflow where recipients face no installation friction and users retain control over every shared identity.",
    stack: ["Android", "React", "TypeScript", "Firebase", "NFC", "QR"],
    role: "Solo Product Designer and Engineer",
    timeline: "2026 - Present",
    featured: true,
    liveUrl: "https://ws-tech-studio.web.app/ventures/harmoniq",
    coverImage: "/images/projects/harmoniq-banner.png",
    coverAlt: "Harmoniq digital identity and contact sharing app",
    gallery: [
      {
        src: "/images/projects/harmoniq-banner.png",
        alt: "Harmoniq digital identity and contact sharing app"
      },
      {
        src: "/images/projects/harmoniq-home.png",
        alt: "Harmoniq mobile home screen"
      },
      {
        src: "/images/projects/harmoniq-share.png",
        alt: "Harmoniq identity card sharing screen"
      }
    ]
  },
  {
    slug: "neuroforge-cognitive-engine",
    title: "Neuroforge",
    category: "AI",
    shortDescription:
      "Local-first second brain combining an autonomous agent, memory graph, smart ingestion, and desktop automation.",
    description:
      "A private cognitive automation engine with CLI and web interfaces, a ReAct-style agent, persistent graph and vector memory, document ingestion, live execution streams, and a mobile API.",
    problem:
      "Cloud-first assistants fragment memory, hide their execution state, and make it difficult to run persistent workflows against private local files and desktop tools.",
    solution:
      "Built a FastAPI and HTMX dashboard, SSE streaming, service lifecycle manager, provider-aware model routing across Gemini, OpenRouter, and Ollama, agent file tools, graph and vector memory, HTTPS mobile endpoints, and opt-in desktop control.",
    impact:
      "Created an end-to-end local agent runtime with transparent model selection, persistent sessions, private workspaces, safe process control, and portable access from browser and mobile clients.",
    stack: ["Python", "FastAPI", "HTMX", "ChromaDB", "NetworkX", "Redis", "Ollama"],
    role: "Solo AI Systems Architect",
    timeline: "2026 - Present",
    featured: true
  }
];
