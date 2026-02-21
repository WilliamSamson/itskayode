export type ProjectCategory = "Web" | "Mobile" | "Backend" | "AI";

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
  screenshots: string[];
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
  href: string;
}

export interface SiteContent {
  name: string;
  fullName: string;
  role: string;
  tagline: string;
  location: string;
  email: string;
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
