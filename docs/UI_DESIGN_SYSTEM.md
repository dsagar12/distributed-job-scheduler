# Developer Console UI/UX Design System

This design system defines the visual hierarchy, component specifications, interaction tokens, and accessibility standards for the **Distributed Job Scheduler** developer & infrastructure console.

---

## 1. Design Philosophy & Aesthetic Direction

- **Dark-First Infrastructure Quality**: Inspired by modern developer platforms (Linear, Vercel, Datadog, Grafana, GitHub).
- **Calm, High Information Density**: Built for SREs and backend engineers requiring rapid triage, precise metrics, and non-distracting telemetry.
- **Intentional Meaning**: Color is reserved strictly for communicating operational state (e.g. green = healthy/completed, red = failed/dead, amber = retrying/degraded, indigo = active/in-flight).
- **Zero AI-Gimmicks**: No speech bubbles, no rainbow gradients, no purple/pink neon glow, no pure `#000000` pitch blacks.

---

## 2. Color Tokens

| Token Category | Color Name | Hex / Class | Semantic Meaning |
| :--- | :--- | :--- | :--- |
| **Background (Main)** | Dark Charcoal | `#0b0f17` (`bg-dark-950`) | Primary viewport background |
| **Card / Surface** | Slate 900 | `#0f172a` (`bg-dark-900`) | Elevated card panels and modal sheets |
| **Borders** | Slate 800 | `#1e293b` (`border-slate-800`) | Crisp structural separation |
| **Primary Brand** | Indigo / Blue | `#6366f1` / `#4f46e5` | Primary CTA, active navigation, focus rings |
| **Success** | Emerald | `#34d399` (`text-emerald-400`) | Completed tasks, online workers, healthy queues |
| **Warning** | Amber | `#fbbf24` (`text-amber-400`) | Queue backlog depth, retrying backoffs, draining nodes |
| **Error / Critical** | Rose / Red | `#f43f5e` (`text-rose-400`) | Failed executions, Dead Letter records, dead workers |
| **Informational** | Cyan / Sky | `#38bdf8` (`text-cyan-400`) | Queued tasks, live WebSocket connection pills |

---

## 3. Typography & Hierarchy

### Fonts
- **Primary Sans**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif` (clean, high legibility at 11px–14px).
- **Monospace Technical**: `JetBrains Mono`, `Fira Code`, `ui-monospace`, `monospace` (used for Job UUIDs, worker node IDs, cryptographic lease tokens, timestamps, and JSON payloads).

### Scale
- **Page Title**: `text-lg` (18px), `font-bold`, `text-slate-100`
- **Section / Card Header**: `text-xs` (12px), `font-semibold`, `uppercase`, `tracking-wider`, `text-slate-200`
- **Body Text**: `text-xs` (12px), `text-slate-300`, `leading-relaxed`
- **Metadata / Secondary**: `text-[11px]` (11px), `text-slate-500`
- **Monospace Value**: `text-xs` / `text-[10px]`, `font-mono`

---

## 4. Component Rules

### Status Badges (`StatusBadge.tsx`)
Compact inline dot indicators with semantic tint:
- `● COMPLETED` (`bg-emerald-500/10 text-emerald-300 border-emerald-500/20`)
- `● RUNNING` (`bg-indigo-500/10 text-indigo-300 border-indigo-500/20 animate-pulse`)
- `● CLAIMED` (`bg-sky-500/10 text-sky-300 border-sky-500/20 animate-pulse`)
- `● QUEUED` (`bg-cyan-500/10 text-cyan-300 border-cyan-500/20`)
- `● RETRYING` (`bg-amber-500/10 text-amber-300 border-amber-500/20 animate-pulse`)
- `● FAILED` (`bg-rose-500/10 text-rose-300 border-rose-500/20`)
- `● DEAD LETTER` (`bg-rose-950/50 text-rose-200 border-rose-500/30`)

### Infrastructure Data Tables
- **Header**: Monospace aligned uppercase headers with `select-none` and `border-b border-slate-800/80`.
- **Rows**: Subtle hover (`hover:bg-slate-850/40`), compact padding (`py-2.5 px-4`), aligned numerical and timestamp columns.
- **Row Actions**: Contextual quick action buttons (Inspect, Reprocess, Cancel).

### Lifecycle Graph (`JobLifecycleTimeline.tsx`)
- Visual state node graph displaying the progression from `CREATED` &rarr; `QUEUED` &rarr; `CLAIMED` &rarr; `RUNNING` &rarr; `COMPLETED` or failure retry branches `RUNNING` &rarr; `FAILED` &rarr; `RETRYING` &rarr; `DEAD_LETTER`.
- **Security Fencing**: Always masks the raw `leaseToken` to a short fingerprint (`fnc_...`).

### Skeleton Loaders (`SkeletonLoader.tsx`)
- Instant skeleton boxes during data fetching queries instead of jarring layout shifts.

### Destructive Action Dialogs (`ConfirmModal.tsx`)
- Dangerous operations (e.g. simulated worker termination, lease backdating) require explicit confirmation dialogs.

---

## 5. Microinteractions & Animation Standards

- **Transition Durations**: 100ms–200ms ease-in-out (`transition-colors`, `transition-all`).
- **Live Stream Transitions**: Subtle pulsing dot lights on active worker heartbeats and WebSocket connection pills.
- **No Distractions**: No bouncing components, no parallax scrolling, no continuous glowing halos.

---

## 6. Accessibility Decisions

- **Color Independence**: Statuses pair distinct text labels with dot indicators so color is never the sole communicator.
- **Focus Rings**: Keyboard focus visible via `focus:ring-1 focus:ring-brand-500`.
- **Contrast**: Text elements maintain minimum 4.5:1 WCAG AA contrast ratio against charcoal surfaces.
