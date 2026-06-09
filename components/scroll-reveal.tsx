"use client";

import { useEffect, useRef, useState } from "react";

type ScrollRevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: 1 | 2 | 3 | 4 | 5;
  threshold?: number;
};

export function ScrollReveal({
  children,
  className = "",
  delay,
  threshold = 0.12,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  const delayClass = delay ? `reveal-delay-${delay}` : "";

  return (
    <div
      ref={ref}
      className={`reveal ${delayClass} ${isVisible ? "is-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
