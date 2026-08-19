import { useState } from "react";
import {
  ActionBar,
  Badge,
  Button,
  Dialog,
  ElementPicker,
  Fieldset,
  FormField,
  Hotbar,
  IconButton,
  InputGroup,
  ItemCard,
  ListItem,
  LockedState,
  MetadataRow,
  Panel,
  Popover,
  ProgressBar,
  SegmentedControl,
  SplitPane,
  Switch,
  TextInput,
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

      <ShowcaseSection title="Form controls">
        <Panel className="grid gap-5 p-5 md:grid-cols-2">
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
          <div className="flex items-center gap-5">
            <Switch
              checked={switchOn}
              onChange={(event) => setSwitchOn(event.target.checked)}
              label="Show grid"
            />
            <span className="text-xs text-slate-500">{switchOn ? "on" : "off"}</span>
          </div>
          <div className="md:col-span-2">
            <SegmentedControl options={modeOptions} value={mode} onChange={setMode} />
          </div>
        </Panel>
      </ShowcaseSection>

      <ShowcaseSection title="Panels and states">
        <div className="grid gap-5 lg:grid-cols-2">
          <Fieldset legend="World options">
            <LockedState icon={<span>♙</span>} />
          </Fieldset>
          <Panel title="Collapsible panel" collapsible className="p-4">
            <p className="text-sm leading-6 text-slate-400">
              Panel content can be collapsed without leaving the surrounding layout.
            </p>
          </Panel>
        </div>
      </ShowcaseSection>

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
