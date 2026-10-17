"use client";

import React, { useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Chip,
  Drawer,
  Dropdown,
  Input,
  ListBox,
  Modal,
  Popover,
  ScrollShadow,
  Select,
  Skeleton,
  Slider,
  Switch,
  Table,
  Tabs,
  Toast,
  Tooltip,
} from "@heroui/react";

export default function HeroUIPlaygroundPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  };

  return (
    <div className="min-h-screen bg-bg text-text p-8 space-y-10">
      {/* Header & Theme Control */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">HeroUI v3 Primitive Spike</h1>
          <p className="text-sm text-muted">
            Testing all 21 primitives in Persona design system context (React 19, Tailwind v4).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">Active Theme: {theme}</span>
          <Button variant="outline" size="sm" onPress={toggleTheme}>
            Toggle Theme ({theme === "dark" ? "Light" : "Dark"})
          </Button>
        </div>
      </div>

      {/* Grid of Primitives */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Button */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">1. Button</Card.Title>
            <Card.Description className="text-xs text-muted">Solid, outline, ghost variants</Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-wrap gap-2">
            <Button size="sm">Primary</Button>
            <Button variant="outline" size="sm">Outline</Button>
            <Button variant="ghost" size="sm">Ghost</Button>
            <Button isDisabled size="sm">Disabled</Button>
          </Card.Content>
        </Card>

        {/* 2. Input */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">2. Input</Card.Title>
            <Card.Description className="text-xs text-muted">Search and standard input</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-2">
            <Input aria-label="Search" placeholder="Search catalog..." />
          </Card.Content>
        </Card>

        {/* 3. Select */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">3. Select</Card.Title>
            <Card.Description className="text-xs text-muted">Category dropdown selector</Card.Description>
          </Card.Header>
          <Card.Content>
            <Select defaultSelectedKey="laptops" aria-label="Product Category">
              <Select.Trigger className="w-full">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="laptops">Laptops (11)</ListBox.Item>
                  <ListBox.Item id="phones">Phones (8)</ListBox.Item>
                  <ListBox.Item id="headphones">Headphones (7)</ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </Card.Content>
        </Card>

        {/* 4. Checkbox */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">4. Checkbox</Card.Title>
            <Card.Description className="text-xs text-muted">Filters and options</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-2">
            <Checkbox defaultSelected>In Stock Only</Checkbox>
            <Checkbox>Manufacturer Warranty</Checkbox>
          </Card.Content>
        </Card>

        {/* 5. Switch */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">5. Switch</Card.Title>
            <Card.Description className="text-xs text-muted">Compare differences toggle</Card.Description>
          </Card.Header>
          <Card.Content>
            <Switch defaultSelected>Show differences only</Switch>
          </Card.Content>
        </Card>

        {/* 6. Slider */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">6. Slider</Card.Title>
            <Card.Description className="text-xs text-muted">Price range filtering</Card.Description>
          </Card.Header>
          <Card.Content>
            <Slider aria-label="Price range" defaultValue={89000} minValue={10000} maxValue={300000}>
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
          </Card.Content>
        </Card>

        {/* 7. Chip */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">7. Chip</Card.Title>
            <Card.Description className="text-xs text-muted">Status badges and tags</Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-wrap gap-2">
            <Chip size="sm" color="success">In Stock (4)</Chip>
            <Chip size="sm" color="warning">Low Stock (2)</Chip>
            <Chip size="sm" variant="soft">M4 Pro</Chip>
          </Card.Content>
        </Card>

        {/* 8. Badge */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">8. Badge</Card.Title>
            <Card.Description className="text-xs text-muted">Cart count badge</Card.Description>
          </Card.Header>
          <Card.Content className="flex items-center gap-4">
            <Badge.Anchor>
              <Button variant="outline" size="sm">Cart</Button>
              <Badge color="danger">3</Badge>
            </Badge.Anchor>
            <Badge.Anchor>
              <Button variant="ghost" size="sm">Compare</Button>
              <Badge color="accent">2</Badge>
            </Badge.Anchor>
          </Card.Content>
        </Card>

        {/* 9. Card */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">9. Card</Card.Title>
            <Card.Description className="text-xs text-muted">Container with hairline border</Card.Description>
          </Card.Header>
          <Card.Content className="text-xs text-muted">
            Product or spec card with 1px border and token background.
          </Card.Content>
          <Card.Footer className="flex justify-between items-center text-xs">
            <span>NPR 2,85,000</span>
            <Button size="sm">View</Button>
          </Card.Footer>
        </Card>

        {/* 10. Table */}
        <Card className="p-4 space-y-3 bg-surface border border-border col-span-1 md:col-span-2">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">10. Table</Card.Title>
            <Card.Description className="text-xs text-muted">Compare specification table</Card.Description>
          </Card.Header>
          <Card.Content>
            <Table aria-label="Spec comparison">
              <Table.ScrollContainer>
                <Table.Content>
                  <Table.Header>
                    <Table.Column isRowHeader>Specification</Table.Column>
                    <Table.Column>MacBook Pro 14</Table.Column>
                    <Table.Column>IdeaPad Slim 5</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    <Table.Row>
                      <Table.Cell>Processor</Table.Cell>
                      <Table.Cell>Apple M4 Pro</Table.Cell>
                      <Table.Cell>AMD Ryzen 7</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Battery Life</Table.Cell>
                      <Table.Cell>22 hours</Table.Cell>
                      <Table.Cell>11 hours</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Price (NPR)</Table.Cell>
                      <Table.Cell>2,85,000</Table.Cell>
                      <Table.Cell>89,000 (Best Value)</Table.Cell>
                    </Table.Row>
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </Card.Content>
        </Card>

        {/* 11. Tabs */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">11. Tabs</Card.Title>
            <Card.Description className="text-xs text-muted">Category or spec switcher</Card.Description>
          </Card.Header>
          <Card.Content>
            <Tabs aria-label="Product Specs">
              <Tabs.List>
                <Tabs.Tab id="perf">Performance</Tabs.Tab>
                <Tabs.Tab id="batt">Battery</Tabs.Tab>
                <Tabs.Tab id="disp">Display</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel id="perf" className="pt-2 text-xs text-muted">
                12-core CPU, 16-core GPU, 24GB Unified RAM.
              </Tabs.Panel>
              <Tabs.Panel id="batt" className="pt-2 text-xs text-muted">
                70Wh battery with 22-hour endurance.
              </Tabs.Panel>
              <Tabs.Panel id="disp" className="pt-2 text-xs text-muted">
                14.2-inch Liquid Retina XDR, 1600 nits peak.
              </Tabs.Panel>
            </Tabs>
          </Card.Content>
        </Card>

        {/* 12. Tooltip */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">12. Tooltip</Card.Title>
            <Card.Description className="text-xs text-muted">Contextual helper</Card.Description>
          </Card.Header>
          <Card.Content className="flex items-center gap-3">
            <Tooltip.Root>
              <Tooltip.Trigger>
                <Button variant="outline" size="sm">Hover for spec info</Button>
              </Tooltip.Trigger>
              <Tooltip.Content className="p-2 text-xs bg-surface-2 border border-border rounded">
                Verified against official hardware specifications.
              </Tooltip.Content>
            </Tooltip.Root>
          </Card.Content>
        </Card>

        {/* 13. Popover */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">13. Popover</Card.Title>
            <Card.Description className="text-xs text-muted">Floating filter popover</Card.Description>
          </Card.Header>
          <Card.Content>
            <Popover.Root>
              <Popover.Trigger>
                <Button variant="outline" size="sm">Open Filter Popover</Button>
              </Popover.Trigger>
              <Popover.Content className="p-3 bg-surface border border-border rounded space-y-2">
                <Popover.Dialog>
                  <p className="text-xs font-semibold">Filter Specifications</p>
                  <p className="text-xs text-muted">Toggle hardware constraints.</p>
                </Popover.Dialog>
              </Popover.Content>
            </Popover.Root>
          </Card.Content>
        </Card>

        {/* 14. Modal */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">14. Modal</Card.Title>
            <Card.Description className="text-xs text-muted">Confirmation dialog</Card.Description>
          </Card.Header>
          <Card.Content>
            <Modal.Root isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
              <Modal.Trigger>
                <Button size="sm">Open Confirmation Modal</Button>
              </Modal.Trigger>
              <Modal.Backdrop className="fixed inset-0 bg-black/50 z-modal" />
              <Modal.Container className="fixed inset-0 flex items-center justify-center z-modal">
                <Modal.Dialog className="bg-surface border border-border p-6 rounded-lg max-w-sm w-full space-y-4">
                  <Modal.Header>
                    <Modal.Heading className="text-base font-semibold">Confirm Kathmandu Delivery</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="text-xs text-muted">
                    Delivery estimate: 1–2 business days. In-stock units are verified.
                  </Modal.Body>
                  <Modal.Footer className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onPress={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button size="sm" onPress={() => setIsModalOpen(false)}>Confirm</Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Root>
          </Card.Content>
        </Card>

        {/* 15. Drawer */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">15. Drawer</Card.Title>
            <Card.Description className="text-xs text-muted">Slide-over cart or filters</Card.Description>
          </Card.Header>
          <Card.Content>
            <Drawer.Root isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <Drawer.Trigger>
                <Button variant="outline" size="sm">Open Cart Drawer</Button>
              </Drawer.Trigger>
              <Drawer.Backdrop className="fixed inset-0 bg-black/50 z-drawer" />
              <Drawer.Content className="fixed right-0 top-0 bottom-0 w-80 bg-surface border-l border-border p-6 z-drawer">
                <Drawer.Dialog className="space-y-4">
                  <Drawer.Header className="flex justify-between items-center">
                    <Drawer.Heading className="text-base font-semibold">Shopping Cart (1)</Drawer.Heading>
                    <Drawer.CloseTrigger>
                      <Button variant="ghost" size="sm" onPress={() => setIsDrawerOpen(false)}>✕</Button>
                    </Drawer.CloseTrigger>
                  </Drawer.Header>
                  <Drawer.Body className="text-xs text-muted">
                    MacBook Pro 14&quot; M4 Pro · NPR 2,85,000
                  </Drawer.Body>
                  <Drawer.Footer>
                    <Button fullWidth size="sm" onPress={() => setIsDrawerOpen(false)}>Checkout</Button>
                  </Drawer.Footer>
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Root>
          </Card.Content>
        </Card>

        {/* 16. Toast */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">16. Toast</Card.Title>
            <Card.Description className="text-xs text-muted">Cart mutation confirmation</Card.Description>
          </Card.Header>
          <Card.Content>
            <Toast.Provider />
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                Toast.toast("Item added to cart", {
                  description: 'MacBook Pro 14" M4 Pro (Verified stock: 4 units)',
                });
              }}
            >
              Trigger Inventory Toast
            </Button>
          </Card.Content>
        </Card>

        {/* 17. Alert */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">17. Alert</Card.Title>
            <Card.Description className="text-xs text-muted">Informational banner</Card.Description>
          </Card.Header>
          <Card.Content>
            <Alert status="accent" className="p-3 text-xs border border-border rounded">
              <Alert.Title className="font-semibold">Kathmandu Stock Grounded</Alert.Title>
              <Alert.Description className="text-muted">
                Prices in NPR include all local taxes. Free delivery inside Valley.
              </Alert.Description>
            </Alert>
          </Card.Content>
        </Card>

        {/* 18. Skeleton */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">18. Skeleton</Card.Title>
            <Card.Description className="text-xs text-muted">Loading placeholders</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-2">
            <Skeleton className="w-full h-4 rounded" />
            <Skeleton className="w-3/4 h-4 rounded" />
            <Skeleton className="w-1/2 h-8 rounded" />
          </Card.Content>
        </Card>

        {/* 19. ScrollShadow */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">19. ScrollShadow</Card.Title>
            <Card.Description className="text-xs text-muted">Scrollable container with fade shadows</Card.Description>
          </Card.Header>
          <Card.Content>
            <ScrollShadow className="h-24 overflow-y-auto space-y-1 text-xs text-muted p-1">
              <p>Apple M4 Pro (12 CPU, 16 GPU)</p>
              <p>24 GB Unified Memory</p>
              <p>512 GB NVMe SSD Storage</p>
              <p>14.2&quot; Liquid Retina XDR Display</p>
              <p>70 Wh Lithium-Polymer Battery</p>
              <p>Wi-Fi 6E + Bluetooth 5.3</p>
              <p>3x Thunderbolt 5 / USB 4 ports</p>
            </ScrollShadow>
          </Card.Content>
        </Card>

        {/* 20. Avatar */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">20. Avatar</Card.Title>
            <Card.Description className="text-xs text-muted">User profile & agent avatar</Card.Description>
          </Card.Header>
          <Card.Content className="flex items-center gap-3">
            <Avatar size="sm">
              <Avatar.Fallback>P</Avatar.Fallback>
            </Avatar>
            <Avatar size="md">
              <Avatar.Fallback>AI</Avatar.Fallback>
            </Avatar>
            <div className="text-xs">
              <p className="font-semibold">Pip Companion</p>
              <p className="text-muted">Shopping Assistant</p>
            </div>
          </Card.Content>
        </Card>

        {/* 21. Dropdown */}
        <Card className="p-4 space-y-3 bg-surface border border-border">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">21. Dropdown</Card.Title>
            <Card.Description className="text-xs text-muted">Action menu dropdown</Card.Description>
          </Card.Header>
          <Card.Content>
            <Dropdown.Root>
              <Dropdown.Trigger>
                <Button variant="outline" size="sm">Product Actions ▾</Button>
              </Dropdown.Trigger>
              <Dropdown.Popover className="p-1 bg-surface border border-border rounded min-w-36">
                <Dropdown.Menu aria-label="Product actions">
                  <Dropdown.Item id="compare" className="px-2 py-1 text-xs hover:bg-surface-2 rounded cursor-pointer">
                    Add to Compare
                  </Dropdown.Item>
                  <Dropdown.Item id="share" className="px-2 py-1 text-xs hover:bg-surface-2 rounded cursor-pointer">
                    Share Product
                  </Dropdown.Item>
                  <Dropdown.Item id="report" className="px-2 py-1 text-xs hover:bg-surface-2 rounded cursor-pointer text-state-error">
                    Report Issue
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.Root>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
