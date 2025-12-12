import { getColorClasses } from "../../../utils/Utils";

/**
 * This component is for the event modal and it is used for selecting a color for the event. It has some preset colors like blue, orange, purple, green, and red but the user can also choose a custom color too. This is used in the event modal to select the color of the event.
 * 
 * So the following are the props for this component:
 * @prop {String} selectedColor - This is the color that is currently selected.
 * 
 * @param {Function} onChange - This function is called when the color is changed or in other words when the user changes the color.
 * 
 * @returns {JSX.Element} - This is the JSX element for the ColorPicker component which is used in the event modal.
 **/


function ColorPicker({ selectedColor, onChange }) {
  const presetColors = ["blue", "orange", "purple", "green", "red"];

  return (
    <div>
      {/* Label for the color picker */}
      <label className="block text-sm font-medium text-app-text mb-1">
        Event Color
      </label>

      {/* The container for the colors */}
      <div className="flex items-center flex-wrap gap-3">

        {/* Preset colors */}
        <div className="flex space-x-2">
          {presetColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={`w-10 h-10 rounded-full ${getColorClasses(color, "bgDot")} ${
                selectedColor === color
                  ? "ring-2 ring-white ring-offset-2 ring-offset-app-card"
                  : ""
              } focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-app-card transition-transform hover:scale-110`}
            />
          ))}
        </div>

        {/* Custom color */}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={selectedColor.startsWith("#") ? selectedColor : "#1e40af"}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded-full cursor-pointer border border-app-border bg-app-bg"
          />
          <span className="text-sm text-app-text">Custom</span>
        </div>
      </div>
    </div>
  );
}

export default ColorPicker;
