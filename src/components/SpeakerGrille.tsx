type Props = { active: boolean; volume: number };

export function SpeakerGrille({ active, volume }: Props) {
  return (
    <div
      className="relative rounded-lg overflow-hidden border-2 border-[#3a3228]"
      style={{
        boxShadow:
          "inset 0 0 20px rgba(0,0,0,0.8), 0 2px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div
        className="grille h-28 sm:h-36 w-full"
        style={{
          opacity: active ? 0.95 : 0.7,
        }}
      />
      {/* subtle pulse when playing */}
      {active && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, rgba(255,176,32,${0.04 + volume * 0.08}) 0%, transparent 70%)`,
          }}
        />
      )}
      <div className="absolute bottom-1.5 left-0 right-0 text-center text-[9px] tracking-[0.3em] text-[#5a4a38]">
        ДИНАМИК · SPEAKER
      </div>
    </div>
  );
}
