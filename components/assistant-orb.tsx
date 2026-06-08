"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

type AssistantOrbProps = {
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "h-10 w-10",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

export function AssistantOrb({ size = "lg" }: AssistantOrbProps) {
  const root = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      gsap.to(".orb-core", {
        y: -8,
        rotate: 8,
        duration: 3.8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(".orb-glow", {
        opacity: 0.8,
        scale: 1.12,
        duration: 2.8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative grid place-items-center">
      <div className="orb-glow absolute h-[145%] w-[145%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.2),rgba(203,188,255,0.06)_36%,transparent_70%)] blur-xl" />
      <div
        className={`orb-core orb-shadow relative overflow-hidden rounded-full ${sizeClass[size]} bg-[radial-gradient(circle_at_34%_26%,#ffffff_0%,#d6d5db_9%,#656774_28%,#070811_62%,#000000_100%)]`}
      >
        <span className="absolute -left-4 top-2 h-10 w-16 rotate-[-28deg] rounded-full bg-white/45 blur-lg" />
        <span className="absolute bottom-3 right-2 h-10 w-14 rotate-[-28deg] rounded-full bg-[#cbbcff]/18 blur-md" />
        <span className="absolute inset-x-4 bottom-5 h-6 rounded-full bg-black/50 blur-sm" />
      </div>
    </div>
  );
}
