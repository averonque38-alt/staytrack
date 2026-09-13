import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import {
  ArrowDownLeft, ArrowUpRight, BarChart3, Building2, CalendarDays, ChevronRight,
  CircleDollarSign, ClipboardList, Download, FileText, Home, LayoutDashboard,
  LogOut, Menu, Plus, Search, Settings2, SlidersHorizontal, Sparkles, Trash2, TrendingUp,
  Upload, Users, WalletCards, Wrench, X, Pencil, RefreshCw, ShieldCheck, DoorOpen
} from 'lucide-react';
import logo from './assets/staytrack-logo.png';
import loginBackground from './assets/login-background.png';
import { ErrorBoundary } from '@/components/error-boundary';

type Row = { id: string; [key: string]: any };
type StoreKey = 'locations' | 'units' | 'bookings' | 'income' | 'expenses' | 'budgets' | 'projections' | 'maintenance' | 'seasonal' | 'scenarios' | 'cooperative';
type Store = Record<StoreKey, Row[]>;
type Field = { name: string; label: string; type?: string; required?: boolean; options?: string[]; placeholder?: string; wide?: boolean };

const emptyStore: Store = { locations: [], units: [], bookings: [], income: [], expenses: [], budgets: [], projections: [], maintenance: [], seasonal: [], scenarios: [], cooperative: [] };
const STORAGE_KEY = 'staytrack-workspace-v1';
const SESSION_KEY = 'staytrack-session-v1';

const navGroups = [
  { label: 'Observe', items: [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/locations', label: 'Locations', icon: Building2 },
    { href: '/units', label: 'Units & stations', icon: DoorOpen },
    { href: '/bookings', label: 'Bookings', icon: CalendarDays },
  ]},
  { label: 'Money desk', items: [
    { href: '/income', label: 'Income', icon: ArrowDownLeft },
    { href: '/expenses', label: 'Expenses', icon: ArrowUpRight },
    { href: '/cash-flow', label: 'Cash flow', icon: WalletCards },
    { href: '/budget-actual', label: 'Budget vs actual', icon: BarChart3 },
  ]},
  { label: 'Plan & learn', items: [
    { href: '/projection', label: 'Projection', icon: TrendingUp },
    { href: '/profitability', label: 'Profitability', icon: CircleDollarSign },
    { href: '/location-analysis', label: 'Location analysis', icon: SlidersHorizontal },
    { href: '/maintenance', label: 'Maintenance', icon: Wrench },
    { href: '/peak-off-peak', label: 'Peak / off-peak', icon: CalendarDays },
  ]},
  { label: 'Management', items: [
    { href: '/monthly-summary', label: 'Monthly summary', icon: ClipboardList },
    { href: '/scenario-analysis', label: 'Scenario analysis', icon: Sparkles },
    { href: '/cooperative', label: 'Cooperative', icon: Users },
    { href: '/reports', label: 'Reports', icon: FileText },
  ]},
];

