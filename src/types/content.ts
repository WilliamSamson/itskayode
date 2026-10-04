export type ProjectCategory = "Web" | "Mobile" | "Backend" | "AI" | "Desktop";
export type ProjectVisualKind = "terminal" | "architecture" | "automation" | "mystery" | "planner";

export interface ProjectVisual {
  src: string;
  alt: string;
}

export interface SiteLink {
  label: string;
  href: string;
}

export interface SocialLink {
  label: string;
  href: string;
}

export interface Highlight {
  title: string;
  value: string;
}

export interface EducationItem {
  institution: string;
  program: string;
  period: string;
  notes: string[];
}

export interface CertificationItem {
  issuer: string;
  title: string;
  date: string;
  credentialUrl?: string;
}

export interface Project {
  slug: string;
  title: string;
  category: ProjectCategory;
  shortDescription: string;
  description: string;
  problem: string;
  solution: string;
  impact: string;
  stack: string[];
  role: string;
  timeline: string;
  featured: boolean;
  githubUrl?: string;
  liveUrl?: string;
  coverImage?: string;
  coverAlt?: string;
  visualKind?: ProjectVisualKind;
  gallery?: ProjectVisual[];
}

export interface ExperienceItem {
  id: string;
  period: string;
  title: string;
  organization: string;
  summary: string;
}

export interface WritingItem {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  status: "published" | "scheduled";
  kind?: "research" | "note";
  topics: string[];
  authors?: string[];
  primaryAuthor?: string;
  venue?: string;
  volume?: string;
  pages?: string;
  doi?: string;
  externalUrl?: string;
  sections?: {
    heading: string;
    paragraphs: string[];
  }[];
}

export interface SiteContent {
  name: string;
  fullName: string;
  role: string;
  tagline: string;
  location: string;
  phone: string;
  siteTitle: string;
  description: string;
  shortBio: string;
  longBio: string;
  cta: SiteLink[];
  nav: SiteLink[];
  socials: SocialLink[];
  highlights: Highlight[];
  skills: Record<string, string[]>;
  values: string[];
  education: EducationItem[];
  certifications: CertificationItem[];
}
