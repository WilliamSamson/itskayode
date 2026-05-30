import type { Project } from "@/types/content";

export const projects: Project[] = [
  {
    slug: "acauide-web",
    title: "acauide_web",
    category: "Web",
    shortDescription:
      "Web application workspace for student-focused learning workflows and academic utility tooling.",
    description:
      "A modern web platform focused on guided learning workflows, academic utility tooling, and scalable student operations.",
    problem:
      "Students needed a centralized web experience that combines practical learning support with scalable product delivery workflows.",
    solution:
      "Implemented a Next.js-based platform with component-driven interfaces, backend integrations, and structured frontend architecture.",
    impact:
      "Improved delivery speed for iterative student-facing features and created a maintainable base for future learning modules.",
    stack: ["Next.js", "TypeScript", "Firebase", "Tailwind CSS", "Node.js"],
    role: "Full-Stack Developer",
    timeline: "2026 - Present",
    featured: true,
    liveUrl: "https://acauideco.web.app/"
  },
  {
    slug: "ws-tech-venture-studio",
    title: "WS Tech Venture Studio",
    category: "Web",
    shortDescription:
      "Venture studio web platform for initiatives, content systems, and technical product presentation.",
    description:
      "A studio-grade web foundation focused on product communication, experiments visibility, and systemized delivery.",
    problem:
      "Needed a single digital surface to represent venture work while keeping engineering workflows fast and maintainable.",
    solution:
      "Built a scalable Next.js studio platform with structured content flow, reusable sections, and production-oriented deployment setup.",
    impact:
      "Created a stronger public technical identity and a reusable foundation for future studio products.",
    stack: ["Next.js", "TypeScript", "Firebase", "Tailwind CSS"],
    role: "Founder and Technical Lead",
    timeline: "2026 - Present",
    featured: true,
    liveUrl: "https://ws-tech-studio.web.app/"
  },
  {
    slug: "cds-cognitive-decision-sandbox",
    title: "Cognitive Decision Sandbox (CDS)",
    category: "AI",
    shortDescription:
      "Interactive scenario-based bias recognition system for critical thinking and decision-quality improvement.",
    description:
      "A research-oriented experimental platform from the studio experiments stack focused on practical cognitive bias detection.",
    problem:
      "Most people understand bias in theory but struggle to detect it in real-time decisions under uncertainty.",
    solution:
      "Built a gamified scenario engine with adaptive prompts, feedback loops, and bias-aware reflection paths.",
    impact:
      "Improved decision-awareness workflows and enabled measurable behavior-oriented experimentation for learning contexts.",
    stack: ["Next.js", "TypeScript", "Framer Motion", "Recharts", "Firestore"],
    role: "Systems Architect and Product Engineer",
    timeline: "2026",
    featured: true,
    liveUrl: "https://ws-tech-studio.web.app/experiments/cds"
  },
  {
    slug: "harmoniq",
    title: "Harmoniq",
    category: "Web",
    shortDescription:
      "Premium audio experience and venture project for music analytics and telemetry.",
    description:
      "A technology platform focused on musical workflows, telemetry analysis, and sound visualization. Part of the WS Tech Venture Studio portfolio.",
    problem:
      "Developing high-fidelity audio platforms requires seamless client telemetry, precise playback coordination, and scalable web delivery.",
    solution:
      "Designed and engineered a modular Next.js application equipped with advanced audio telemetry capture and responsive controls.",
    impact:
      "Created a production-ready baseline for audio-focused web solutions with structured state patterns and optimized asset loading.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Firebase"],
    role: "Full-Stack Developer & Systems Engineer",
    timeline: "2026 - Present",
    featured: true,
    liveUrl: "https://ws-tech-studio.web.app/ventures/harmoniq"
  },
  {
    slug: "chaos-core-pendulum-entropy",
    title: "Chaos Core (Pendulum Entropy)",
    category: "Backend",
    shortDescription:
      "Entropy generation experiment based on chaotic double-pendulum physics for security-grade randomness.",
    description:
      "A pendulum-centered experiment from the studio lab demonstrating physical-chaos inspired entropy workflows.",
    problem:
      "Software-only pseudo-random approaches can be insufficient for high-assurance entropy-sensitive applications.",
    solution:
      "Implemented a chaos-driven entropy prototype using double-pendulum behavior, telemetry capture, and quality checks.",
    impact:
      "Created a practical R&D path for integrating physical-system dynamics into security and cryptography-oriented randomness pipelines.",
    stack: ["Next.js", "TypeScript", "Canvas", "Node.js", "Cryptography"],
    role: "Research Engineer",
    timeline: "2026",
    featured: true
  },
  {
    slug: "neuroforge-cognitive-engine",
    title: "Neuroforge",
    category: "AI",
    shortDescription:
      "Local-first cognitive automation engine combining memory graph, agent workflows, and multi-service orchestration.",
    description:
      "An AI systems platform designed for private, local-first autonomous task execution and cognitive workflow orchestration.",
    problem:
      "Most assistant workflows are cloud-dependent and fragmented, making private long-running cognition difficult to manage.",
    solution:
      "Built a composable architecture spanning CLI, API, agent tooling, and memory layers with service lifecycle management.",
    impact:
      "Enabled reliable local-first automation experiments and accelerated development of research-grade cognitive workflows.",
    stack: ["Python", "FastAPI", "Uvicorn", "Redis", "Celery", "TypeScript"],
    role: "Systems Architect and AI Engineer",
    timeline: "2026 - Present",
    featured: true
  },
  {
    slug: "echo-v2-flutter",
    title: "echo_v2",
    category: "Mobile",
    shortDescription:
      "Flutter mobile project for iterative app experiments with structured routing and modern UI flow.",
    description:
      "A focused Flutter codebase used to evolve production-ready mobile architecture and routing patterns.",
    problem:
      "Needed a lightweight mobile project space for rapid iteration on app architecture and navigation patterns.",
    solution:
      "Built and iterated a Flutter v2 project structure with clear module boundaries, route management, and reusable UI patterns.",
    impact:
      "Accelerated experimentation and reduced turnaround time when validating mobile interaction and architecture decisions.",
    stack: ["Flutter", "Dart", "go_router"],
    role: "Mobile Developer",
    timeline: "2026",
    featured: true
  }
];
