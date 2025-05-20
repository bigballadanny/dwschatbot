import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        warning:
          "border-transparent bg-amber-500 text-amber-50 hover:bg-amber-600",
        success:
          "border-transparent bg-green-500 text-green-50 hover:bg-green-600",
        info:
          "border-transparent bg-blue-500 text-blue-50 hover:bg-blue-600",
        processing:
          "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-100",
        pending:
          "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-100",
        completed:
          "border-transparent bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-100",
        canceled:
          "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300",
        tag:
          "bg-muted/40 hover:bg-muted/60 text-muted-foreground border-muted/20 hover:text-foreground transition-colors duration-200",
        statusPending:
          "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700/40",
        statusUnprocessed:
          "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700/40",
        statusProcessed:
          "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700/40",
        statusSummarized:
          "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700/40",
        statusFailed:
          "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700/40",
      },
      size: {
        default: "h-6",
        sm: "h-5 text-[10px] px-1.5",
        lg: "h-7 px-3 text-sm",
      },
      interactive: {
        true: "cursor-pointer hover:shadow-sm transition-all duration-200",
      },
      animation: {
        none: "",
        pulse: "animate-pulse",
        bounce: "animate-bounce",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
      animation: "none",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

function Badge({ className, variant, size, interactive, animation, icon, children, ...props }: BadgeProps) {
  return (
    <div 
      className={cn(badgeVariants({ variant, size, interactive, animation }), className)} 
      {...props}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }