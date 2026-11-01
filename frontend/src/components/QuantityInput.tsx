import { PANTRY_UNITS, type PantryUnit } from '../types';

interface Props {
  value: number;
  unit: PantryUnit;
  onValueChange: (v: number) => void;
  onUnitChange?: (u: PantryUnit) => void;
  step?: number;
  min?: number;
  placeholder?: string;
}

export function QuantityInput({
  value,
  unit,
  onValueChange,
  onUnitChange,
  step = 0.5,
  min = 0,
  placeholder,
}: Props) {
  return (
    <div className="flex gap-2">
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={Number.isFinite(value) ? value : 0}
        placeholder={placeholder}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="input flex-1"
      />
      <select
        value={unit}
        onChange={(e) => onUnitChange?.(e.target.value as PantryUnit)}
        disabled={!onUnitChange}
        className="input w-24 appearance-none cursor-pointer"
      >
        {PANTRY_UNITS.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>
    </div>
  );
}