const pageConfigs: Record<string, { title: string; eyebrow: string; description: string; store: StoreKey; singular: string; fields: Field[]; columns: { key: string; label: string; format?: (value: any, row: Row) => string }[] }> = {
  locations: { title: 'Locations', eyebrow: 'Portfolio register', description: 'Keep the operating context for every property in one dependable register.', store: 'locations', singular: 'location', fields: [
    { name: 'name', label: 'Property name', required: true, placeholder: 'e.g. Riverlight Residences' }, { name: 'address', label: 'Address', required: true, placeholder: 'Street, city, country' }, { name: 'type', label: 'Property type', required: true, type: 'select', options: ['Residential', 'Serviced apartment', 'Mixed use', 'Commercial', 'Other'] }, { name: 'notes', label: 'Operating notes', type: 'textarea', wide: true }
  ], columns: [{ key: 'name', label: 'Property' }, { key: 'address', label: 'Address' }, { key: 'type', label: 'Type' }, { key: 'notes', label: 'Notes' }] },
  units: { title: 'Units & stations', eyebrow: 'Occupancy inventory', description: 'Map the rentable or assignable spaces behind your occupancy picture.', store: 'units', singular: 'unit', fields: [
    { name: 'locationId', label: 'Location', type: 'location', required: true }, { name: 'unitCode', label: 'Unit code', required: true, placeholder: 'e.g. A-0412' }, { name: 'unitType', label: 'Unit type', required: true, type: 'select', options: ['Studio', '1 bedroom', '2 bedroom', '3 bedroom', 'Office', 'Other'] }, { name: 'status', label: 'Status', required: true, type: 'select', options: ['Available', 'Occupied', 'Reserved', 'Out of service'] }, { name: 'monthlyRate', label: 'Monthly rate', required: true, type: 'number', placeholder: '0.00' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }
  ], columns: [{ key: 'unitCode', label: 'Unit' }, { key: 'locationId', label: 'Location', format: (v) => v }, { key: 'unitType', label: 'Type' }, { key: 'status', label: 'Status' }, { key: 'monthlyRate', label: 'Rate', format: (v) => money(v) }] },
  bookings: { title: 'Bookings', eyebrow: 'Occupancy register', description: 'Record reservation and occupancy movements to build a clear operating history.', store: 'bookings', singular: 'booking', fields: [
    { name: 'locationId', label: 'Location', type: 'location', required: true }, { name: 'unitId', label: 'Unit', type: 'unit', required: true }, { name: 'guestOrOccupant', label: 'Guest / occupant', required: true, placeholder: 'Name or reference' }, { name: 'checkIn', label: 'Check in', type: 'date', required: true }, { name: 'checkOut', label: 'Check out', type: 'date', required: true }, { name: 'status', label: 'Status', type: 'select', required: true, options: ['Inquiry', 'Confirmed', 'Checked in', 'Checked out', 'Cancelled'] }, { name: 'amount', label: 'Booking amount', type: 'number', required: true }
  ], columns: [{ key: 'guestOrOccupant', label: 'Guest / occupant' }, { key: 'unitId', label: 'Unit' }, { key: 'checkIn', label: 'Check in' }, { key: 'checkOut', label: 'Check out' }, { key: 'status', label: 'Status' }, { key: 'amount', label: 'Amount', format: (v) => money(v) }] },
  income: { title: 'Income', eyebrow: 'Money desk', description: 'Capture cash received and recognized revenue at the source.', store: 'income', singular: 'income entry', fields: [
    { name: 'locationId', label: 'Location', type: 'location', required: true }, { name: 'date', label: 'Date', type: 'date', required: true }, { name: 'category', label: 'Category', required: true, type: 'select', options: ['Rent', 'Booking', 'Service charge', 'Other'] }, { name: 'description', label: 'Description', required: true, placeholder: 'What was received?' }, { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: '0.00' }
  ], columns: [{ key: 'date', label: 'Date' }, { key: 'category', label: 'Category' }, { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount', format: (v) => money(v) }] },
  expenses: { title: 'Expenses', eyebrow: 'Money desk', description: 'Keep operating costs visible, categorized, and tied to the right property.', store: 'expenses', singular: 'expense entry', fields: [
    { name: 'locationId', label: 'Location', type: 'location', required: true }, { name: 'date', label: 'Date', type: 'date', required: true }, { name: 'category', label: 'Category', required: true, type: 'select', options: ['Utilities', 'Repairs', 'Supplies', 'Payroll', 'Taxes', 'Other'] }, { name: 'description', label: 'Description', required: true, placeholder: 'What was paid?' }, { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: '0.00' }
  ], columns: [{ key: 'date', label: 'Date' }, { key: 'category', label: 'Category' }, { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount', format: (v) => money(v) }] },
  budgets: { title: 'Budget vs actual', eyebrow: 'Control desk', description: 'Set an operating expectation and compare it with what the ledger says.', store: 'budgets', singular: 'budget line', fields: [
    { name: 'locationId', label: 'Location', type: 'location', required: true }, { name: 'period', label: 'Period', required: true, placeholder: 'e.g. 2025-04' }, { name: 'category', label: 'Category', required: true, placeholder: 'e.g. Utilities' }, { name: 'budgetAmount', label: 'Budget amount', type: 'number', required: true }, { name: 'actualAmount', label: 'Actual amount', type: 'number', required: true }
  ], columns: [{ key: 'period', label: 'Period' }, { key: 'category', label: 'Category' }, { key: 'budgetAmount', label: 'Budget', format: (v) => money(v) }, { key: 'actualAmount', label: 'Actual', format: (v) => money(v) }, { key: 'variance', label: 'Variance', format: (_v, r) => money(Number(r.budgetAmount || 0) - Number(r.actualAmount || 0)) }] },
  projections: { title: 'Projection', eyebrow: 'Planning desk', description: 'Keep forward-looking assumptions separate from realized results.', store: 'projections', singular: 'projection', fields: [
    { name: 'locationId', label: 'Location', type: 'location', required: true }, { name: 'period', label: 'Period', required: true, placeholder: 'e.g. 2025 Q3' }, { name: 'projectedIncome', label: 'Projected income', type: 'number', required: true }, { name: 'projectedExpenses', label: 'Projected expenses', type: 'number', required: true }, { name: 'assumptions', label: 'Assumptions', type: 'textarea', wide: true }
  ], columns: [{ key: 'period', label: 'Period' }, { key: 'projectedIncome', label: 'Income', format: (v) => money(v) }, { key: 'projectedExpenses', label: 'Expenses', format: (v) => money(v) }, { key: 'assumptions', label: 'Assumptions' }] },
  maintenance: { title: 'Maintenance', eyebrow: 'Care register', description: 'Track issues before they become interruptions, with clear ownership and timing.', store: 'maintenance', singular: 'maintenance item', fields: [
    { name: 'locationId', label: 'Location', type: 'location', required: true }, { name: 'unitId', label: 'Unit', type: 'unit' }, { name: 'issue', label: 'Issue', required: true, placeholder: 'What needs attention?' }, { name: 'priority', label: 'Priority', required: true, type: 'select', options: ['Low', 'Normal', 'High', 'Urgent'] }, { name: 'status', label: 'Status', required: true, type: 'select', options: ['Open', 'Scheduled', 'In progress', 'Resolved'] }, { name: 'scheduledDate', label: 'Scheduled date', type: 'date' }, { name: 'cost', label: 'Estimated cost', type: 'number' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }
  ], columns: [{ key: 'issue', label: 'Issue' }, { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' }, { key: 'scheduledDate', label: 'Scheduled' }, { key: 'cost', label: 'Cost', format: (v) => v ? money(v) : '—' }] },
  seasonal: { title: 'Peak / off-peak', eyebrow: 'Seasonal lens', description: 'Build a local seasonal record instead of relying on assumptions about demand.', store: 'seasonal', singular: 'seasonal entry', fields: [
    { name: 'locationId', label: 'Location', type: 'location', required: true }, { name: 'period', label: 'Period', required: true, placeholder: 'e.g. Jul–Sep 2025' }, { name: 'seasonType', label: 'Season type', type: 'select', required: true, options: ['Peak', 'Shoulder', 'Off-peak'] }, { name: 'occupancyRate', label: 'Occupancy rate (%)', type: 'number', required: true }, { name: 'revenue', label: 'Revenue', type: 'number', required: true }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }
  ], columns: [{ key: 'period', label: 'Period' }, { key: 'seasonType', label: 'Season' }, { key: 'occupancyRate', label: 'Occupancy', format: (v) => `${v}%` }, { key: 'revenue', label: 'Revenue', format: (v) => money(v) }] },
  scenarios: { title: 'Scenario analysis', eyebrow: 'Decision room', description: 'Put ranges around the next decision with transparent, editable assumptions.', store: 'scenarios', singular: 'scenario', fields: [
    { name: 'locationId', label: 'Location', type: 'location', required: true }, { name: 'name', label: 'Scenario name', required: true, placeholder: 'e.g. Tight supply response' }, { name: 'scenarioType', label: 'Scenario type', type: 'select', required: true, options: ['Conservative', 'Expected', 'Optimistic'] }, { name: 'occupancyRate', label: 'Occupancy rate (%)', type: 'number', required: true }, { name: 'averageRate', label: 'Average rate', type: 'number', required: true }, { name: 'monthlyExpenses', label: 'Monthly expenses', type: 'number', required: true }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }
  ], columns: [{ key: 'name', label: 'Scenario' }, { key: 'scenarioType', label: 'Type' }, { key: 'occupancyRate', label: 'Occupancy', format: (v) => `${v}%` }, { key: 'averageRate', label: 'Average rate', format: (v) => money(v) }, { key: 'monthlyExpenses', label: 'Expenses', format: (v) => money(v) }] },
  cooperative: { title: 'Cooperative', eyebrow: 'Shared capital', description: 'Keep member contributions, savings, and lending context together.', store: 'cooperative', singular: 'member record', fields: [
    { name: 'memberName', label: 'Member name', required: true }, { name: 'memberType', label: 'Member type', type: 'select', required: true, options: ['Member', 'Officer', 'Partner'] }, { name: 'contribution', label: 'Contribution', type: 'number', required: true }, { name: 'savings', label: 'Savings', type: 'number', required: true }, { name: 'loanBalance', label: 'Loan balance', type: 'number', required: true }, { name: 'loanStatus', label: 'Loan status', type: 'select', required: true, options: ['None', 'Current', 'Overdue', 'Paid'] }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }
  ], columns: [{ key: 'memberName', label: 'Member' }, { key: 'memberType', label: 'Type' }, { key: 'contribution', label: 'Contribution', format: (v) => money(v) }, { key: 'savings', label: 'Savings', format: (v) => money(v) }, { key: 'loanBalance', label: 'Loan', format: (v) => money(v) }, { key: 'loanStatus', label: 'Loan status' }] },
};

const numericFields = new Set(['monthlyRate', 'amount', 'budgetAmount', 'actualAmount', 'projectedIncome', 'projectedExpenses', 'cost', 'occupancyRate', 'revenue', 'averageRate', 'monthlyExpenses', 'contribution', 'savings', 'loanBalance']);
const money = (value: any) => typeof value === 'number' && !Number.isNaN(value) ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value) : '—';
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const readStore = (): Store => { try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); return parsed ? { ...emptyStore, ...parsed } : emptyStore; } catch { return emptyStore; } };
const locationName = (id: string, locations: Row[]) => locations.find((item) => item.id === id)?.name || 'Unassigned';
const shortDate = (value: string) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : '—';

function useStore() {
  const [store, setStore] = useState<Store>(() => readStore());
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }, [store]);
  const save = (key: StoreKey, row: Row) => setStore((current) => ({ ...current, [key]: current[key].some((item) => item.id === row.id) ? current[key].map((item) => item.id === row.id ? row : item) : [...current[key], row] }));
  const remove = (key: StoreKey, id: string) => setStore((current) => ({ ...current, [key]: current[key].filter((item) => item.id !== id) }));
  const reset = () => setStore(emptyStore);
  return { store, save, remove, reset };
}

function App() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><Router /></RoutedErrorBoundary></WouterRouter>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  const [location] = useLocation();
  const [session, setSession] = useState<string | null>(() => localStorage.getItem(SESSION_KEY));
  const { store, save, remove, reset } = useStore();
  if (!session) return <Login onSignIn={(email) => { localStorage.setItem(SESSION_KEY, email); setSession(email); }} />;
  return <AppShell session={session} onSignOut={() => { localStorage.removeItem(SESSION_KEY); setSession(null); }} store={store}>
    <Switch>
      <Route path="/" component={() => <Dashboard store={store} />} />
      <Route path="/dashboard" component={() => <Dashboard store={store} />} />
      {Object.entries(pageConfigs).map(([path, config]) => {
        const routePath = path === 'budgets' ? 'budget-actual' : path === 'projections' ? 'projection' : path === 'seasonal' ? 'peak-off-peak' : path === 'scenarios' ? 'scenario-analysis' : path;
        return <Route key={path} path={`/${routePath}`} component={() => <DataPage config={config} store={store} save={save} remove={remove} />} />;
      })}
      <Route path="/cash-flow" component={() => <CashFlow store={store} />} />
      <Route path="/profitability" component={() => <Profitability store={store} />} />
      <Route path="/location-analysis" component={() => <LocationAnalysis store={store} />} />
      <Route path="/monthly-summary" component={() => <MonthlySummary store={store} />} />
      <Route path="/reports" component={() => <Reports store={store} />} />
      <Route path="/settings" component={() => <Settings store={store} reset={reset} />} />
      <Route component={() => <NotFoundRoute />} />
    </Switch>
  </AppShell>;
}

