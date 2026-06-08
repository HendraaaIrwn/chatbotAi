"use client";

type AssistantOrbProps = {
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "h-10 w-10",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

export function AssistantOrb({ size = "lg" }: AssistantOrbProps) {
  return (
    <div className="relative grid place-items-center">
      <div className="orb-glow absolute h-[140%] w-[140%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_36%,transparent_68%)] blur-xl" />
      <div
        className={`orb-core orb-shadow relative overflow-hidden rounded-full ${sizeClass[size]} bg-[radial-gradient(circle_at_34%_26%,#ffffff_0%,#d6d5db_9%,#656774_28%,#070811_62%,#000000_100%)]`}
      >
        <span className="absolute -left-3 top-1.5 h-10 w-16 rotate-[-30deg] rounded-full bg-white/35 blur-lg" />
        <span className="absolute bottom-2 right-1.5 h-10 w-14 rotate-[-30deg] rounded-full bg-white/10 blur-md" />
        <span className="absolute inset-x-4 bottom-5 h-6 rounded-full bg-black/50 blur-sm" />
      </div>
    </div>
  );
}
