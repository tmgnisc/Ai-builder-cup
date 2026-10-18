"use client";

import { useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Heart,
  HelpCircle,
  Info,
  Minus,
  Moon,
  Plus,
  RefreshCw,
  Share2,
  ShoppingBag,
  Sun,
  Trash2,
} from "lucide-react";
import { usePrefs } from "@/store/usePrefs";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Card, CardContent, CardFooter, CardHeader } from "./Card";
import { Chip } from "./Chip";
import { Drawer } from "./Drawer";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { IconButton } from "./IconButton";
import { Input } from "./Input";
import { Modal } from "./Modal";
import { Popover } from "./Popover";
import { Price } from "./Price";
import { ScrambleText } from "./ScrambleText";
import { Select } from "./Select";
import { Skeleton } from "./Skeleton";
import { StatRow } from "./StatRow";
import { Textarea } from "./Textarea";
import { Ticker } from "./Ticker";
import { Tooltip } from "./Tooltip";

export function PrimitivesShowcase() {
  const { theme, toggleTheme } = usePrefs();
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tickerValue, setTickerValue] = useState(149999);
  const [scrambleKey, setScrambleKey] = useState(0);
  const [chipSelected, setChipSelected] = useState(true);
  const [chipRemoved, setChipRemoved] = useState(false);
  const [viewMode, setViewMode] = useState<"active" | "both">("active");

  const content = (forcedTheme?: "light" | "dark") => (
    <div
      data-theme={forcedTheme ?? theme}
      className="rounded-2xl border border-border bg-bg p-6 text-text transition-colors duration-200"
    >
      {forcedTheme && (
        <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Theme Preview: <strong className="text-text">{forcedTheme}</strong>
          </span>
          <Badge tone={forcedTheme === "dark" ? "neutral" : "accent"}>
            {forcedTheme.toUpperCase()}
          </Badge>
        </div>
      )}

      {/* 1. Buttons */}
      <section className="mb-12">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">Buttons</h2>
          <p className="text-xs text-muted">Variants, sizes, states, and focus rings</p>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="font-mono text-xs text-muted">Variants (md)</span>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-mono text-xs text-muted">Sizes (Primary)</span>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="sm">Small (sm)</Button>
              <Button variant="primary" size="md">Medium (md)</Button>
              <Button variant="primary" size="lg">Large (lg)</Button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-mono text-xs text-muted">States</span>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" loading>Loading...</Button>
              <Button variant="secondary" loading>Saving...</Button>
              <Button variant="primary" disabled>Disabled Primary</Button>
              <Button variant="secondary" disabled>Disabled Secondary</Button>
              <Button variant="ghost" disabled>Disabled Ghost</Button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-mono text-xs text-muted">With Icons</span>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">
                <ShoppingBag className="size-4" /> Add to Cart
              </Button>
              <Button variant="secondary">
                Next Step <ArrowRight className="size-4" />
              </Button>
              <Button variant="danger" size="sm">
                <Trash2 className="size-3.5" /> Remove
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Icon Buttons */}
      <section className="mb-12">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">Icon Buttons</h2>
          <p className="text-xs text-muted">Accessible with aria-label & visible focus ring</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <IconButton variant="primary" size="sm" aria-label="Favorite product">
            <Heart className="size-4" />
          </IconButton>
          <IconButton variant="primary" size="md" aria-label="Favorite product">
            <Heart className="size-5" />
          </IconButton>
          <IconButton variant="secondary" size="sm" aria-label="Share product">
            <Share2 className="size-4" />
          </IconButton>
          <IconButton variant="secondary" size="md" aria-label="Share product">
            <Share2 className="size-5" />
          </IconButton>
          <IconButton variant="ghost" size="sm" aria-label="Info">
            <Info className="size-4" />
          </IconButton>
          <IconButton variant="ghost" size="md" aria-label="Info">
            <Info className="size-5" />
          </IconButton>
          <IconButton variant="secondary" size="md" disabled aria-label="Disabled action">
            <Trash2 className="size-5" />
          </IconButton>
        </div>
      </section>

      {/* 3. Badges & Chips */}
      <section className="mb-12">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">Badges & Chips</h2>
          <p className="text-xs text-muted">Status indicators and interactive filtering pills</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="font-mono text-xs text-muted">Badge Tones & Dots</span>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">Neutral</Badge>
              <Badge tone="accent" dot>Accent Dot</Badge>
              <Badge tone="success" dot>In Stock (Success)</Badge>
              <Badge tone="warning" dot>Low Stock (Warning)</Badge>
              <Badge tone="danger" dot>Out of Stock (Danger)</Badge>
              <Badge tone="accent">Default Accent</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-mono text-xs text-muted">Interactive Chips</span>
            <div className="flex flex-wrap items-center gap-2">
              <Chip
                active={chipSelected}
                onClick={() => setChipSelected(!chipSelected)}
              >
                Toggle Selection: {chipSelected ? "Active" : "Inactive"}
              </Chip>
              <Chip active>
                Accent Active
              </Chip>
              {!chipRemoved ? (
                <Chip onRemove={() => setChipRemoved(true)}>
                  Removable Filter (Click ×)
                </Chip>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setChipRemoved(false)}>
                  Restore Filter Chip
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Form Controls */}
      <section className="mb-12">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">Form Controls</h2>
          <p className="text-xs text-muted">Input, Textarea, Select with validation states</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-3">
            <span className="font-mono text-xs text-muted">Inputs</span>
            <Input placeholder="Standard placeholder..." />
            <Input defaultValue="Pre-filled value" />
            <Input placeholder="Disabled input" disabled />
            <Input defaultValue="Invalid postal code" error="Must be a valid 5-digit postal code" />
          </div>

          <div className="space-y-3">
            <span className="font-mono text-xs text-muted">Selects</span>
            <Select defaultValue="express">
              <option value="express">Express Delivery</option>
              <option value="standard">Standard Shipping</option>
              <option value="priority">Priority Freight</option>
            </Select>
            <Select disabled defaultValue="disabled">
              <option value="disabled">Disabled Select</option>
            </Select>
            <Select defaultValue="" error="Please choose a delivery method">
              <option value="">Select method...</option>
              <option value="1">Ground Transport</option>
              <option value="2">Air Courier</option>
            </Select>
          </div>

          <div className="space-y-3">
            <span className="font-mono text-xs text-muted">Textarea</span>
            <Textarea rows={3} placeholder="Add order instructions..." />
            <Textarea rows={2} defaultValue="Special handling requested." disabled />
            <Textarea rows={2} defaultValue="Bad text" error="Exceeds maximum character limit" />
          </div>
        </div>
      </section>

      {/* 5. Cards & Stat Rows */}
      <section className="mb-12">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">Cards & Stat Rows</h2>
          <p className="text-xs text-muted">Surface hierarchy and structured key-value rows</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Standard Card</h3>
                <Badge tone="accent">Card Badge</Badge>
              </div>
              <p className="text-xs text-muted">Structured header with surface separation</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <StatRow label="Processor" value="Apple M3 (8-core)" />
                <StatRow label="RAM" value="16 GB Unified" />
                <StatRow label="Battery" value="Up to 18 hours" hint="Tested via web browsing" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <span className="text-xs text-muted">Verified specification</span>
              <Button size="sm" variant="secondary">View Details</Button>
            </CardFooter>
          </Card>

          <Card interactive>
            <CardHeader>
              <h3 className="font-semibold text-sm">Interactive Hover Card</h3>
              <p className="text-xs text-muted">Card with hover translation and hairline border</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted">
                Cards marked with <code className="font-mono text-xs">interactive</code> scale slightly and elevate their border on hover, ideal for product cards and grid items.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="primary" className="w-full">
                Interactive Action <ChevronRight className="size-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* 6. Price & Numeric Formatting */}
      <section className="mb-12">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">Price & Typography</h2>
          <p className="text-xs text-muted">NPR localized currency and animated counters</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
            <span className="font-mono text-xs text-muted">Price Scale</span>
            <div className="flex flex-wrap items-baseline gap-4">
              <Price amount={4999} size="sm" />
              <Price amount={45000} size="md" />
              <Price amount={149999} size="lg" />
              <Price amount={325000} size="xl" />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted">Live Numeric Ticker</span>
              <div className="flex gap-1">
                <IconButton
                  size="sm"
                  variant="secondary"
                  aria-label="Decrease amount"
                  onClick={() => setTickerValue((v) => Math.max(0, v - 5000))}
                >
                  <Minus className="size-3.5" />
                </IconButton>
                <IconButton
                  size="sm"
                  variant="secondary"
                  aria-label="Increase amount"
                  onClick={() => setTickerValue((v) => v + 5000)}
                >
                  <Plus className="size-3.5" />
                </IconButton>
              </div>
            </div>
            <div className="font-mono text-2xl font-bold tracking-tight text-text">
              NPR <Ticker value={tickerValue} />
            </div>
          </div>
        </div>
      </section>

      {/* 7. Skeletons & Feedback States */}
      <section className="mb-12">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">Feedback & Loading States</h2>
          <p className="text-xs text-muted">Empty, error, and pulsing skeleton placeholders</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
            <span className="font-mono text-xs text-muted">Pulsing Skeletons</span>
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
              <div className="flex items-center gap-3 pt-2">
                <Skeleton className="size-10 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-4/5 rounded" />
                </div>
              </div>
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <span className="font-mono text-xs text-muted mb-2 block">Empty State</span>
            <EmptyState
              title="Cart is empty"
              description="Explore the catalog to add items."
              action={
                <Button size="sm" variant="secondary">
                  Browse Catalog
                </Button>
              }
            />
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <span className="font-mono text-xs text-muted mb-2 block">Error State</span>
            <ErrorState
              title="Catalog unavailable"
              message="Could not reach backend service."
              onRetry={() => alert("Retry clicked")}
            />
          </div>
        </div>
      </section>

      {/* 8. Overlays & Dialogs */}
      <section className="mb-12">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">Overlays & Dialogs</h2>
          <p className="text-xs text-muted">Modals, Drawers, Popovers, and Tooltips</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Open Accessible Modal
          </Button>

          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
            Open Side Drawer
          </Button>

          <Popover
            trigger={<Button variant="ghost">Toggle Popover</Button>}
            content={
              <div className="p-4 space-y-2 max-w-xs">
                <p className="font-medium text-sm">Popover Content</p>
                <p className="text-xs text-muted">
                  Positions itself relative to anchor and dismisses on outside clicks.
                </p>
              </div>
            }
          />

          <Tooltip content="Tooltip helper text on hover or focus">
            <Button variant="ghost">
              <HelpCircle className="size-4" /> Hover for Tooltip
            </Button>
          </Tooltip>
        </div>

        {/* Modal Instance */}
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title="Component Kit Modal"
          description="Focus-trapped, ESC-dismissible dialog following WAI-ARIA modal specifications."
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Confirm Action
              </Button>
            </>
          }
        >
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted">
              This modal locks background scroll, traps keyboard Tab focus, restores previous focus on unmount, and attaches accessible ARIA attributes.
            </p>
            <Input placeholder="Interactive input inside modal..." />
          </div>
        </Modal>

        {/* Drawer Instance */}
        <Drawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title="UI Kit Drawer"
          description="Sliding side drawer with backdrop"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 p-4">
            <p className="text-sm text-muted">
              Drawers slide smoothly from the right with backdrop overlay and touch-friendly layout.
            </p>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="font-medium text-sm">Drawer Item</div>
                <div className="text-xs text-muted">Demonstrates nested components inside drawer container.</div>
              </CardContent>
            </Card>
          </div>
        </Drawer>
      </section>

      {/* 9. Motion & Micro-interactions */}
      <section>
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">Motion & Micro-interactions</h2>
          <p className="text-xs text-muted">Scramble text decoder effect</p>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
          <div className="font-mono text-sm tracking-widest text-accent">
            <ScrambleText
              key={scrambleKey}
              text="PIP IS CURATING STORE RECOMMENDATIONS"
            />
          </div>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Re-scramble text"
            onClick={() => setScrambleKey((k) => k + 1)}
          >
            <RefreshCw className="size-4" />
          </IconButton>
        </div>
      </section>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">UI Primitives Kit</h1>
          <p className="text-sm text-muted mt-1">
            Complete design system gallery demonstrating every primitive in all states and themes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setViewMode("active")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "active" ? "bg-accent text-accent-text" : "text-muted hover:text-text"
              }`}
            >
              Single View ({theme})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("both")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "both" ? "bg-accent text-accent-text" : "text-muted hover:text-text"
              }`}
            >
              Side-by-Side (Dark & Light)
            </button>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={toggleTheme}
            aria-label={`Toggle to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span>Theme: {theme}</span>
          </Button>
        </div>
      </div>

      {viewMode === "active" ? (
        content()
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {content("dark")}
          {content("light")}
        </div>
      )}
    </div>
  );
}
