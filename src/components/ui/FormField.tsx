// src/components/ui/FormField.tsx

import React from "react";

interface FormFieldProps {
  label: string;
  name: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  error?: string;
  required?: boolean;
  type?: "text" | "number" | "select";
  options?: { value: string; label: string }[] | string[];
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  min?: number;
  max?: number;
  maxLength?: number;
}

export function FormField({
  label,
  name,
  value,
  onChange,
  error,
  required,
  type = "text",
  options,
  readOnly,
  disabled,
  className,
  inputClassName,
  min,
  max,
  maxLength,
}: FormFieldProps) {
  // Wrapper to enforce maxLength on numbers too
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (type === "number" && maxLength) {
      const input = e.target as HTMLInputElement;
      if (input.value.length > maxLength) {
        input.value = input.value.slice(0, maxLength); // trim value
      }
    }
    onChange?.(e);
  };

  return (
    <div className={`space-y-1 ${className || ""}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {type === "select" ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={`w-full ${inputClassName || ""} ${error ? "border-red-500" : ""}`}
        >
          <option value="">Select {label}</option>
          {(options || []).map((opt) =>
            typeof opt === "string" ? (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ) : (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            )
          )}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          readOnly={readOnly}
          disabled={disabled}
          min={min}
          max={max}
          maxLength={maxLength} // works on text; for numbers we enforce in handleChange
          className={`w-full ${inputClassName || ""} ${error ? "border-red-500" : ""}`}
        />
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}