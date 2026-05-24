'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delay={250}>{children}</TooltipProvider>
    </ThemeProvider>
  );
}