function Login({ onSignIn }: { onSignIn: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); if (!email.trim() || !password.trim()) { setError('Enter an email and password to open this local workspace.'); return; } onSignIn(email.trim()); };
  return <main className="noise min-h-[100dvh] grid lg:grid-cols-[1.02fr_.98fr] bg-[hsl(var(--background))]">
    <section className="relative hidden overflow-hidden lg:block">
      <img src={loginBackground} alt="Residential buildings around a shared pool" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(190_48%_16%/.1),hsl(190_48%_16%/.88))]" />
      <div className="absolute bottom-10 left-10 right-10 text-[hsl(var(--card))] animate-rise">
        <div className="mb-5 h-px w-16 bg-[hsl(var(--accent))]" />
        <p className="app-mono text-xs uppercase tracking-[.18em] text-[hsl(var(--card)/.75)]">A quieter way to run property</p>
        <h1 className="app-serif mt-3 max-w-lg text-5xl leading-[1.08]">Know the room before you make the move.</h1>
        <p className="mt-5 max-w-md text-sm leading-6 text-[hsl(var(--card)/.75)]">StayTrack turns the everyday signals of occupancy, cash, and care into a clear operating picture.</p>
      </div>
    </section>
    <section className="flex items-center justify-center px-6 py-12 sm:px-12">
      <div className="w-full max-w-md animate-rise">
        <img src={logo} alt="StayTrack Property Operations" className="mb-12 h-auto w-72 max-w-full object-contain object-left" data-testid="img-staytrack-logo" />
        <div className="mb-8">
          <p className="app-mono text-[11px] uppercase tracking-[.18em] text-[hsl(var(--accent))]">Operator sign in</p>
          <h2 className="app-serif mt-3 text-3xl text-[hsl(var(--primary))]">Open your workspace</h2>
          <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">A local-first starter for your property operations record.</p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div><label className="st-label" htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="st-input" placeholder="you@example.com" data-testid="input-email" /></div>
          <div><label className="st-label" htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="st-input" placeholder="Enter your password" data-testid="input-password" /></div>
          {error && <p className="rounded-md bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-sm text-[hsl(var(--destructive))]" data-testid="status-login-error">{error}</p>}
          <button type="submit" className="st-btn st-btn-primary w-full py-3" data-testid="button-sign-in">Sign in to local workspace <ChevronRight size={16} /></button>
        </form>
        <div className="mt-8 flex gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.45)] p-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          <ShieldCheck className="mt-0.5 shrink-0 text-[hsl(var(--accent))]" size={16} />
          <span><strong className="text-[hsl(var(--foreground))]">Single-browser starter.</strong> Your records stay in this browser until a production auth provider is connected.</span>
        </div>
      </div>
    </section>
  </main>;
}

