import { useCallback, useRef } from "react";

type KnobProps = {
  label: string;
  labelRu: string;
  value: number; // 0..1
  onChange: (v: number) => void;
  disabled?: boolean;
  size?: number;
};

/** Physical rotary knob: drag vertically or circularly */
export function Knob({
  label,
  labelRu,
  value,
  onChange,
  disabled = false,
  size = 88,
}: KnobProps) {
  const startY = useRef(0);
  const startVal = useRef(0);
  const dragging = useRef(false);

  const angle = -135 + value * 270; // sweep 270deg

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      dragging.current = true;
      startY.current = e.clientY;
      startVal.current = value;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled, value],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || disabled) return;
      const dy = startY.current - e.clientY;
      const next = Math.min(1, Math.max(0, startVal.current + dy / 140));
      onChange(next);
    },
    [disabled, onChange],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`knob-grab relative rounded-full ${disabled ? "opacity-50" : ""}`}
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle at 35% 30%, #6a6058 0%, #3a322c 40%, #1a1612 100%)",
          boxShadow:
            "inset 0 2px 4px rgba(255,255,255,0.12), inset 0 -3px 6px rgba(0,0,0,0.6), 0 4px 10px rgba(0,0,0,0.5), 0 0 0 3px #2a2420, 0 0 0 5px #4a4038",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-label={`${labelRu} / ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowUp" || e.key === "ArrowRight")
            onChange(Math.min(1, value + 0.05));
          if (e.key === "ArrowDown" || e.key === "ArrowLeft")
            onChange(Math.max(0, value - 0.05));
        }}
      >
        {/* index mark */}
        <div
          className="absolute left-1/2 top-1/2 origin-bottom"
          style={{
            width: 4,
            height: size * 0.38,
            marginLeft: -2,
            marginTop: -size * 0.38,
            transform: `rotate(${angle}deg)`,
            background:
              "linear-gradient(to bottom, #e8dcc4 0%, #c4a878 70%, transparent 100%)",
            borderRadius: 2,
            boxShadow: "0 0 4px rgba(255,200,100,0.4)",
          }}
        />
        {/* center cap */}
        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            marginLeft: -size * 0.14,
            marginTop: -size * 0.14,
            background:
              "radial-gradient(circle at 40% 35%, #8a8078, #2a2420)",
            boxShadow: "inset 0 1px 2px rgba(255,255,255,0.2)",
          }}
        />
      </div>
      <div className="text-center leading-tight">
        <div className="text-[10px] tracking-[0.15em] uppercase text-[#c4b498]">
          {labelRu}
        </div>
        <div className="text-[9px] tracking-wider text-[#8a7a60]">{label}</div>
      </div>
    </div>
  );
}
