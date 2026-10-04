import type { WritingItem } from "@/types/content";

export const writing: WritingItem[] = [
  {
    slug: "adaptive-neural-network-feedforward-feedback-controller",
    title: "Adaptive Neural Network-Based Feedforward-Feedback Controller for Nonlinear Dynamic System",
    summary:
      "A reservoir-computing control architecture that combines Echo State Network feedforward prediction with feedback correction for nonlinear and time-varying systems.",
    publishedAt: "2026-04-13",
    status: "published",
    kind: "research",
    topics: ["Adaptive Control", "Echo State Networks", "Nonlinear Systems", "Robotics"],
    authors: [
      "Kayode Williams Olalere",
      "Bunu Thalib Abubakar",
      "Bernice Gunde Izuwunum",
      "Isaac Ijeoma",
      "Elijah Reuben Kwetishe",
      "Oluwanifemi Adediran",
      "Opeyemi Ayokunle Osanaiye",
      "Temitayo Samson Ogedenbge"
    ],
    primaryAuthor: "Kayode Williams Olalere",
    venue: "Applied Mechanics and Materials",
    volume: "935",
    pages: "153-167",
    doi: "10.4028/p-E2lP5W",
    externalUrl:
      "https://www.researchgate.net/publication/403649967_Adaptive_Neural_Network-Based_Feedforward-Feedback_Controller_for_Nonlinear_Dynamic_System",
    sections: [
      {
        heading: "Research focus",
        paragraphs: [
          "The paper addresses control problems where nonlinear behavior, parameter drift, disturbances, and incomplete models make conventional fixed controllers difficult to tune and maintain.",
          "It investigates whether a lightweight Echo State Network can learn changing system dynamics online while remaining practical for real-time control."
        ]
      },
      {
        heading: "Proposed architecture",
        paragraphs: [
          "The controller joins two complementary paths. The neural feedforward path anticipates the control action required from learned system behavior, while the feedback path corrects residual tracking error and disturbances.",
          "This structure preserves the responsiveness of predictive control while using feedback to maintain robustness when the learned model is imperfect or operating conditions change."
        ]
      },
      {
        heading: "Evaluation and relevance",
        paragraphs: [
          "The study compares the adaptive architecture with PID and LQR baselines across tracking accuracy, stability, noise resilience, and steady-state behavior under uncertain conditions.",
          "The resulting approach is positioned for nonlinear control applications in robotics, aerospace systems, and industrial processes where adaptability and computational efficiency must coexist."
        ]
      }
    ]
  },
  {
    slug: "building-reliable-product-systems",
    title: "Building Reliable Product Systems",
    summary: "How to architect for reliability without slowing feature delivery.",
    publishedAt: "2026-10-11",
    status: "scheduled",
    kind: "note",
    topics: ["Systems Architecture", "Reliability", "Product Engineering"]
  },
  {
    slug: "automation-with-guardrails",
    title: "Automation with Guardrails",
    summary: "Practical design patterns for introducing AI automation into operations.",
    publishedAt: "2026-06-03",
    status: "published",
    kind: "note",
    topics: ["Automation", "AI Systems", "Safety"],
    sections: [
      {
        heading: "Start with bounded authority",
        paragraphs: [
          "Useful automation needs enough authority to complete work, but authority should be limited to the smallest set of actions required. Read access, draft creation, and final execution should be treated as separate capabilities.",
          "A system that can inspect an operation does not automatically need permission to modify it. This separation keeps early deployments useful while reducing the cost of mistakes."
        ]
      },
      {
        heading: "Make state and decisions visible",
        paragraphs: [
          "Operators need to understand what the system observed, what it decided, and what it changed. Structured event logs and clear status transitions make failures easier to diagnose and successful behavior easier to trust.",
          "Visibility also improves the product itself. When decisions are inspectable, teams can identify weak assumptions and refine the workflow without guessing."
        ]
      },
      {
        heading: "Design recovery before autonomy",
        paragraphs: [
          "Every automated action should have a known failure state and a recovery path. Reversible changes, idempotent operations, bounded retries, and explicit escalation points are practical foundations for reliable automation.",
          "The goal is not to remove people from the system. The goal is to let software handle repeatable work while keeping human judgment available for ambiguous or high impact decisions."
        ]
      }
    ]
  }
];
