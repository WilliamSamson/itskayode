"use client";

import { useState } from "react";
import { siteContent } from "@/content/site";
import { Button } from "@/components/button";
import { FormField } from "@/components/form-field";

interface ContactFormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: {
    name?: string;
    email?: string;
    message?: string;
  };
}

const initialContactState: ContactFormState = {
  status: "idle",
  message: ""
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ContactForm() {
  const [state, setState] = useState<ContactFormState>(initialContactState);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    const fieldErrors: ContactFormState["fieldErrors"] = {};

    if (name.length < 2) {
      fieldErrors.name = "Please enter your name.";
    }

    if (!isValidEmail(email)) {
      fieldErrors.email = "Please enter a valid email address.";
    }

    if (message.length < 12) {
      fieldErrors.message = "Message should be at least 12 characters.";
    }

    if (fieldErrors.name || fieldErrors.email || fieldErrors.message) {
      setState({
        status: "error",
        message: "Please fix the highlighted fields.",
        fieldErrors
      });
      return;
    }

    const subject = encodeURIComponent(`Portfolio Contact - ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    const mailtoHref = `mailto:${siteContent.email}?subject=${subject}&body=${body}`;

    setState({
      status: "success",
      message: "Opening your email client..."
    });

    window.location.href = mailtoHref;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 border border-white/10 bg-surface/80 p-6 sm:p-8" noValidate>
      <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Project Brief</p>
          <h2 className="text-2xl font-heading font-bold uppercase tracking-[0.04em] text-white md:text-3xl">
            Send Message
          </h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Secure Form</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Name" name="name" placeholder="Your name" error={state.fieldErrors?.name} />
        <FormField
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          error={state.fieldErrors?.email}
        />
      </div>

      <FormField
        label="Message"
        name="message"
        placeholder="Tell me what you are building, timeline, and key constraints."
        multiline
        rows={7}
        error={state.fieldErrors?.message}
      />

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" variant="primary" className="w-full sm:w-auto sm:min-w-[180px]">
          Send Message
        </Button>
        {state.status !== "idle" ? (
          <p
            className="text-sm text-text/75"
            role="status"
            aria-live="polite"
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