function AppShell({ children, session, onSignOut, store }: { children: ReactNode; session: string; onSignOut: () => void; store: Store }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const current = navGroups.flatMap((group) => group.items).find((item) => location === item.href);
  return <div className="noise min-h-[100dvh] bg-[hsl(var(--background))]">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-[88px] items-center border-b border-[hsl(var(--sidebar-border))] px-6"><Link href="/dashboard" className="flex items-center gap-3" data-testid="link-sidebar-logo"><span className="grid h-9 w-9 place-items-center rounded-md bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]"><ArrowUpRight size={20} /></span><span><span className="block app-serif text-lg tracking-tight">StayTrack</span><span className="app-mono block text-[8px] uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.6)]">Property operations</span></span></Link><button className="ml-auto lg:hidden" onClick={() => setOpen(false)} data-testid="button-close-sidebar"><X size={18} /></button></div>
      <div className="flex-1 overflow-y-auto px-3 py-6">{navGroups.map((group) => <div key={group.label} className="mb-7"><p className="px-3 pb-2 app-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.45)]">{group.label}</p>{group.items.map((item) => { const Icon = item.icon; const active = location === item.href; return <Link onClick={() => setOpen(false)} key={item.href} href={item.href} className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${active ? 'bg-[hsl(var(--sidebar-primary)/.17)] text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.7)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'}`} data-testid={`link-nav-${item.href.slice(1)}`}><Icon size={16} strokeWidth={active ? 2.3 : 1.7} /><span>{item.label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />}</Link>; })}</div>)}</div>
      <div className="border-t border-[hsl(var(--sidebar-border))] p-4"><div className="mb-3 flex items-center gap-3 rounded-md bg-[hsl(var(--sidebar-accent)/.55)] p-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--sidebar-primary))] text-xs font-bold text-[hsl(var(--sidebar-primary-foreground))]">{session.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-xs font-semibold">{session}</p><p className="app-mono mt-0.5 text-[9px] uppercase tracking-wider text-[hsl(var(--sidebar-foreground)/.5)]">Local operator</p></div></div><button onClick={onSignOut} className="flex w-full items-center gap-2 px-2 text-xs text-[hsl(var(--sidebar-foreground)/.6)] hover:text-[hsl(var(--sidebar-foreground))]" data-testid="button-sign-out"><LogOut size={14} /> Sign out</button></div>
    </aside>
    {open && <button className="fixed inset-0 z-30 bg-[hsl(var(--primary)/.38)] lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation" data-testid="button-navigation-overlay" />}
    <div className="lg:pl-64"><header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.9)] px-5 backdrop-blur-md sm:px-8"><div className="flex items-center gap-3"><button className="st-btn st-btn-ghost p-2 lg:hidden" onClick={() => setOpen(true)} data-testid="button-open-sidebar"><Menu size={20} /></button><div className="hidden text-xs text-[hsl(var(--muted-foreground))] sm:block">Workspace <span className="mx-2 text-[hsl(var(--border))]">/</span> <span className="text-[hsl(var(--foreground))]">{current?.label || 'Operations'}</span></div></div><div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]"><span className="hidden items-center gap-2 sm:flex"><span className="h-2 w-2 rounded-full bg-[hsl(145_44%_43%)]" /> Saved locally</span><Link href="/settings" className="st-btn st-btn-ghost p-2" data-testid="link-settings"><Settings2 size={18} /></Link></div></header><main className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10">{children}</main></div>
  </div>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col gap-5 border-b border-[hsl(var(--border))] pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="app-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--accent))]">{eyebrow}</p><h1 className="app-serif mt-2 text-3xl text-[hsl(var(--primary))] sm:text-[2.2rem]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p></div>{action}</div>;
}

function EmptyState({ icon: Icon, title, description, action }: { icon: any; title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-[230px] flex-col items-center justify-center px-6 py-12 text-center"><span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--accent))]"><Icon size={21} strokeWidth={1.7} /></span><h3 className="app-serif text-lg text-[hsl(var(--primary))]">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function Dashboard({ store }: { store: Store }) {
  const income = store.income.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const expenses = store.expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const occupied = store.units.filter((row) => row.status === 'Occupied').length;
  const activeLocations = store.locations.length;
  const hasAny = Object.values(store).some((items) => items.length > 0);
  const metric = (value: number, format?: (n: number) => string) => value ? (format ? format(value) : value) : 'Add data';
  return <div className="animate-rise"><PageHeader eyebrow="Operations room" title="Good morning, operator." description="A clear read on what is recorded, what is moving, and what needs your next decision." action={<Link href="/locations" className="st-btn st-btn-accent" data-testid="button-dashboard-add-location"><Plus size={16} /> Add location</Link>} />
    <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {([
        { label: 'Locations', value: metric(activeLocations), Icon: Building2, sub: 'properties' },
        { label: 'Units occupied', value: activeLocations ? `${occupied} / ${store.units.length || '—'}` : 'Add data', Icon: DoorOpen, sub: 'inventory' },
        { label: 'Income recorded', value: metric(income, money), Icon: ArrowDownLeft, sub: 'ledger' },
        { label: 'Expenses recorded', value: metric(expenses, money), Icon: ArrowUpRight, sub: 'ledger' },
      ] as { label: string; value: string | number; Icon: any; sub: string }[]).map(({ label, value, Icon, sub }, i) => <div className="st-card p-5" key={String(label)} data-testid={`card-metric-${i}`}><div className="flex items-start justify-between"><p className="app-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">{label}</p><span className={`rounded-md p-2 ${i === 2 ? 'bg-[hsl(145_44%_43%/.12)] text-[hsl(145_44%_34%)]' : i === 3 ? 'bg-[hsl(var(--accent)/.12)] text-[hsl(var(--accent))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]'}`}><Icon size={16} /></span></div><p className={`mt-5 text-2xl font-semibold tracking-tight ${value === 'Add data' ? 'text-[hsl(var(--muted-foreground))]' : 'text-[hsl(var(--primary))]'}`}>{value}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{sub}</p></div>)}
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
      <section className="st-card overflow-hidden"><div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4"><div><h2 className="font-semibold text-[hsl(var(--primary))]">Start with the operating picture</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">A clean workspace is built one record at a time.</p></div><span className="app-mono text-xs text-[hsl(var(--muted-foreground))]">{hasAny ? 'In progress' : 'Not started'}</span></div><div className="grid gap-3 p-5 sm:grid-cols-2">{[{ href: '/locations', icon: Building2, title: 'Register a location', copy: 'Give your portfolio a home base.' }, { href: '/units', icon: DoorOpen, title: 'Map your units', copy: 'Define the spaces you operate.' }, { href: '/income', icon: ArrowDownLeft, title: 'Record income', copy: 'Start the cash story.' }, { href: '/expenses', icon: ArrowUpRight, title: 'Record an expense', copy: 'Make cost visible.' }].map((item) => { const Icon = item.icon; return <Link href={item.href} key={item.href} className="group flex items-center gap-4 rounded-lg border border-[hsl(var(--border))] p-4 transition-colors hover:border-[hsl(var(--accent)/.6)] hover:bg-[hsl(var(--muted)/.5)]" data-testid={`link-quick-${item.href.slice(1)}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Icon size={17} /></span><span className="min-w-0"><span className="block text-sm font-semibold text-[hsl(var(--primary))]">{item.title}</span><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{item.copy}</span></span><ChevronRight className="ml-auto text-[hsl(var(--border))] transition-transform group-hover:translate-x-1" size={16} /></Link>; })}</div></section>
      <section className="st-card"><div className="border-b border-[hsl(var(--border))] px-5 py-4"><h2 className="font-semibold text-[hsl(var(--primary))]">Decision signals</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Calculated from your saved records only.</p></div>{hasAny ? <div className="space-y-4 p-5"><Signal label="Net recorded cash" value={income || expenses ? money(income - expenses) : 'Add income and expenses'} tone={income - expenses >= 0 ? 'positive' : 'warning'} /><Signal label="Open maintenance" value={store.maintenance.length ? `${store.maintenance.filter((r) => r.status !== 'Resolved').length} item(s)` : 'Add maintenance records'} /><Signal label="Bookings on record" value={store.bookings.length ? `${store.bookings.length} booking(s)` : 'Add bookings'} /></div> : <EmptyState icon={BarChart3} title="No signals yet" description="Once you add locations, units, and ledger entries, this room will surface the useful patterns." />}</section>
    </div>
  </div>;
}

function Signal({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: string }) { return <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-4 last:border-0 last:pb-0"><span className="text-sm text-[hsl(var(--muted-foreground))]">{label}</span><span className={`text-right text-sm font-semibold ${tone === 'positive' ? 'text-[hsl(145_44%_34%)]' : tone === 'warning' ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--primary))]'}`} data-testid={`text-signal-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</span></div>; }

function DataPage({ config, store, save, remove }: { config: typeof pageConfigs[string]; store: Store; save: (key: StoreKey, row: Row) => void; remove: (key: StoreKey, id: string) => void }) {
  const rows = store[config.store];
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<Row | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const filtered = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));
  const submit = (values: Row) => { save(config.store, values); setModal(undefined); setSaved(true); window.setTimeout(() => setSaved(false), 2500); };
  return <div className="animate-rise"><PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} action={<button onClick={() => setModal(null)} className="st-btn st-btn-accent" data-testid={`button-add-${config.store}`}><Plus size={16} /> Add {config.singular}</button>} />
    {saved && <div className="mb-5 flex items-center gap-2 rounded-md border border-[hsl(145_44%_43%/.35)] bg-[hsl(145_44%_43%/.08)] px-4 py-3 text-sm text-[hsl(145_44%_30%)] animate-fade" data-testid="status-save-success"><ShieldCheck size={16} /> Saved to this browser workspace.</div>}
    <div className="st-card overflow-hidden"><div className="flex flex-col gap-3 border-b border-[hsl(var(--border))] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} className="st-input pl-9 text-sm" placeholder={`Search ${config.title.toLowerCase()}...`} data-testid={`input-search-${config.store}`} /></div><p className="app-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{rows.length} record{rows.length === 1 ? '' : 's'}</p></div>{filtered.length === 0 ? <EmptyState icon={config.store === 'maintenance' ? Wrench : config.store === 'cooperative' ? Users : ClipboardList} title={rows.length ? 'No matching records' : `No ${config.title.toLowerCase()} yet`} description={rows.length ? 'Try another search term.' : `Add your first ${config.singular} to make this workspace useful.`} action={!rows.length && <button onClick={() => setModal(null)} className="st-btn st-btn-primary" data-testid={`button-empty-add-${config.store}`}><Plus size={15} /> Add {config.singular}</button>} /> : <div className="overflow-x-auto"><table className="st-table w-full min-w-[760px]"><thead><tr>{config.columns.map((column) => <th key={column.key}>{column.label}</th>)}<th className="w-24">Actions</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id} data-testid={`row-${config.store}-${row.id}`}>{config.columns.map((column) => <td key={column.key} className={column.key === config.columns[0].key ? 'font-semibold text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}>{column.key === 'locationId' ? locationName(row[column.key], store.locations) : column.key === 'unitId' ? (store.units.find((u) => u.id === row[column.key])?.unitCode || 'Unassigned') : column.format ? column.format(row[column.key], row) : row[column.key] || '—'}</td>)}<td><div className="flex gap-1"><button onClick={() => setModal(row)} className="st-btn st-btn-ghost p-2" title="Edit" data-testid={`button-edit-${config.store}-${row.id}`}><Pencil size={14} /></button><button onClick={() => { if (window.confirm('Delete this record?')) remove(config.store, row.id); }} className="st-btn st-btn-ghost p-2 hover:text-[hsl(var(--destructive))]" title="Delete" data-testid={`button-delete-${config.store}-${row.id}`}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>}</div>
    {modal !== undefined && <EntryModal config={config} initial={modal} store={store} onClose={() => setModal(undefined)} onSave={submit} />}
  </div>;
}

function EntryModal({ config, initial, store, onClose, onSave }: { config: typeof pageConfigs[string]; initial: Row | null; store: Store; onClose: () => void; onSave: (row: Row) => void }) {
  const [values, setValues] = useState<Row>(() => initial ? { ...initial } : ({ id: '' } as Row));
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => { dialogRef.current?.focus(); }, []);
  const set = (name: string, value: any) => setValues((current) => ({ ...current, [name]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); const missing = config.fields.filter((field) => field.required && !String(values[field.name] ?? '').trim()); if (missing.length) { setError(`Complete: ${missing.map((field) => field.label).join(', ')}`); return; } const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, numericFields.has(key) && value !== '' ? Number(value) : value])); onSave({ ...normalized, id: initial?.id || uid() }); };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--primary)/.45)] p-0 sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div ref={dialogRef} tabIndex={-1} className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-xl bg-[hsl(var(--card))] shadow-2xl sm:rounded-xl animate-rise"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5 py-4"><div><p className="app-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--accent))]">{initial ? 'Edit record' : 'New record'}</p><h2 className="app-serif mt-1 text-xl text-[hsl(var(--primary))]">{initial ? `Edit ${config.singular}` : `Add ${config.singular}`}</h2></div><button onClick={onClose} className="st-btn st-btn-ghost p-2" data-testid="button-close-modal"><X size={18} /></button></div><form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">{config.fields.map((field) => <div key={field.name} className={field.wide ? 'sm:col-span-2' : ''}><label className="st-label" htmlFor={`field-${field.name}`}>{field.label}{field.required && <span className="ml-1 text-[hsl(var(--accent))]">*</span>}</label>{field.type === 'textarea' ? <textarea id={`field-${field.name}`} rows={3} value={values[field.name] || ''} onChange={(e) => set(field.name, e.target.value)} className="st-input resize-y" placeholder={field.placeholder} data-testid={`input-${field.name}`} /> : field.type === 'select' ? <select id={`field-${field.name}`} value={values[field.name] || ''} onChange={(e) => set(field.name, e.target.value)} className="st-input" data-testid={`select-${field.name}`}><option value="">Select {field.label.toLowerCase()}</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.type === 'location' ? <select id={`field-${field.name}`} value={values[field.name] || ''} onChange={(e) => set(field.name, e.target.value)} className="st-input" data-testid={`select-${field.name}`}><option value="">Select location</option>{store.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select> : field.type === 'unit' ? <select id={`field-${field.name}`} value={values[field.name] || ''} onChange={(e) => set(field.name, e.target.value)} className="st-input" data-testid={`select-${field.name}`}><option value="">Select unit</option>{store.units.filter((unit) => !values.locationId || unit.locationId === values.locationId).map((unit) => <option key={unit.id} value={unit.id}>{unit.unitCode}</option>)}</select> : <input id={`field-${field.name}`} type={field.type || 'text'} step={field.type === 'number' ? '0.01' : undefined} value={values[field.name] ?? ''} onChange={(e) => set(field.name, e.target.value)} className="st-input" placeholder={field.placeholder} data-testid={`input-${field.name}`} />}</div>)}{error && <p className="sm:col-span-2 rounded-md bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-sm text-[hsl(var(--destructive))]" data-testid="status-form-error">{error}</p>}<div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-4 sm:col-span-2"><button type="button" onClick={onClose} className="st-btn st-btn-ghost" data-testid="button-cancel-modal">Cancel</button><button type="submit" className="st-btn st-btn-primary" data-testid="button-save-record"><ShieldCheck size={15} /> Save record</button></div></form></div></div>;
}

