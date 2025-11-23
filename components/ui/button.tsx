// components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 btn-hover-effect",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover-lift shadow-medium",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover-lift shadow-medium",
        outline: "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent hover-lift",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover-lift shadow-medium",
        ghost: "hover:bg-accent hover:text-accent-foreground hover-lift",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 text-white hover:from-rose-600 hover:via-pink-600 hover:to-purple-600 hover-lift shadow-glow hover:shadow-glow-lg transform hover:scale-105",
        fashion: "bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-glow hover:shadow-glow-lg hover:from-rose-500 hover:to-pink-600 transform hover:scale-105 transition-all duration-300",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 rounded-2xl px-4 text-xs",
        lg: "h-11 rounded-2xl px-8 text-base",
        xl: "h-12 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }