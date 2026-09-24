import type { ReaderMode } from "@storylight/shared";

const MODES: Array<{ value: ReaderMode; label: string }> = [
  { value: "listen", label: "Listen" },
  { value: "together", label: "Together" },
  { value: "read_it_myself", label: "I'll Read" },
];

type ModeSwitcherProps = {
  mode: ReaderMode;
  onChange: (mode: ReaderMode) => void;
};

/** The reading ladder, always visible and always the child's choice (section 5.4: never an automatic switch). */
export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div className="mode-switcher" role="tablist" aria-label="Reading mode">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          role="tab"
          aria-selected={mode === m.value}
          className={`mode-switcher__tab ${mode === m.value ? "mode-switcher__tab--active" : ""}`}
          onClick={() => onChange(m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