function CashFlow({ store }: { store: Store }) {
  const income = store.income.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const expenses = store.expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const has = store.income.length > 0 || store.expenses.length > 0;
  return <div className="animate-rise"><PageHeader eyebrow="Money desk" title="Cash flow" description="A simple in/out view derived from the income and expense records you have saved." action={<div className="flex gap-2"><Link href="/income" className="st-btn st-btn-ghost border border-[hsl(var(--border))]" data-testid="button-cash-add-income"><ArrowDownLeft size={15} /> Income</Link><Link href="/expenses" className="st-btn st-btn-accent" data-testid="button-cash-add-expense"><ArrowUpRight size={15} /> Expense</Link></div>} />{!has ? <div className="st-card"><EmptyState icon={WalletCards} title="Add ledger entries to see flow" description="Cash flow stays intentionally blank until income or expense records exist. There are no assumed values here." /></div> : <><div className="mb-5 grid gap-3 sm:grid-cols-3"><SummaryCard label="Cash in" value={money(income)} tone="positive" /><SummaryCard label="Cash out" value={money(expenses)} tone="accent" /><SummaryCard label="Net movement" value={money(income - expenses)} /></div><div className="st-card p-5"><h2 className="font-semibold text-[hsl(var(--primary))]">Ledger composition</h2><div className="mt-5 space-y-4"><BarLine label="Income recorded" amount={income} total={Math.max(income, expenses)} tone="positive" /><BarLine label="Expenses recorded" amount={expenses} total={Math.max(income, expenses)} tone="accent" /></div></div></>}</div>;
}

