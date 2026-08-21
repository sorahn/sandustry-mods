import { useState } from "react";
import {
  ActionBar,
  Badge,
  Button,
  Dialog,
  Divider,
  ElementPicker,
  Fieldset,
  FormField,
  Hotbar,
  IconButton,
  InputGroup,
  ItemCard,
  ListItem,
  LockedState,
  List,
  MetadataRow,
  Panel,
  Popover,
  ProgressList,
  ProgressListItem,
  ProgressBar,
  SegmentedControl,
  SplitPane,
  StatusIndicator,
  Switch,
  TextInput,
  TextAction,
  Tooltip,
} from "@sandustry/ui";

const modeOptions = [
  { value: "overview", label: "Overview" },
  { value: "details", label: "Details" },
] as const;

const matterOptions = [
  { value: "all", label: "All" },
  { value: "solid", label: "Solid" },
  { value: "liquid", label: "Liquid" },
] as const;

const pickerItems = [
  {
    id: "sand",
    label: "Sand",
    matter: "solid",
    icon: <span className="h-3 w-3 rounded-sm bg-amber-200" />,
  },
  {
    id: "water",
    label: "Water",
    matter: "liquid",
    icon: <span className="h-3 w-3 rounded-sm bg-cyan-300" />,
  },
  {
    id: "stone",
    label: "Stone",
    matter: "solid",
    icon: <span className="h-3 w-3 rounded-sm bg-slate-400" />,
  },
  {
    id: "steam",
    label: "Steam",
    matter: "liquid",
    icon: <span className="h-3 w-3 rounded-sm bg-white" />,
  },
];

const hotbarSlots = [
  { id: "select", label: "Select", icon: <span className="text-xl">⌁</span> },
  { id: "filter", label: "Filter", icon: <span className="text-xl">◇</span> },
  { id: "light", label: "Light", icon: <span className="text-xl text-yellow-300">✦</span> },
];

type ColorEntry = { name: string; value: string; use: string };
type ColorGroup = { name: string; description: string; colors: ColorEntry[] };

const colorGroups: ColorGroup[] = [
  {
    name: "Black",
    description: "Bedrock, dark rock, and deep UI surfaces",
    colors: [
      { name: "Bedrock", value: "#222222", use: "terrain" },
      { name: "Blackrock", value: "#141414", use: "terrain" },
      { name: "Oil", value: "#1a1410", use: "element" },
      { name: "BG Dark", value: "#1a1a2e", use: "UI" },
    ],
  },
  {
    name: "Red",
    description: "Lava, fire, danger, and red soil",
    colors: [
      { name: "Sandium Soil", value: "#8b0000", use: "terrain" },
      { name: "Lava Fog", value: "#b22222", use: "terrain" },
      { name: "Lava", value: "#ff3300", use: "element" },
      { name: "Danger", value: "#ef4444", use: "status" },
    ],
  },
  {
    name: "Green",
    description: "Grass, moss, plants, and success states",
    colors: [
      { name: "Grass", value: "#228b22", use: "terrain" },
      { name: "Moss", value: "#1dae1d", use: "terrain" },
      { name: "Primary", value: "#22c55e", use: "status" },
      { name: "Success", value: "#4ade80", use: "tutorial" },
    ],
  },
  {
    name: "Yellow",
    description: "Gold, sand, warning, and the primary game accent",
    colors: [
      { name: "Game accent", value: "#ffe700", use: "selected/focused" },
      { name: "Gold", value: "#ffd700", use: "element/UI" },
      { name: "Gold Soil", value: "#daa520", use: "terrain" },
      { name: "Dune", value: "#eed975", use: "terrain" },
      { name: "Warning", value: "#ffaa44", use: "status" },
    ],
  },
  {
    name: "Blue",
    description: "Water, ice, coolant, and informational states",
    colors: [
      { name: "Water", value: "#1e90ff", use: "element" },
      { name: "Water accent", value: "#66ccff", use: "UI/material" },
      { name: "Ice", value: "#afeeee", use: "terrain" },
      { name: "Coolant", value: "#0033aa", use: "element" },
      { name: "Logistics", value: "#60a5fa", use: "tutorial" },
    ],
  },
  {
    name: "Magenta",
    description: "Petalium, fluxite, void materials, and secondary accents",
    colors: [
      { name: "Fluxite", value: "#8a2be2", use: "terrain" },
      { name: "Petalium", value: "#cc5cdb", use: "element" },
      { name: "Hot Pink", value: "#ff1493", use: "UI/effect" },
      { name: "Void Seeds", value: "#9932cc", use: "element" },
      { name: "Purple", value: "#9966ff", use: "status" },
    ],
  },
  {
    name: "Cyan",
    description: "Steam, freezing materials, crystal, and information",
    colors: [
      { name: "Info", value: "#00ffff", use: "status" },
      { name: "Freezing Ice Soil", value: "#add8e6", use: "terrain" },
      { name: "Freezing Ice", value: "#e0ffff", use: "element" },
      { name: "Water tutorial", value: "#4fc3f7", use: "tutorial" },
      { name: "Crystal", value: "#0094b3", use: "terrain" },
    ],
  },
  {
    name: "White",
    description: "Text, steam, residue, and pale material highlights",
    colors: [
      { name: "Text", value: "#ffffff", use: "UI" },
      { name: "Steam", value: "#f7f7f7", use: "element" },
      { name: "Residue", value: "#cccccc", use: "element" },
      { name: "Stone", value: "#808080", use: "terrain" },
      { name: "Muted", value: "#888888", use: "UI" },
    ],
  },
];

function ShowcaseSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-yellow-300/80">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function DebugPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  const [mode, setMode] = useState<(typeof modeOptions)[number]["value"]>("overview");
  const [selectedItem, setSelectedItem] = useState("sand");
  const [query, setQuery] = useState("");
  const [matter, setMatter] = useState("all");

  if (!import.meta.env.DEV) {
    return (
      <Panel className="mx-auto max-w-xl p-8">
        The component debug page is available in development builds only.
      </Panel>
    );
  }

  return (
    <div className="space-y-10">
      <header className="border-b border-slate-800 pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-yellow-300/80">
          Debug only
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">Component showcase</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Interactive states for the browser UI kit. This route is intentionally not linked from the
          public site navigation.
        </p>
      </header>

      <ShowcaseSection title="Hero panel and text actions">
        <Panel variant="hero" className="mx-auto max-w-3xl px-8 py-5 text-center">
          <h2 className="text-2xl tracking-wider text-[#ffe700]">
            This library is still in development.
          </h2>
          <div className="px-4 py-2">
            <Divider variant="accent" />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-white/90">
            A high-attention surface for welcome messages, release notes, or important product
            context.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <StatusIndicator tone="online" label="online" value="4,736" />
            <StatusIndicator tone="neutral" label="members" value="14,902" />
            <StatusIndicator tone="warning" label="maintenance" />
          </div>
          <Divider className="my-4" />
          <div className="flex flex-wrap items-center justify-center gap-4">
            <TextAction as="a" href="https://example.com" target="_blank" rel="noreferrer">
              Community
            </TextAction>
            <TextAction icon={<span aria-hidden="true">◌</span>}>Send feedback</TextAction>
            <TextAction>Credits</TextAction>
          </div>
        </Panel>
      </ShowcaseSection>

      <ShowcaseSection title="Actions and status">
        <Panel className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Default action</Button>
            <Button variant="accent">Accent action</Button>
            <Button variant="danger">Danger action</Button>
            <Button disabled>Disabled action</Button>
            <Badge>Default</Badge>
            <Badge tone="accent">Selected</Badge>
            <Badge tone="success">Ready</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="danger">Error</Badge>
            <Badge tone="info">Info</Badge>
          </div>
          <div className="mt-5 max-w-xl space-y-2">
            <ProgressBar value={68} label="Example progress" />
            <div className="flex justify-between text-xs text-slate-500">
              <span>ProgressBar</span>
              <span>68%</span>
            </div>
          </div>
        </Panel>
      </ShowcaseSection>

      <ShowcaseSection title="Color catalog">
        <Panel className="p-5">
          <p className="mb-4 max-w-3xl text-sm leading-6 text-slate-400">
            A compact view of the catalog, grouped into broad color families for easier browsing.
            The grouping is for navigation rather than an exact color conversion; each swatch keeps
            its original game-facing hex value and role.
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {colorGroups.map((group) => (
              <section
                key={group.name}
                className="overflow-hidden rounded border border-slate-700/80 bg-black/40"
              >
                <div className="border-b border-slate-700/70 px-3 py-2">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-white">
                    {group.name}
                  </h3>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">{group.description}</p>
                </div>
                <div className="divide-y divide-slate-800/80">
                  {group.colors.map((color) => (
                    <div
                      key={`${group.name}-${color.name}`}
                      className="flex items-center gap-2 px-3 py-2"
                    >
                      <span
                        className="h-6 w-6 shrink-0 rounded-sm border border-white/20 shadow-inner"
                        style={{ backgroundColor: color.value }}
                        title={`${color.name}: ${color.value}`}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-xs text-slate-200">{color.name}</div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {color.value} · {color.use}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Panel>
      </ShowcaseSection>

      <ShowcaseSection title="Form controls">
        <Panel className="p-5">
          <div className="grid gap-6 md:grid-cols-2">
            <FormField label="World name" required>
              <InputGroup>
                <TextInput defaultValue="Claybarren" maxLength={64} />
                <IconButton
                  label="Regenerate name"
                  className="h-[38px] w-[38px] rounded-sm border border-slate-600 bg-black/60 hover:border-[#ffe700] hover:text-[#ffe700]"
                >
                  ↻
                </IconButton>
              </InputGroup>
            </FormField>
            <FormField label="Seed" hint="Use a short stable identifier for repeatable layouts.">
              <InputGroup>
                <TextInput defaultValue="llcfshrd" monospace tone="accent" maxLength={32} />
                <IconButton
                  label="Regenerate seed"
                  className="h-[38px] w-[38px] rounded-sm border border-slate-600 bg-black/60 hover:border-[#ffe700] hover:text-[#ffe700]"
                >
                  ↻
                </IconButton>
              </InputGroup>
            </FormField>
            <FormField label="Invalid field" error="This value is required.">
              <TextInput aria-invalid="true" className="border-red-400" />
            </FormField>
            <div className="grid content-start gap-6">
              <div className="flex items-center gap-5">
                <Switch
                  checked={switchOn}
                  onChange={(event) => setSwitchOn(event.target.checked)}
                  label="Show grid"
                />
                <span className="text-xs text-slate-500">{switchOn ? "on" : "off"}</span>
              </div>
              <SegmentedControl options={modeOptions} value={mode} onChange={setMode} />
            </div>
          </div>
        </Panel>
      </ShowcaseSection>

      <ShowcaseSection title="Panels and states">
        <div className="grid gap-5 lg:grid-cols-2">
          <Fieldset legend="World options">
            <LockedState icon={<span>♙</span>} />
          </Fieldset>
          <Panel title="Collapsible panel" collapsible contentClassName="p-4">
            <p className="text-sm leading-6 text-slate-400">
              Panel content can be collapsed without leaving the surrounding layout.
            </p>
          </Panel>
        </div>
      </ShowcaseSection>

      <div className="grid gap-10 lg:grid-cols-2">
        <ShowcaseSection title="Lists and variants">
          <Panel className="p-5">
            <List variant="panel">
              <ListItem label="Default item" description="Standard list density" />
              <ListItem label="Compact item" description="Reduced spacing" variant="compact" />
              <ListItem
                label="Subtle item"
                description="Muted presentation variant"
                variant="subtle"
              />
              <ListItem label="Selected item" selected />
            </List>
          </Panel>
        </ShowcaseSection>

        <ShowcaseSection title="Progress list">
          <Panel className="p-5">
            <ProgressList>
              <ProgressListItem>Loading sounds</ProgressListItem>
              <ProgressListItem>Initializing systems</ProgressListItem>
              <ProgressListItem variant="active" last>
                Starting game
              </ProgressListItem>
              <ProgressListItem variant="substep">Generating cave systems</ProgressListItem>
              <ProgressListItem variant="substep" last>
                Generating wall textures
              </ProgressListItem>
            </ProgressList>
          </Panel>
        </ShowcaseSection>
      </div>

      <ShowcaseSection title="Lists and metadata">
        <SplitPane
          className="min-h-80 overflow-hidden rounded border border-slate-700 bg-black/40"
          sidebarClassName="w-56"
          sidebar={
            <>
              <div className="border-b border-slate-700/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-300">
                Projects
              </div>
              <ListItem label="Blueprints" description="12 items" selected />
              <ListItem
                label="Maps"
                description="4 items"
                trailing={<Badge tone="info">new</Badge>}
              />
            </>
          }
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            <ItemCard label="Factory starter" meta="v2" selected />
            <ItemCard label="Signal test rig" meta="v1" />
            <MetadataRow
              items={[
                { label: "Structures", value: "48", tone: "accent" },
                { label: "Updated", value: "12m ago", tone: "muted" },
                { label: "Status", value: "Ready", tone: "success" },
              ]}
            />
          </div>
        </SplitPane>
      </ShowcaseSection>

      <ShowcaseSection title="Overlays and navigation">
        <Panel className="p-5">
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="accent" onClick={() => setDialogOpen(true)}>
              Open dialog
            </Button>
            <Tooltip content="A compact contextual explanation.">
              <Button>Hover tooltip</Button>
            </Tooltip>
            <Popover
              open={popoverOpen}
              content={
                <span className="text-xs text-slate-300">Popover content with actions.</span>
              }
            >
              <Button onClick={() => setPopoverOpen((open) => !open)}>Toggle popover</Button>
            </Popover>
          </div>
          <div className="mt-5 flex items-center gap-3 overflow-x-auto">
            <Hotbar
              slots={hotbarSlots}
              selectedId="filter"
              onSelect={(slot) => setSelectedItem(slot.id)}
            />
            <span className="text-xs text-slate-500">Selected: {selectedItem}</span>
          </div>
        </Panel>
      </ShowcaseSection>

      <ShowcaseSection title="Element picker">
        <ElementPicker
          items={pickerItems}
          value={selectedItem}
          query={query}
          matter={matter}
          matterOptions={matterOptions}
          onQueryChange={setQuery}
          onMatterChange={setMatter}
          onSelect={(item) => setSelectedItem(item.id)}
        />
      </ShowcaseSection>

      <Dialog
        open={dialogOpen}
        title="Debug dialog"
        onClose={() => setDialogOpen(false)}
        footer={
          <ActionBar>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={() => setDialogOpen(false)}>
              Confirm
            </Button>
          </ActionBar>
        }
      >
        <div className="space-y-4 p-5 text-sm text-slate-300">
          <p>
            This exercises the modal shell, scrollable body, close action, and footer action bar.
          </p>
          <TextInput defaultValue="Dialog input" />
        </div>
      </Dialog>
    </div>
  );
}
