"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

interface TruncatedTooltipProps extends React.HTMLAttributes<HTMLParagraphElement> {
  text: string;
  lineClamp?: number;
  side?: "top" | "right" | "bottom" | "left";
}

export function TruncatedTooltip({ 
  text, 
  className, 
  lineClamp,
  side = "top",
  style,
  ...props 
}: TruncatedTooltipProps) {
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  const clampStyles: React.CSSProperties = lineClamp ? {
    display: '-webkit-box',
    WebkitLineClamp: lineClamp,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  } : {};

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const checkTruncation = () => {
        if (lineClamp) {
            // For multiline, we check if the scrollHeight is significantly larger than clientHeight
            // We add a small buffer (1px) to account for sub-pixel rendering differences
            setIsTruncated(element.scrollHeight > element.clientHeight + 1);
        } else {
            // For single line, check if scrollWidth is greater than clientWidth
            setIsTruncated(element.scrollWidth > element.clientWidth);
        }
    };

    const resizeObserver = new ResizeObserver(() => {
        checkTruncation();
    });

    resizeObserver.observe(element);
    
    // Initial check
    checkTruncation();

    return () => resizeObserver.disconnect();
  }, [text, lineClamp]);

  const content = (
    <p 
      ref={textRef}
      className={cn(
        "m-0", 
        !lineClamp && "truncate",
        className
      )}
      style={{ ...clampStyles, ...style }}
      {...props}
    >
      {text}
    </p>
  );

  return (
    <Tooltip delayDuration={300} open={isTruncated ? undefined : false}>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      {isTruncated && (
        <TooltipContent side={side} className="max-w-xs break-words whitespace-normal text-start">
            {text}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
