"use client";

interface Props {
  options: string[];
  optionType: "radio" | "grid";
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export default function ChoiceOptions({ options, optionType, onSelect, disabled }: Props) {
  if (optionType === "grid") {
    return (
      <div className="grid grid-cols-3 gap-2 my-2">
        {options.map((opt) => (
          <button
            key={opt}
            disabled={disabled}
            onClick={() => onSelect(opt)}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-xs text-center leading-tight">{opt}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 my-2">
      {options.map((opt) => (
        <button
          key={opt}
          disabled={disabled}
          onClick={() => onSelect(opt)}
          className="text-left px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all text-sm text-gray-700 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{opt}</span>
          <span className="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-gray-500 transition-colors shrink-0" />
        </button>
      ))}
    </div>
  );
}
