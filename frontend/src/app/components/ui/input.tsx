import * as React from "react";

import { cn } from "./utils";

/** React onWheel is passive — trackpad scroll still changes type=number values without this. */
function useBlockWheelOnFocusedNumberInput(
  ref: React.RefObject<HTMLInputElement | null>,
  type?: string,
) {
  React.useEffect(() => {
    if (type !== "number") return;
    const el = ref.current;
    if (!el) return;

    const blockWheel = (e: WheelEvent) => {
      if (document.activeElement === el) {
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", blockWheel, { passive: false });
    return () => el.removeEventListener("wheel", blockWheel);
  }, [ref, type]);
}

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const ref = React.useRef<HTMLInputElement>(null);
  useBlockWheelOnFocusedNumberInput(ref, type);

  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "text-primary-foreground file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base bg-input-background transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
