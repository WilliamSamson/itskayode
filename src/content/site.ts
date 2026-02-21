import type { SiteContent } from "@/types/content";

export const siteContent: SiteContent = {
  name: "Kayode Olalere",
  fullName: "Kayode Williams Olalere",
  role: "Full-Stack Developer | Mechatronics & Robotics Engineer | Systems Architect",
  tagline: "High Agency • Systems-Driven • R&D Fluent",
  location: "Abuja, Nigeria",
  email: "williamsamson036@gmail.com",
  phone: process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "",
  siteTitle: "Kayode Olalere — Multidisciplinary Engineer",
  description:
    "Portfolio of Kayode Williams Olalere, a Full-Stack Developer, Mechatronics and Robotics Engineer, and Systems Architect building at the intersection of bits and atoms.",
  shortBio:
    "Execution-focused Mobile Developer and Mechatronics Engineer with a strong foundation in innovative technology research, automation, and systems architecture.",
  longBio:
    "I operate with strategic logic, high agency, and strong R&D fluency. My foundation spans mobile development, mechatronics, and robotics, allowing me to bridge the gap between complex software systems and physical automation. From engineering research-grade encryption prototypes to teaching robotics fundamentals at Afrelib Academy and Innov8 Hub, I am driven by a passion for continuous learning and technological innovation.",
  cta: [
    { label: "View Works", href: "/projects" },
    { label: "Let's Talk", href: "/#contacts" }
  ],
  nav: [
    { label: "Home", href: "/" },
    { label: "Projects", href: "/projects" },
    { label: "About Me", href: "/about" },
    { label: "Contact Me", href: "/contact" },
    { label: "Fun", href: "/fun" }
  ],
  socials: [
    { label: "GitHub", href: "https://github.com/WilliamSamson" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/kayode-williams-olalere-b68b09250/" },
    { label: "Email", href: "mailto:williamsamson036@gmail.com" }
  ],
  highlights: [
    { title: "Background", value: "Mechatronics & Soft Dev" },
    { title: "Specialty", value: "R&D & Systems Architecture" },
    { title: "Philosophy", value: "Strategic Logic & High Agency" },
    { title: "Location", value: "Abuja, Nigeria" }
  ],
  skills: {
    "Domain Mastery": [
      "Fullstack Mobile Application Development",
      "Mechatronics, Robotics & Automation",
      "Systems Architecture & Protocol Design",
      "Technological Research & R&D Fluency",
      "Defensive Systems & Logic Firewalls",
      "Strategic Problem Solving",
      "CAD Design (SolidWorks, Onshape)",
      "Technical Mentorship & Leadership"
    ],
    "Languages & Logic": [
      "Dart (Flutter)", "Python", "C", "C++", "JavaScript",
      "TypeScript", "Kotlin", "Java", "Rust", "Bash", "SQL"
    ],
    "Frameworks & Tooling": [
      "Flutter", "Firebase", "Supabase", "Arduino", "ROS",
      "MATLAB", "KiCad", "Git", "REST APIs", "SolidWorks",
      "Onshape", "Linux Systems"
    ],
    Platforms: ["Android", "iOS", "IoT Systems", "Web"]
  },
  values: [
    "Operate with high agency and strategic R&D fluency.",
    "Bridges the gap between complex software and physical robotics.",
    "Driven by curiosity and a relentless pursuit of performance.",
    "Committed to learner-driven innovation and technical mentorship."
  ],
  education: [
    {
      institution: "Nile University of Nigeria",
      program: "Bachelor of Engineering in Mechatronics, Robotics, and Automation Engineering",
      period: "September 2022 - November 2027",
      notes: [
        "Relevant Coursework: Robotics Systems, Automation Technologies, Engineering Design, Control Systems.",
        "Founded and led the Robotics Club at Nile University."
      ]
    }
  ],
  certifications: [
    {
      issuer: "Space Generation Advisory Council",
      title: "Certificate of Participation (Delegate)",
      date: "November 2023"
    },
    {
      issuer: "Coursera",
      title: "Work Smarter, Not Harder: Time Management for Personal & Professional Productivity",
      date: "October 2022"
    }
  ]
};
