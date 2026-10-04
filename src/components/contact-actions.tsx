"use client";

import { siteContent } from "@/content/site";

export function ContactActions() {
  const phone = siteContent.phone.replace(/\s+/g, "");

  const focusForm = () => {
    const form = document.getElementById("contact-form");
    form?.scrollIntoView({ behavior: "smooth", block: "start" });
    form?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });
  };

  const openPhone = () => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="mt-5 grid gap-3">
      <button
        type="button"
        onClick={focusForm}
        className="focus-ring inline-flex items-center justify-between rounded-md bg-text px-4 py-3 text-[13px] font-semibold text-bg hover:bg-text/80 transition-colors w-full"
      >
        <span>Send a message</span>
        <span aria-hidden>→</span>
      </button>
      {phone ? (
        <button
          type="button"
          onClick={openPhone}
          className="focus-ring inline-flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-[13px] font-semibold text-text hover:bg-surface/85 hover:border-text/25 transition-all w-full"
        >
          <span>Call me</span>
          <span aria-hidden>→</span>
        </button>
      ) : null}
    </div>
  );
}
