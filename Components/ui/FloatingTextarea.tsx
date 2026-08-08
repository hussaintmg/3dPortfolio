"use client";

import {
  forwardRef,
  useId,
  useState,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { isRtlText } from "./FloatingInput";

export interface FloatingTextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  containerClassName?: string;
}

/**
 * Textarea with the label INSIDE the field:
 * - empty + unfocused → label sits on the FIRST LINE (not vertically centered)
 * - focused or has text → label floats to the very top, smaller
 * - Urdu/RTL labels anchor to the right
 */
const FloatingTextarea = forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
  (
    {
      label,
      error,
      containerClassName,
      className,
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      dir,
      rows = 5,
      id: idProp,
      ...rest
    },
    ref,
  ) => {
    const autoId = useId();
    const id = idProp || autoId;
    const [focused, setFocused] = useState(false);
    const [innerValue, setInnerValue] = useState(
      defaultValue != null ? String(defaultValue) : "",
    );

    const currentValue = value != null ? String(value) : innerValue;
    const floated = focused || currentValue.length > 0;
    const rtl = dir === "rtl" || (dir == null && isRtlText(label));

    return (
      <div className={cn("w-full", containerClassName)}>
        <div className="relative group">
          <textarea
            {...rest}
            id={id}
            ref={ref}
            rows={rows}
            dir={rtl ? "rtl" : "ltr"}
            value={value}
            defaultValue={value == null ? defaultValue : undefined}
            onChange={(e) => {
              if (value == null) setInnerValue(e.target.value);
              onChange?.(e);
            }}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            placeholder=" "
            className={cn(
              "peer w-full bg-white/5 border rounded-2xl text-white text-sm outline-none transition-all duration-200 resize-none custom-scrollbar",
              "pt-7 pb-3",
              rtl ? "pr-3.5 pl-4 text-right" : "pl-3.5 pr-4",
              error
                ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                : "border-white/10 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:bg-white/[0.07]",
              className,
            )}
          />

          <label
            htmlFor={id}
            className={cn(
              "absolute pointer-events-none select-none transition-all duration-200 ease-out",
              rtl ? "right-3.5" : "left-3.5",
              floated
                ? "top-2 text-[10px] font-bold uppercase tracking-widest"
                : "top-[26px] -translate-y-1/2 text-sm font-medium",
              "peer-autofill:top-2 peer-autofill:translate-y-0 peer-autofill:text-[10px] peer-autofill:font-bold peer-autofill:uppercase peer-autofill:tracking-widest",
              error
                ? "text-red-400"
                : floated
                  ? "text-accent"
                  : "text-gray-500 group-focus-within:text-accent",
            )}
          >
            {label}
          </label>
        </div>

        {error && (
          <p className="mt-1.5 ml-1 text-[11px] font-medium text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);

FloatingTextarea.displayName = "FloatingTextarea";
export default FloatingTextarea;
