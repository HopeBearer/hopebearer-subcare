"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

interface AutoScrollTextProps extends React.HTMLAttributes<HTMLDivElement> {
  text: string;
}

export function AutoScrollText({ 
  text, 
  className, 
  style,
  ...props 
}: AutoScrollTextProps) {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [duration, setDuration] = useState(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const checkOverflow = () => {
      // Force recalculation
      const containerWidth = container.clientWidth;
      const textWidth = textEl.scrollWidth;
      
      // Use a small threshold (1px) to avoid sub-pixel jitter
      const overflow = textWidth - containerWidth;
      
      if (overflow > 1) {
        setIsOverflowing(true);
        setOffset(overflow);
        // Duration: Base 2s + 1s per 20px of scrolling for readability
        setDuration(2 + (overflow / 20)); 
      } else {
        setIsOverflowing(false);
        setOffset(0);
      }
    };

    // Check immediately and after a short delay to allow for layout settlement
    checkOverflow();
    const timer = setTimeout(checkOverflow, 100);

    const resizeObserver = new ResizeObserver(() => {
        // Debounce slightly
        requestAnimationFrame(checkOverflow);
    });
    
    resizeObserver.observe(container);

    return () => {
        resizeObserver.disconnect();
        clearTimeout(timer);
    };
  }, [text]);

  return (
    <div 
      ref={containerRef}
      className={cn("overflow-hidden whitespace-nowrap w-full", className)}
      {...props}
    >
        <style jsx>{`
            @keyframes auto-scroll-animation {
                0%, 15% { transform: translateX(0); }
                85%, 100% { transform: translateX(calc(-1 * var(--scroll-offset))); }
            }
        `}</style>
      <div
        className="inline-block"
        style={{
          ...(isOverflowing ? {
            '--scroll-offset': `${offset}px`,
            animationName: 'auto-scroll-animation',
            animationDuration: `${duration}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            animationDelay: '1s'
          } as React.CSSProperties : {}),
        }}
      >
        <span ref={textRef}>{text}</span>
      </div>
    </div>
  );
}
