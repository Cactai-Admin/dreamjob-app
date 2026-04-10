"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive"
  size?: "sm" | "default" | "lg" | "icon"
  loading?: boolean
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      loading = false,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"

    const variantClasses = {
      default:
        "bg-accent text-white hover:bg-accent-dark active:bg-accent-darker shadow-sm",
      secondary:
        "bg-object text-foreground hover:bg-utility border border-border",
      outline:
        "border border-border bg-transparent text-foreground hover:bg-object",
      ghost:
        "bg-transparent text-foreground hover:bg-object",
      destructive:
        "bg-destructive text-white hover:opacity-90 active:opacity-80 shadow-sm",
    }

    const sizeClasses = {
      sm: "h-8 px-3 text-sm rounded-[var(--radius-sm)] gap-1.5",
      default: "h-10 px-4 text-sm rounded-[var(--radius-md)] gap-2",
      lg: "h-12 px-6 text-base rounded-[var(--radius-md)] gap-2.5",
      icon: "h-10 w-10 rounded-[var(--radius-md)]",
    }

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center font-medium",
          "transition-all duration-fast ease-standard",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:opacity-50 disabled:pointer-events-none",
          "select-none cursor-pointer",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        )}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button }
