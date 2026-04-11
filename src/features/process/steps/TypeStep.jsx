import React from "react";

const DEFAULT_OPTIONS = [
  { value: "surplus", label: "Nadwyzka" },
  { value: "brak", label: "Brak" },
];

function TypeStep({ value, onChange, error, options = DEFAULT_OPTIONS }) {
  const resolvedOptions = options?.length
    ? options.map((option) => ({
        value: option.value,
        label: option.label,
        tone: option.value === "surplus" ? "surplus" : "shortage",
      }))
    : DEFAULT_OPTIONS.map((option) => ({
        ...option,
        tone: option.value === "surplus" ? "surplus" : "shortage",
      }));

  return (
    <>
      <div className="screen-title">Wybierz typ operacji</div>

      <div className="choice-grid">
        {resolvedOptions.map((option) => (
          <button
            key={option.value}
            className={`choice-btn ${option.tone} ${value === option.value ? "active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            <div className="choice-label">{option.label}</div>
          </button>
        ))}
      </div>

      {error && <div className="input-error-text">{error}</div>}
    </>
  );
}

export default TypeStep;
