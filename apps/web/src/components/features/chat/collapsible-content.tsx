'use client';

import { ReactNode } from 'react';

// Collapsible content wrapper - uses CSS grid for smooth transition
interface CollapsibleContentProps {
  isOpen: boolean;
  children: ReactNode;
}

export function CollapsibleContent({ isOpen, children }: CollapsibleContentProps) {
  return (
    <div 
      className="grid transition-all duration-300 ease-in-out"
      style={{ 
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        opacity: isOpen ? 1 : 0
      }}
    >
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  );
}
