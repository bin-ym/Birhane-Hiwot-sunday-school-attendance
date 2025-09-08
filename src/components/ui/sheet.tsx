"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
    side?: "top" | "bottom" | "left" | "right";
  }
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPrimitive.Portal>
    <SheetPrimitive.Overlay className="fixed inset-0 bg-black/40 z-40" />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 flex flex-col bg-white p-6 shadow-xl transition ease-in-out",
        side === "right" && "inset-y-0 right-0 w-96",
        side === "left" && "inset-y-0 left-0 w-96",
        side === "top" && "inset-x-0 top-0 h-96",
        side === "bottom" && "inset-x-0 bottom-0 h-96",
        className
      )}
      {...props}
    >
      <SheetPrimitive.Close className="absolute right-4 top-4">
        <X className="h-5 w-5 text-gray-600 hover:text-black" />
      </SheetPrimitive.Close>
      {children}
    </SheetPrimitive.Content>
  </SheetPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ title, description }: { title: string; description?: string }) => (
  <div className="mb-4">
    <h2 className="text-lg font-semibold">{title}</h2>
    {description && <p className="text-sm text-gray-500">{description}</p>}
  </div>
);

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader };