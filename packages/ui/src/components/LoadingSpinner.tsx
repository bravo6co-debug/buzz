import * as React from "react"
import { Loader2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const spinnerVariants = cva(
  "animate-spin",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        default: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
      color: {
        default: "text-foreground",
        primary: "text-primary",
        secondary: "text-secondary",
        muted: "text-muted-foreground",
      },
    },
    defaultVariants: {
      size: "default",
      color: "default",
    },
  }
)

export interface LoadingSpinnerProps
  extends VariantProps<typeof spinnerVariants> {
  className?: string
  text?: string
  centered?: boolean
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, color, text, centered = false, ...props }, ref) => {
    const spinner = (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2",
          centered && "justify-center",
          className
        )}
        {...props}
      >
        <Loader2 className={cn(spinnerVariants({ size, color }))} />
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    )

    if (centered) {
      return (
        <div className="flex items-center justify-center min-h-32">
          {spinner}
        </div>
      )
    }

    return spinner
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

export { LoadingSpinner, spinnerVariants }