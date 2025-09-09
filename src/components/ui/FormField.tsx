// src/components/ui/FormField.tsx
import { ChangeEvent } from "react";

export interface FormFieldProps {
  label: string;
  name: string;
  value: string | undefined;
  type?: "text" | "select" | "number";
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; // Made optional
  error?: string;
  required?: boolean;
  options?: string[];
  readOnly?: boolean;
  disabled?: boolean;
}

export function FormField({
  label,
  name,
  value = "",
  type = "text",
  onChange,
  error,
  required,
  options,
  readOnly,
  disabled,
}: FormFieldProps) {
  return (
    <div className="flex flex-col">
      <label htmlFor={name} className="text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {type === "select" ? (
        <select
          id={name}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          className={`p-3 border rounded-lg ${error ? "border-red-500" : "border-gray-300"}`}
          required={required}
          disabled={disabled}
        >
          <option value="">Select {label}</option>
          {options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value ?? ""}
          onChange={onChange}
          className={`p-3 border rounded-lg ${error ? "border-red-500" : "border-gray-300"}`}
          required={required}
          readOnly={readOnly}
          disabled={disabled}
        />
      )}
      {error && <span className="text-red-500 text-sm mt-1">{error}</span>}
    </div>
  );
}