function SummaryCard({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: string }) { return <div className="st-card p-5"><p className="app-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">{label}</p><p className={`mt-4 text-2xl font-semibold ${tone === 'positive' ? 'text-[hsl(145_44%_34%)]' : tone === 'accent' ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--primary))]'}`} data-testid={`text-summary-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</p></div>; }
function BarLine({ label, amount, total, tone }: { label: string; amount: number; total: number; tone: string }) { return <div><div className="mb-2 flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{money(amount)}</span></div><div className="h-2 rounded-full bg-[hsl(var(--muted))]"><div className={`h-2 rounded-full transition-all ${tone === 'positive' ? 'bg-[hsl(145_44%_43%)]' : 'bg-[hsl(var(--accent))]'}`} style={{ width: `${total ? Math.max(4, amount / total * 100) : 0}%` }} /></div></div>; }

function Profitability({ store }: { store: Store }) {
  const income = store.income.reduce((s, r) => s + Number(r.amount || 0), 0); const expenses = store.expenses.reduce((s, r) => s + Number(r.amount || 0), 0); const profit = income - expenses; const has = store.income.length > 0 || store.expenses.length > 0;
  return <div className="animate-rise"><PageHeader eyebrow="Planning desk" title="Profitability" description="Understand margin and return from recorded operating activity, without pretending an empty ledger is a result." action={<Link href="/income" className="st-btn st-btn-accent" data-testid="button-profit-add"><Plus size={16} /> Add ledger entry</Link>} />{!has ? <div className="st-card"><EmptyState icon={CircleDollarSign} title="Add data to calculate" description="Profit margin, ROI, and break-even views will appear once income and expense records are available." /></div> : <div className="grid gap-5 lg:grid-cols-4"><SummaryCard label="Recorded profit" value={money(profit)} tone={profit >= 0 ? 'positive' : 'accent'} /><SummaryCard label="Profit margin" value={income ? `${(profit / income * 100).toFixed(1)}%` : 'Add income'} /><SummaryCard label="ROI (operating proxy)" value={expenses ? `${(profit / expenses * 100).toFixed(1)}%` : 'Add expense base'} /><SummaryCard label="Break-even point" value={income ? (expenses ? `${(expenses / income * 100).toFixed(1)}% of income` : 'No expense base') : 'Add data'} /><div className="st-card p-5 lg:col-span-4"><h2 className="font-semibold text-[hsl(var(--primary))]">How this is read</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Recorded profit is income less expenses. Margin is profit as a share of recorded income. The ROI card is an operating proxy — net recorded profit divided by recorded expenses — because this first-run data model does not yet include an investment-cost field.</p></div></div>}</div>;
}

function LocationAnalysis({ store }: { store: Store }) {
  const has = store.locations.length > 0;
  return <div className="animate-rise"><PageHeader eyebrow="Portfolio lens" title="Location analysis" description="Compare what is known about each property across occupancy, income, expense, and care." action={<Link href="/locations" className="st-btn st-btn-accent" data-testid="button-analysis-locations"><Building2 size={16} /> Manage locations</Link>} />{!has ? <div className="st-card"><EmptyState icon={Building2} title="Add locations to compare performance" description="Each property becomes a comparable row once it has a location record." /></div> : <div className="st-card overflow-hidden"><div className="overflow-x-auto"><table className="st-table w-full min-w-[720px]"><thead><tr><th>Location</th><th>Units</th><th>Bookings</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead><tbody>{store.locations.map((location) => { const units = store.units.filter((r) => r.locationId === location.id).length; const bookings = store.bookings.filter((r) => r.locationId === location.id).length; const income = store.income.filter((r) => r.locationId === location.id).reduce((s, r) => s + Number(r.amount || 0), 0); const expense = store.expenses.filter((r) => r.locationId === location.id).reduce((s, r) => s + Number(r.amount || 0), 0); return <tr key={location.id} data-testid={`row-analysis-${location.id}`}><td className="font-semibold text-[hsl(var(--primary))]">{location.name}</td><td>{units || '—'}</td><td>{bookings || '—'}</td><td>{income ? money(income) : '—'}</td><td>{expense ? money(expense) : '—'}</td><td className="font-semibold">{income || expense ? money(income - expense) : 'Add ledger data'}</td></tr>; })}</tbody></table></div></div>}</div>;
}

function MonthlySummary({ store }: { store: Store }) {
  const months = Array.from(new Set([...store.income, ...store.expenses].map((r) => String(r.date || '').slice(0, 7)).filter(Boolean))).sort().reverse();
  return <div className="animate-rise"><PageHeader eyebrow="Management desk" title="Monthly summary" description="A quick management read, generated only from dated income and expense records." action={<Link href="/income" className="st-btn st-btn-accent" data-testid="button-summary-add"><Plus size={16} /> Add dated entry</Link>} />{!months.length ? <div className="st-card"><EmptyState icon={ClipboardList} title="Your first monthly summary is waiting" description="Add dated income or expense entries to generate a management-ready period view." /></div> : <div className="space-y-4">{months.map((month) => { const income = store.income.filter((r) => String(r.date).startsWith(month)).reduce((s, r) => s + Number(r.amount || 0), 0); const expenses = store.expenses.filter((r) => String(r.date).startsWith(month)).reduce((s, r) => s + Number(r.amount || 0), 0); return <div className="st-card p-5" key={month} data-testid={`card-month-${month}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="app-mono text-[10px] uppercase tracking-wider text-[hsl(var(--accent))]">Period</p><h2 className="app-serif mt-1 text-xl text-[hsl(var(--primary))]">{month}</h2></div><span className="rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-xs font-semibold">{money(income - expenses)} net</span></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><SummaryCard label="Income" value={money(income)} tone="positive" /><SummaryCard label="Expenses" value={money(expenses)} tone="accent" /><SummaryCard label="Entries" value={`${store.income.filter((r) => String(r.date).startsWith(month)).length + store.expenses.filter((r) => String(r.date).startsWith(month)).length}`} /></div></div>; })}</div>}</div>;
}

