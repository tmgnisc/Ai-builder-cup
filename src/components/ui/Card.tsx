import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends ComponentProps<"div"> {
  variant?: "default" | "surface-2" | "glass";
  interactive?: boolean;
}

const VARIANTS = {
  default: "bg-surface hairline",
  "surface-2": "bg-surface-2 hairline",
  glass: "glass",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = "default", interactive = false, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-card transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-expo)]",
        VARIANTS[variant],
        interactive && "hover:-translate-y-1 hover:shadow-card cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5 pb-3", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5 pt-3 border-t border-border flex items-center gap-3", className)} {...props} />;
}
