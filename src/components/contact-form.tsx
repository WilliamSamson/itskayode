"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { FormField } from "@/components/form-field";

interface ContactFormState {
  status: "idle" | "sending" | "success" | "error";
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

interface ContactFormProps {
  defaultMessage?: string;
  eyebrow?: string;
  submitLabel?: string;
  subject?: string;
  title?: string;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ContactForm({
  defaultMessage,
  eyebrow = "Project Brief",
  submitLabel = "Send Message",
  subject = "Portfolio Contact",
  title = "Send Message"
}: ContactFormProps) {
  const [state, setState] = useState<ContactFormState>(initialContactState);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const botcheck = String(formData.get("botcheck") ?? "");

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

    if (botcheck) {
      setState({
        status: "success",
        message: "Your message has been sent."
      });
      form.reset();
      return;
    }

    const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
    if (!accessKey) {
      setState({
        status: "error",
        message: "Message delivery is not configured yet. Please try again later."
      });
      return;
    }

    setState({ status: "sending", message: "Sending your message..." });

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `${subject} - ${name}`,
          from_name: name,
          name,
          email,
          message,
          botcheck
        })
      });
      const result: { success?: boolean; message?: string } = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Submission failed");
      }

      setState({
        status: "success",
        message: "Your message has been sent."
      });
      form.reset();
    } catch {
      setState({
        status: "error",
        message: "Your message could not be sent. Please try again."
      });
    }
  };

  return (
    <form
      id="contact-form"
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-border/80 bg-surface/30 p-6 sm:p-8"
      aria-busy={state.status === "sending"}
      noValidate
    >
      <div className="flex items-end justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-2">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-text/45">
            {`// ${eyebrow.toUpperCase()}`}
          </p>
          <h2 className="text-xl font-heading font-black uppercase tracking-tight text-text sm:text-2xl">
            {title}
          </h2>
        </div>
        <span className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-text/35">
          TLS SECURE
        </span>
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
        defaultValue={defaultMessage}
      />

      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-botcheck">Leave this field empty</label>
        <input id="contact-botcheck" type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-3 border-t border-border/40 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="submit"
          variant="primary"
          disabled={state.status === "sending"}
          className="w-full disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-[180px]"
        >
          {state.status === "sending" ? "Sending..." : submitLabel}
        </Button>
        {state.status !== "idle" ? (
          <p
            className={`text-xs font-mono uppercase tracking-wider ${
              state.status === "success"
                ? "text-text/75 font-bold"
                : state.status === "error"
                ? "text-text/60"
                : "text-text/40"
            }`}
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