function Reports({ store }: { store: Store }) {
  const reportRef = useRef<HTMLDivElement>(null);
  const totalRecords = Object.values(store).reduce((sum, rows) => sum + rows.length, 0);
  const print = () => window.print();
  return <div className="animate-rise"><PageHeader eyebrow="Management desk" title="Reports" description="A print-friendly snapshot of the current local workspace, ready when the record is ready." action={<button onClick={print} className="st-btn st-btn-accent" data-testid="button-print-report"><FileText size={16} /> Print report</button>} /><div ref={reportRef} className="st-card p-6 sm:p-8"><div className="flex flex-col gap-4 border-b border-[hsl(var(--border))] pb-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="app-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--accent))]">StayTrack workspace report</p><h2 className="app-serif mt-2 text-2xl text-[hsl(var(--primary))]">Operating record</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</p></div><span className="app-mono text-xs text-[hsl(var(--muted-foreground))]">{totalRecords} total records</span></div>{!totalRecords ? <EmptyState icon={FileText} title="Nothing to report yet" description="This report stays empty on purpose. Add operating records, then return here to print a trustworthy snapshot." action={<Link href="/dashboard" className="st-btn st-btn-primary" data-testid="button-report-start"><LayoutDashboard size={15} /> Go to overview</Link>} /> : <div className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(store).map(([key, rows]) => <div className="rounded-lg bg-[hsl(var(--muted)/.55)] p-4" key={key}><p className="app-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{key}</p><p className="mt-3 text-2xl font-semibold text-[hsl(var(--primary))]">{rows.length}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">record{rows.length === 1 ? '' : 's'}</p></div>)}</div>}</div></div>;
}

