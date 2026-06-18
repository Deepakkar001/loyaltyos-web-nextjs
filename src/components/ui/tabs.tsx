"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import type React from "react";

import { cn } from "@/lib/utils";

export type TabsVariant = "default" | "underline";

export function Tabs({
  className,
  ...props
}: TabsPrimitive.Root.Props): React.ReactElement {
  return (
    <TabsPrimitive.Root
      className={cn(
        "flex flex-col gap-2 data-[orientation=vertical]:flex-row",
        className,
      )}
      data-slot="tabs"
      {...props}
    />
  );
}

export function TabsList({
  variant = "default",
  className,
  children,
  ...props
}: TabsPrimitive.List.Props & {
  variant?: TabsVariant;
}): React.ReactElement {
  return (
    <TabsPrimitive.List
      className={cn(
        "relative isolate flex w-fit items-center justify-center gap-x-0.5 text-muted-foreground",
        "data-[orientation=vertical]:flex-col",
        variant === "default"
          ? "rounded-full bg-[#EEF0FF] p-1 text-muted-foreground/70 dark:bg-[#1E1D3A] dark:text-white"
          : "data-[orientation=vertical]:px-1 data-[orientation=horizontal]:py-1 *:data-[slot=tabs-tab]:hover:bg-accent",
        className,
      )}
      data-slot="tabs-list"
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator
        className={cn(
          "pointer-events-none absolute left-[var(--active-tab-left)] top-[var(--active-tab-top)] z-0 h-[var(--active-tab-height)] w-[var(--active-tab-width)] transition-[left,top,width,height] duration-200 ease-in-out",
          variant === "underline"
            ? "bg-primary data-[orientation=horizontal]:h-0.5 data-[orientation=vertical]:w-0.5"
            : "rounded-full bg-[#5B4FE8] shadow-[0_1px_3px_rgba(91,79,232,0.35)]",
        )}
        data-slot="tab-indicator"
      />
    </TabsPrimitive.List>
  );
}

export function TabsTab({
  className,
  ...props
}: TabsPrimitive.Tab.Props): React.ReactElement {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "relative z-[1] flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-transparent px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[disabled]:pointer-events-none data-[orientation=vertical]:w-full data-[orientation=vertical]:justify-start data-[active]:text-white data-[disabled]:opacity-[0.64] [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-slot="tabs-tab"
      {...props}
    />
  );
}

export function TabsPanel({
  className,
  ...props
}: TabsPrimitive.Panel.Props): React.ReactElement {
  return (
    <TabsPrimitive.Panel
      className={cn("flex-1 text-sm outline-none", className)}
      data-slot="tabs-content"
      {...props}
    />
  );
}

export {
  TabsPrimitive,
  TabsTab as TabsTrigger,
  TabsPanel as TabsContent,
};
