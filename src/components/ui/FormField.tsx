// src/components/ui/FormField.tsx
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
}: FormFieldProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === "select" ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full ${inputClassName} ${error ? "border-red-500" : ""}`}
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
          onChange={onChange}
          readOnly={readOnly}
          disabled={disabled}
          className={`w-full ${inputClassName} ${error ? "border-red-500" : ""}`}
        />
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}