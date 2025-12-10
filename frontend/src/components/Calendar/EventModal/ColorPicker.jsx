import { getColorClasses } from "../../../utils/Utils";

function ColorPicker({ selectedColor, onChange }) {
  const presetColors = ["blue", "orange", "purple", "green", "red"];

  return (
    <div>
      <label className="block text-sm font-medium text-app-text mb-1">
        Event Color
      </label>
      <div className="flex items-center flex-wrap gap-3">
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
