
import * as React from "react"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number
  }
>(({ className, value, style, ...props }, ref) => {
  // Extract any CSS variables from style prop
  const cssVars = style as React.CSSProperties;
  
  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      style={cssVars}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ 
          transform: `translateX(-${100 - (value || 0)}%)`,
          backgroundColor: cssVars?.['--progress-indicator-color'] as string || undefined
        }}
      />
    </div>
  );
})
Progress.displayName = "Progress"

export { Progress }
