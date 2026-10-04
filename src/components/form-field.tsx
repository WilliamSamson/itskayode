import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "email";
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
  defaultValue?: string;
  required?: boolean;
  variant?: "default" | "dark";
}

export function FormField({
  label,
  name,
  type = "text",
  placeholder,
  error,
  multiline = false,
  rows = 5,
  defaultValue,
  required = true,
  variant = "default"
}: FormFieldProps) {
  const id = `field-${name}`;
  const commonClasses = cn(
    "focus-ring w-full border px-4 py-3 text-[13px] transition-colors duration-200",
    variant === "dark"
      ? "rounded-xl border-border-subtle bg-elevated text-text placeholder:text-primary-dim hover:border-border focus:border-border-strong"
      : "rounded-md bg-surface text-text placeholder:text-text/45",
    error
      ? variant === "dark"
        ? "border-accent-red/70"
        : "border-text"
      : variant === "default"
        ? "border-border hover:border-text/30"
        : ""
  );

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className={cn(
          "text-[11px] font-semibold",
          variant === "dark" ? "text-text/75" : "text-text/75"
        )}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          rows={rows}
          placeholder={placeholder}
          className={commonClasses}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          defaultValue={defaultValue}
          required={required}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          className={commonClasses}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          defaultValue={defaultValue}
          required={required}
        />
      )}
      {error ? (
        <p id={`${id}-error`} className={cn("text-[11px]", variant === "dark" ? "text-accent-red" : "text-primary")}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
