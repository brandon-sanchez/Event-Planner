import { Check } from "lucide-react";


/**
 * Checkbox component for the calendar page. It has the id, checked, onChange, label, and className.
 * 
 * @param {string} id - the id of the checkbox
 * @param {boolean} checked - whether the checkbox is checked or not
 * @param {Function} onChange - the function to call for when the checkbox is changed or in other words when the user clicks the checkbox
 * @param {string} label - the label of the checkbox that is displayed next to the checkbox
 * @param {string} className - the class name of the checkbox that is used to style the checkbox
 * 
 * @returns {JSX.Element} - the jsx element for the checkbox component
 */

const Checkbox = ({ id, checked, onChange, label, className = "" }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* checkbox button */}
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
        {/* check icon */}
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

      {/* label */}
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
