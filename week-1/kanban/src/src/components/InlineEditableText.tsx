import { useEffect, useId, useRef, useState } from "react";

export function InlineEditableText(props: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
}) {
  const { value, onChange, placeholder, className, inputClassName, ariaLabel } = props;
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <input
        id={inputId}
        ref={inputRef}
        aria-label={ariaLabel ?? "Edit text"}
        className={
          inputClassName ??
          "w-full rounded-md border border-[color:var(--border)] bg-white/80 px-2 py-1 text-[13px] font-semibold text-[color:var(--dark-navy)] shadow-sm outline-none focus:ring-2 focus:ring-[color:var(--blue-primary)]"
        }
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className={
        className ??
        "w-full rounded-md px-2 py-1 text-left text-[13px] font-semibold text-[color:var(--dark-navy)] hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-[color:var(--blue-primary)]"
      }
      onClick={() => setEditing(true)}
    >
      {value || <span className="text-[color:var(--gray-text)]">{placeholder}</span>}
    </button>
  );
}

