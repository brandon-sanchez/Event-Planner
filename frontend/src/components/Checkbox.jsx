import { Check } from "lucide-react";

const Checkbox = ({ id, checked, onChange, label, className = "" }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        id={id}
        onClick={() => onChange(!checked)}
        className={`
          relative w-5 h-5 rounded border-2 transition-all duration-200 ease-in-out
          ${
            checked
              ? "bg-app-rose border-app-rose"
              : "bg-app-bg border-app-border hover:border-app-muted"
          }
          focus:outline-none focus:ring-2 focus:ring-app-rose/50 focus:ring-offset-2 focus:ring-offset-app-card
        `}
      >
        <Check
          className={`
            absolute inset-0 w-4 h-4 m-auto text-white transition-all duration-200
            ${
              checked
                ? "opacity-100 scale-100"
                : "opacity-0 scale-50"
            }
          `}
          strokeWidth={3}
        />
      </button>
      {label && (
        <label
          htmlFor={id}
          onClick={() => onChange(!checked)}
          className="text-sm text-app-text cursor-pointer select-none"
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default Checkbox;
