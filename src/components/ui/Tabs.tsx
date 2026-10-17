"use client";

import { Tabs as HeroUITabs } from "@heroui/react";
import type { Key, ReactNode } from "react";
import { cn } from "@/lib/cn";

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

/** HeroUI tabs: arrow-key navigation and tablist/tab/tabpanel semantics from React Aria. */
export function Tabs({ tabs, defaultTab, activeTab, onTabChange, className }: TabsProps) {
  return (
    <HeroUITabs
      className={cn("w-full", className)}
      defaultSelectedKey={defaultTab ?? tabs[0]?.id}
      selectedKey={activeTab}
      onSelectionChange={(key: Key) => onTabChange?.(String(key))}
    >
      <HeroUITabs.ListContainer>
        <HeroUITabs.List aria-label="Sections" className="border-b border-border">
          {tabs.map((tab) => (
            <HeroUITabs.Tab key={tab.id} id={tab.id} className="px-4 py-2 text-sm font-medium text-muted data-[selected=true]:text-accent-text">
              {tab.label}
              <HeroUITabs.Indicator className="bg-accent" />
            </HeroUITabs.Tab>
          ))}
        </HeroUITabs.List>
      </HeroUITabs.ListContainer>
      {tabs.map((tab) => (
        <HeroUITabs.Panel key={tab.id} id={tab.id} className="pt-4">
          {tab.content}
        </HeroUITabs.Panel>
      ))}
    </HeroUITabs>
  );
}
