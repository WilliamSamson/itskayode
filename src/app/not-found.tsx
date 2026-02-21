import Link from "next/link";
import { Button } from "@/components/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 py-16">
      <p className="text-xs uppercase tracking-[0.16em] text-text/60">404</p>
      <h1 className="text-3xl font-semibold sm:text-4xl">Page not found</h1>
      <p className="text-sm leading-7 text-text/75">
        The page you requested does not exist or has been moved.
      </p>
      <Button href="/" variant="secondary">
        Back to Home
      </Button>
      <Link href="/projects" className="focus-ring rounded-sm text-sm underline-offset-4 hover:underline">
        Browse Projects
      </Link>
    </div>
  );
}
