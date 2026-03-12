import React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline: "border-2 border-border bg-transparent hover:border-primary/50 hover:bg-primary/5 text-foreground",
      ghost: "bg-transparent text-foreground hover:bg-secondary/50",
      destructive: "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25 hover:shadow-xl hover:shadow-destructive/30 hover:-translate-y-0.5",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm rounded-lg",
      md: "h-12 px-6 text-base rounded-xl font-medium",
      lg: "h-14 px-8 text-lg rounded-2xl font-semibold",
      icon: "h-12 w-12 flex items-center justify-center rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98]",
          variants[variant],
          sizes[size],
          (isLoading || disabled) && "opacity-50 cursor-not-allowed transform-none hover:transform-none hover:shadow-none",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export const Card = React.forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        "rounded-2xl border border-border/50 bg-card text-card-foreground shadow-xl shadow-black/5 overflow-hidden",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            "flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/10",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground mb-2 block", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";

export function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "success" | "warning" | "destructive" | "outline" }) {
  const variants = {
    default: "bg-primary/10 text-primary border border-primary/20",
    success: "bg-success/10 text-success border border-success/20",
    warning: "bg-warning/10 text-warning border border-warning/20",
    destructive: "bg-destructive/10 text-destructive border border-destructive/20",
    outline: "border border-border text-foreground",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)}>
      {children}
    </span>
  );
}
