import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { projects } from "@/content/projects";
import { getNextProjectSlug, getProjectBySlug } from "@/lib/content";
import { ProjectDetailClient } from "@/components/project-detail-client";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    return {
      title: "Project Not Found"
    };
  }

  return {
    title: project.title,
    description: project.shortDescription,
    openGraph: {
      title: project.title,
      description: project.shortDescription,
      images: ["/og-image.svg"]
    }
  };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const nextProjectSlug = getNextProjectSlug(project.slug);
  const nextProject = getProjectBySlug(nextProjectSlug);

  return (
    <ProjectDetailClient
      project={project}
      nextProject={nextProject}
    />
  );
}
