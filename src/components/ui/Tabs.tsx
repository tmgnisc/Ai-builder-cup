"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { focusRing } from "./focusRing";

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({
  tabs,
  defaultTab,
  activeTab: controlledTab,
  onTabChange,
  className,
}: TabsProps) {
  const [uncontrolledTab, setUncontrolledTab] = useState(defaultTab || tabs[0]?.id);
  const isControlled = controlledTab !== undefined;
  const currentTab = isControlled ? controlledTab : uncontrolledTab;
  const baseId = useId();

  const handleSelect = (tabId: string) => {
    if (!isControlled) setUncontrolledTab(tabId);
    onTabChange?.(tabId);
  };

  const activeItem = tabs.find((t) => t.id === currentTab) || tabs[0];

  return (
    <div className={cn("w-full", className)}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center gap-1 border-b border-border pb-px"
      >
        {tabs.map((tab) => {
          const selected = tab.id === currentTab;
          const tabId = `${baseId}-tab-${tab.id}`;
          const panelId = `${baseId}-panel-${tab.id}`;

          return (
            <button
              key={tab.id}
              role="tab"
              id={tabId}
              aria-controls={panelId}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => handleSelect(tab.id)}
              className={cn(
                "relative px-4 py-2 text-sm font-medium transition-colors duration-150",
                focusRing,
                selected
                  ? "text-accent-text after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent"
                  : "text-muted hover:text-text",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeItem && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.id}`}
          aria-labelledby={`${baseId}-tab-${activeItem.id}`}
          className="pt-4 focus:outline-none"
          tabIndex={0}
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
}
