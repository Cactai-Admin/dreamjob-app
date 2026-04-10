import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "destructive" | "success" | "warning"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses = {
    default: "bg-accent/15 text-accent-dark border-transparent",
    secondary: "bg-utility text-foreground-muted border-transparent",
    outline: "bg-transparent text-foreground-muted border-border",
    destructive: "bg-destructive/15 text-destructive border-transparent",
    success: "bg-success/15 text-success border-transparent",
    warning: "bg-warning/15 text-warning border-transparent",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5",
        "text-xs font-medium",
        "transition-colors duration-fast ease-standard",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
