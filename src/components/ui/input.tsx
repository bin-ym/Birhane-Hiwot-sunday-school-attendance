"use client";

import React from "react";
import { cn } from "@/lib/utils"; // helper for class merging

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input
      className={cn(
        "px-3 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:outline-none",
        className
      )}
      {...props}
    />
  );
};
