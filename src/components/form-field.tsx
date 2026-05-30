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
  required = true
}: FormFieldProps) {
  const id = `field-${name}`;
  const commonClasses = cn(
    "focus-ring w-full rounded-sm border bg-surface px-4 py-3 text-sm text-text placeholder:text-text/45 transition-colors duration-200",
    error ? "border-text" : "border-border hover:border-text/30"
  );

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-[10px] font-black uppercase tracking-[0.14em] text-text/75">
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
        <p id={`${id}-error`} className="text-xs text-primary">
          {error}
        </p>
      ) : null}
    </div>
  );
}
