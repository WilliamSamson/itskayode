import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { siteContent } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Start a conversation or get in touch with Kayode Williams Olalere.",
  openGraph: {
    title: "Contact | Kayode Williams Olalere",
    description: "Start a conversation or get in touch with Kayode Williams Olalere.",
    url: "/contact/"
  }
};

export default function ContactPage() {
  const linkedIn = siteContent.socials.find((item) => item.label === "LinkedIn")?.href;
  const github = siteContent.socials.find((item) => item.label === "GitHub")?.href;

  return (
    <div className="relative left-1/2 w-[calc(100vw-1rem)] max-w-none -translate-x-1/2 pb-4 sm:w-[calc(100vw-2rem)]">
      <section className="min-h-[calc(100svh-7rem)] overflow-hidden rounded-xl bg-text p-2 shadow-[0_30px_100px_rgb(15_15_15_/_0.18)] sm:p-3">
        <div
          className="grid min-h-[42rem] overflow-hidden rounded-xl lg:grid-cols-[1.08fr_0.92fr]"
          style={{ minHeight: "max(42rem, calc(100svh - 8.5rem))" }}
        >
          <div className="contact-landscape relative min-h-[27rem] overflow-hidden p-5 sm:min-h-[34rem] sm:p-8 lg:min-h-[42rem] lg:p-10">
            <div className="contact-sun absolute -right-16 -top-16 h-64 w-64 rounded-full sm:h-80 sm:w-80" />
            <div className="absolute inset-x-0 bottom-0 h-[62%]">
              <span className="contact-hill contact-hill-back absolute -bottom-[20%] -left-[18%] h-[90%] w-[82%] rounded-[50%]" />
              <span className="contact-hill contact-hill-mid absolute -bottom-[28%] left-[22%] h-[100%] w-[95%] rounded-[50%]" />
              <span className="contact-hill contact-hill-front absolute -bottom-[40%] -right-[25%] h-[115%] w-[90%] rounded-[50%]" />
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <Link
                href="/"
                className="focus-ring relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-bg shadow-xl transition-transform hover:scale-105"
                aria-label="Kayode Olalere home"
              >
                <Image
                  src="/itskayode-light.png"
                  alt="Kayode Olalere"
                  width={48}
                  height={48}
                  className="h-full w-full object-contain"
                />
              </Link>
              <span className="rounded-full bg-text/80 px-4 py-2 text-[11px] font-semibold text-bg backdrop-blur">
                Abuja · GMT+1
              </span>
            </div>

            <div className="absolute bottom-0 right-[-7%] z-[5] h-[78%] w-[72%] sm:right-[-2%] sm:h-[84%] sm:w-[66%] lg:right-[-8%] lg:h-[82%] lg:w-[72%]">
              <Image
                src="/images/founder.webp"
                alt="Kayode Williams Olalere"
                fill
                priority
                sizes="(max-width: 1024px) 65vw, 42vw"
                className="object-contain object-bottom drop-shadow-[0_30px_50px_rgb(0_0_0_/_0.22)]"
              />
            </div>

            <div className="absolute bottom-5 left-5 right-5 z-20 rounded-xl bg-text/95 p-5 text-bg shadow-2xl backdrop-blur-md sm:bottom-8 sm:left-8 sm:max-w-[23rem] sm:p-6 lg:bottom-10 lg:left-10">
              <blockquote className="text-[13px] font-semibold leading-7">
                &ldquo;I build dependable software systems that connect people, intelligence, and the physical world.&rdquo;
              </blockquote>
              <div className="mt-5 flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-full bg-bg/10">
                  <Image
                    src="/images/founder.webp"
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover object-top"
                  />
                </div>
                <div>
                  <p className="text-[13px] font-semibold">{siteContent.fullName}</p>
                  <p className="mt-0.5 text-[11px] text-bg/45">
                    Systems Engineer
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex bg-text px-5 py-9 sm:px-9 sm:py-12 lg:px-12 lg:py-14">
            <div className="mx-auto flex w-full max-w-[31rem] flex-col justify-center">
              <div className="mb-7 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-bg/35">
                    Available for focused work
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-bg/45">
                    Software systems, mobile products, automation, robotics, and technical R&amp;D.
                  </p>
                </div>
              </div>

              <ContactForm
                variant="dark"
                eyebrow="Contact Kayode"
                title="Let's build something useful."
                submitLabel="Send message"
              />

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border-subtle pt-5">
                {github ? (
                  <Link
                    href={github}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring text-[11px] font-semibold text-bg/45 transition-colors hover:text-bg"
                  >
                    GitHub ↗
                  </Link>
                ) : null}
                {linkedIn ? (
                  <Link
                    href={linkedIn}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring text-[11px] font-semibold text-bg/45 transition-colors hover:text-bg"
                  >
                    LinkedIn ↗
                  </Link>
                ) : null}
                <span className="ml-auto text-[11px] text-bg/25">
                  Replies within one business day
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
