"use client";

import {
  forwardRef,
  useId,
  useState,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

/** Detects Urdu/Arabic script so the label anchors to the right side. */
export const isRtlText = (text: string) =>
  /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(text);

export interface FloatingInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Optional leading icon (rendered on the label side). */
  icon?: ReactNode;
  error?: string;
  containerClassName?: string;
}

/**
 * Input with the label INSIDE the field:
 * - empty + unfocused → label sits vertically centered, 14px from the edge
 *   (left for LTR, right for Urdu/RTL labels)
 * - focused or has text → label floats to the top with a smooth transition
 * - browser autofill is covered via the CSS :autofill variant
 */
const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  (
    {
      label,
      icon,
      error,
      containerClassName,
      className,
      type = "text",
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      dir,
      id: idProp,
      ...rest
    },
    ref,
  ) => {
    const autoId = useId();
    const id = idProp || autoId;
    const isPassword = type === "password";
    const [showPassword, setShowPassword] = useState(false);
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
          <input
            {...rest}
            id={id}
            ref={ref}
            dir={rtl ? "rtl" : "ltr"}
            type={isPassword ? (showPassword ? "text" : "password") : type}
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
              "peer w-full bg-white/5 border rounded-2xl text-white text-sm outline-none transition-all duration-200",
              "pt-6 pb-2",
              rtl ? "pr-3.5 pl-4 text-right" : "pl-3.5 pr-4",
              isPassword && (rtl ? "pl-12" : "pr-12"),
              icon && (rtl ? "pl-11" : "pr-11"),
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
                ? "top-2 translate-y-0 text-[10px] font-bold uppercase tracking-widest"
                : "top-1/2 -translate-y-1/2 text-sm font-medium",
              // Browser autofill fills the field without firing onChange — force float
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

          {/* Optional trailing icon (opposite side of the label) */}
          {icon && !isPassword && (
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-accent pointer-events-none",
                rtl ? "left-4" : "right-4",
              )}
            >
              {icon}
            </div>
          )}

          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((s) => !s)}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer",
                rtl ? "left-4" : "right-4",
              )}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
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

FloatingInput.displayName = "FloatingInput";
export default FloatingInput;