function Settings({ store, reset }: { store: Store; reset: () => void }) {
  const [name, setName] = useState(() => localStorage.getItem('staytrack-workspace-name') || '');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveName = () => { localStorage.setItem('staytrack-workspace-name', name); setSaved(true); window.setTimeout(() => setSaved(false), 2200); };
  const download = () => { const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), store }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'staytrack-workspace.json'; anchor.click(); URL.revokeObjectURL(url); };
  const importData = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)); if (parsed.store) { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyStore, ...parsed.store })); window.location.reload(); } } catch { window.alert('That file could not be read as a StayTrack workspace export.'); } }; reader.readAsText(file); };
  const clear = () => { if (window.confirm('Reset this local workspace? This permanently removes all saved records in this browser.')) { reset(); } };
  return <div className="animate-rise"><PageHeader eyebrow="Workspace" title="Settings" description="Tune the local workspace, move your data safely, or clear it when you need a clean start." /><div className="grid max-w-4xl gap-5 lg:grid-cols-2"><section className="st-card p-5"><div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Settings2 size={17} /></span><div><h2 className="font-semibold text-[hsl(var(--primary))]">Workspace profile</h2><p className="text-xs text-[hsl(var(--muted-foreground))]">A label for this browser workspace.</p></div></div><label className="st-label" htmlFor="workspace-name">Workspace name</label><input id="workspace-name" className="st-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Riverside operations" data-testid="input-workspace-name" /><div className="mt-4 flex items-center gap-3"><button onClick={saveName} className="st-btn st-btn-primary" data-testid="button-save-settings"><ShieldCheck size={15} /> Save preferences</button>{saved && <span className="text-xs text-[hsl(145_44%_34%)]">Saved locally.</span>}</div></section><section className="st-card p-5"><div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Download size={17} /></span><div><h2 className="font-semibold text-[hsl(var(--primary))]">Data portability</h2><p className="text-xs text-[hsl(var(--muted-foreground))]">Move this workspace between browsers.</p></div></div><div className="space-y-2"><button onClick={download} className="st-btn st-btn-ghost w-full justify-start border border-[hsl(var(--border))]" data-testid="button-export-data"><Download size={15} /> Export workspace JSON</button><button onClick={() => fileRef.current?.click()} className="st-btn st-btn-ghost w-full justify-start border border-[hsl(var(--border))]" data-testid="button-import-data"><Upload size={15} /> Import workspace JSON</button><input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importData} data-testid="input-import-data" /></div></section><section className="st-card border-[hsl(var(--destructive)/.25)] p-5 lg:col-span-2"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-[hsl(var(--primary))]">Reset local workspace</h2><p className="mt-1 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Remove every stored record and return to a clean first-run state. This does not affect any server because this starter has no backend data connection.</p></div><button onClick={clear} className="st-btn st-btn-danger shrink-0" data-testid="button-reset-workspace"><RefreshCw size={15} /> Reset workspace</button></div></section></div></div>;
}

function NotFoundRoute() { return <div className="st-card mx-auto max-w-xl p-10 text-center"><Home className="mx-auto text-[hsl(var(--accent))]" size={26} /><h1 className="app-serif mt-4 text-2xl text-[hsl(var(--primary))]">This room is not on the floor plan.</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">The page you requested does not exist.</p><Link href="/dashboard" className="st-btn st-btn-primary mt-6" data-testid="link-not-found-dashboard">Return to overview</Link></div>; }

export default App;