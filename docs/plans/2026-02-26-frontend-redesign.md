# Frontend Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the BountyView frontend with the "Concrete" brutalist design system — Tailwind CSS, JetBrains Mono typography, black borders, square edges, smooth interactions — replacing all raw HTML and alert() modals.

**Architecture:** Install Tailwind CSS 4 with the SvelteKit plugin. Build 12 custom Svelte 5 components in `apps/web/src/lib/components/`. Redesign all 11 pages using those components. Replace global.css color system with Tailwind theme. No component framework (shadcn, Skeleton, etc.).

**Tech Stack:** Tailwind CSS 4, Svelte 5 (runes), SvelteKit 2, JetBrains Mono + Inter fonts

**Note:** This project has no test suite. CI runs `bun run check` (type-check). After each task, verify with `bun run check` instead of running tests. Use `bun` exclusively — never npm/npx.

---

## Task 1: Install Tailwind CSS and Configure Design Tokens

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/svelte.config.js`
- Modify: `apps/web/vite.config.ts`
- Create: `apps/web/src/app.css`
- Modify: `apps/web/src/app.html`
- Delete content from: `apps/web/src/lib/styles/global.css`

**Step 1: Install Tailwind CSS 4 + SvelteKit integration**

```bash
cd apps/web && bun add -d @tailwindcss/vite tailwindcss
```

**Step 2: Configure Vite plugin**

Modify `apps/web/vite.config.ts`:
```typescript
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()]
});
```

**Step 3: Create app.css with Tailwind imports and design tokens**

Create `apps/web/src/app.css`:
```css
@import 'tailwindcss';

@theme {
  --color-bg: #f5f2eb;
  --color-surface: #ffffff;
  --color-ink: #1a1a1a;
  --color-muted: #6b6b6b;
  --color-brand: #2d5a27;
  --color-accent: #c45d3e;
  --color-danger: #b91c1c;
  --color-border: #1a1a1a;

  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --font-sans: 'Inter', system-ui, sans-serif;
}

@layer base {
  body {
    @apply bg-bg text-ink font-sans;
  }

  * {
    @apply box-border;
  }
}
```

**Step 4: Add font links to app.html**

Modify `apps/web/src/app.html` `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

**Step 5: Update layout to import app.css instead of global.css**

Modify `apps/web/src/routes/+layout.svelte` — change the import:
```svelte
<script lang="ts">
  import '../app.css';
  // ... rest of script
</script>
```

**Step 6: Empty out global.css**

Replace `apps/web/src/lib/styles/global.css` with an empty file (or delete it). All styles now live in `app.css` + Tailwind utilities.

**Step 7: Verify**

```bash
cd /home/ywvlfy/Projects/bountyview && bun run check
```

Expected: 0 errors. The app may look unstyled — that's fine, we're rebuilding everything.

**Step 8: Commit**

```bash
git add apps/web/
git commit -m "feat: install Tailwind CSS 4 with Concrete design tokens"
```

---

## Task 2: Build Core Components — Button, Card, Badge

**Files:**
- Create: `apps/web/src/lib/components/Button.svelte`
- Create: `apps/web/src/lib/components/Card.svelte`
- Create: `apps/web/src/lib/components/Badge.svelte`

**Step 1: Create Button component**

Create `apps/web/src/lib/components/Button.svelte`:
```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    loading?: boolean;
    children: Snippet;
  }

  let { variant = 'primary', loading = false, children, ...rest }: Props = $props();

  const base = 'font-mono text-sm font-medium border-2 border-ink px-4 py-2 transition-all duration-150 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-brand text-white hover:border-4 hover:-m-[2px] active:translate-y-px',
    secondary: 'bg-surface text-ink hover:bg-bg active:translate-y-px',
    danger: 'bg-danger text-white hover:border-4 hover:-m-[2px] active:translate-y-px',
    ghost: 'border-transparent bg-transparent text-ink hover:border-ink'
  };
</script>

<button class="{base} {variants[variant]}" disabled={loading || rest.disabled} {...rest}>
  {#if loading}
    <span class="font-mono">loading...</span>
  {:else}
    {@render children()}
  {/if}
</button>
```

**Step 2: Create Card component**

Create `apps/web/src/lib/components/Card.svelte`:
```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    header?: Snippet;
    children: Snippet;
    class?: string;
  }

  let { header, children, class: className = '' }: Props = $props();
</script>

<div class="border-2 border-ink bg-surface p-6 {className}">
  {#if header}
    <div class="font-mono text-sm font-semibold uppercase tracking-wider pb-4 mb-4 border-b-2 border-ink">
      {@render header()}
    </div>
  {/if}
  {@render children()}
</div>
```

**Step 3: Create Badge component**

Create `apps/web/src/lib/components/Badge.svelte`:
```svelte
<script lang="ts">
  interface Props {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted';
    children: import('svelte').Snippet;
  }

  let { variant = 'default', children }: Props = $props();

  const variants = {
    default: 'border-ink text-ink',
    success: 'border-brand text-brand',
    warning: 'border-accent text-accent',
    danger: 'border-danger text-danger',
    muted: 'border-muted text-muted'
  };
</script>

<span class="inline-block font-mono text-xs font-medium border px-2 py-0.5 uppercase tracking-wide {variants[variant]}">
  {@render children()}
</span>
```

**Step 4: Verify**

```bash
bun run check
```

**Step 5: Commit**

```bash
git add apps/web/src/lib/components/
git commit -m "feat: add Button, Card, Badge components"
```

---

## Task 3: Build Form Components — Input, Textarea, Select, FormField

**Files:**
- Create: `apps/web/src/lib/components/Input.svelte`
- Create: `apps/web/src/lib/components/Textarea.svelte`
- Create: `apps/web/src/lib/components/Select.svelte`
- Create: `apps/web/src/lib/components/FormField.svelte`

**Step 1: Create Input component**

Create `apps/web/src/lib/components/Input.svelte`:
```svelte
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {
    label?: string;
    error?: string;
  }

  let { label, error, ...rest }: Props = $props();
</script>

<div>
  {#if label}
    <label class="block font-mono text-xs font-medium uppercase tracking-wider mb-1">{label}</label>
  {/if}
  <input
    class="w-full border-2 border-ink bg-surface px-3 py-2 font-sans text-sm outline-none transition-all duration-150 focus:ring-2 focus:ring-brand focus:ring-offset-2 {error ? 'border-danger' : ''}"
    {...rest}
  />
  {#if error}
    <p class="font-mono text-xs text-danger mt-1">{error}</p>
  {/if}
</div>
```

**Step 2: Create Textarea component**

Create `apps/web/src/lib/components/Textarea.svelte`:
```svelte
<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  interface Props extends HTMLTextareaAttributes {
    label?: string;
    error?: string;
  }

  let { label, error, ...rest }: Props = $props();
</script>

<div>
  {#if label}
    <label class="block font-mono text-xs font-medium uppercase tracking-wider mb-1">{label}</label>
  {/if}
  <textarea
    class="w-full border-2 border-ink bg-surface px-3 py-2 font-sans text-sm outline-none resize-y transition-all duration-150 focus:ring-2 focus:ring-brand focus:ring-offset-2 {error ? 'border-danger' : ''}"
    {...rest}
  ></textarea>
  {#if error}
    <p class="font-mono text-xs text-danger mt-1">{error}</p>
  {/if}
</div>
```

**Step 3: Create Select component**

Create `apps/web/src/lib/components/Select.svelte`:
```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLSelectAttributes } from 'svelte/elements';

  interface Props extends HTMLSelectAttributes {
    label?: string;
    error?: string;
    children: Snippet;
  }

  let { label, error, children, ...rest }: Props = $props();
</script>

<div>
  {#if label}
    <label class="block font-mono text-xs font-medium uppercase tracking-wider mb-1">{label}</label>
  {/if}
  <select
    class="w-full border-2 border-ink bg-surface px-3 py-2 font-sans text-sm outline-none transition-all duration-150 focus:ring-2 focus:ring-brand focus:ring-offset-2 {error ? 'border-danger' : ''}"
    {...rest}
  >
    {@render children()}
  </select>
  {#if error}
    <p class="font-mono text-xs text-danger mt-1">{error}</p>
  {/if}
</div>
```

**Step 4: Create FormField wrapper**

Create `apps/web/src/lib/components/FormField.svelte`:
```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    error?: string;
    children: Snippet;
  }

  let { label, error, children }: Props = $props();
</script>

<div class="space-y-1">
  <label class="block font-mono text-xs font-medium uppercase tracking-wider">{label}</label>
  {@render children()}
  {#if error}
    <p class="font-mono text-xs text-danger">{error}</p>
  {/if}
</div>
```

**Step 5: Verify and commit**

```bash
bun run check
git add apps/web/src/lib/components/
git commit -m "feat: add Input, Textarea, Select, FormField components"
```

---

## Task 4: Build Feedback Components — Toast, Modal, EmptyState, LoadingSpinner

**Files:**
- Create: `apps/web/src/lib/components/Toast.svelte`
- Create: `apps/web/src/lib/components/toast.ts`
- Create: `apps/web/src/lib/components/Modal.svelte`
- Create: `apps/web/src/lib/components/EmptyState.svelte`
- Create: `apps/web/src/lib/components/LoadingSpinner.svelte`

**Step 1: Create toast store**

Create `apps/web/src/lib/components/toast.ts`:
```typescript
import { writable } from 'svelte/store';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const { subscribe, update } = writable<ToastMessage[]>([]);

export const toasts = { subscribe };

export function addToast(type: ToastMessage['type'], message: string, durationMs = 4000) {
  const id = crypto.randomUUID();
  update((all) => [...all, { id, type, message }]);

  setTimeout(() => {
    dismissToast(id);
  }, durationMs);
}

export function dismissToast(id: string) {
  update((all) => all.filter((t) => t.id !== id));
}

export const toast = {
  success: (msg: string) => addToast('success', msg),
  error: (msg: string) => addToast('error', msg),
  info: (msg: string) => addToast('info', msg)
};
```

**Step 2: Create Toast component**

Create `apps/web/src/lib/components/Toast.svelte`:
```svelte
<script lang="ts">
  import { toasts, dismissToast } from './toast';

  const borderColors = {
    success: 'border-brand',
    error: 'border-danger',
    info: 'border-ink'
  };
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
  {#each $toasts as t (t.id)}
    <button
      class="border-2 bg-surface px-4 py-3 font-mono text-sm text-left transition-all duration-150 hover:opacity-80 cursor-pointer {borderColors[t.type]}"
      onclick={() => dismissToast(t.id)}
    >
      {t.message}
    </button>
  {/each}
</div>
```

**Step 3: Create Modal component**

Create `apps/web/src/lib/components/Modal.svelte`:
```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from './Button.svelte';

  interface Props {
    open: boolean;
    title: string;
    children: Snippet;
    actions?: Snippet;
    onclose: () => void;
  }

  let { open, title, children, actions, onclose }: Props = $props();
</script>

{#if open}
  <div class="fixed inset-0 z-40 bg-ink/40 flex items-center justify-center p-4" role="dialog">
    <div class="border-2 border-ink bg-surface w-full max-w-md">
      <div class="flex items-center justify-between border-b-2 border-ink px-6 py-4">
        <h2 class="font-mono text-sm font-semibold uppercase tracking-wider">{title}</h2>
        <Button variant="ghost" onclick={onclose}>✕</Button>
      </div>
      <div class="px-6 py-4">
        {@render children()}
      </div>
      {#if actions}
        <div class="flex justify-end gap-2 border-t-2 border-ink px-6 py-4">
          {@render actions()}
        </div>
      {/if}
    </div>
  </div>
{/if}
```

**Step 4: Create EmptyState component**

Create `apps/web/src/lib/components/EmptyState.svelte`:
```svelte
<script lang="ts">
  interface Props {
    message: string;
  }

  let { message }: Props = $props();
</script>

<div class="py-12 text-center">
  <p class="font-mono text-sm text-muted">{message}</p>
</div>
```

**Step 5: Create LoadingSpinner component**

Create `apps/web/src/lib/components/LoadingSpinner.svelte`:
```svelte
<div class="py-12 text-center">
  <span class="font-mono text-sm text-muted animate-pulse">loading...</span>
</div>
```

**Step 6: Verify and commit**

```bash
bun run check
git add apps/web/src/lib/components/
git commit -m "feat: add Toast, Modal, EmptyState, LoadingSpinner components"
```

---

## Task 5: Build Nav Component and Root Layout

**Files:**
- Create: `apps/web/src/lib/components/Nav.svelte`
- Modify: `apps/web/src/routes/+layout.svelte`
- Create: `apps/web/src/lib/components/index.ts`

**Step 1: Create barrel export**

Create `apps/web/src/lib/components/index.ts`:
```typescript
export { default as Button } from './Button.svelte';
export { default as Card } from './Card.svelte';
export { default as Badge } from './Badge.svelte';
export { default as Input } from './Input.svelte';
export { default as Textarea } from './Textarea.svelte';
export { default as Select } from './Select.svelte';
export { default as FormField } from './FormField.svelte';
export { default as Toast } from './Toast.svelte';
export { default as Modal } from './Modal.svelte';
export { default as EmptyState } from './EmptyState.svelte';
export { default as LoadingSpinner } from './LoadingSpinner.svelte';
export { default as Nav } from './Nav.svelte';
export { toast } from './toast';
```

**Step 2: Create Nav component**

Create `apps/web/src/lib/components/Nav.svelte`:
```svelte
<script lang="ts">
  import Badge from './Badge.svelte';
  import type { AuthUser } from '@bountyview/shared';

  interface Props {
    user: AuthUser | null;
    session: { user?: unknown } | null;
  }

  let { user, session }: Props = $props();
</script>

<nav class="border-b-2 border-ink bg-surface">
  <div class="max-w-[960px] mx-auto px-4 py-3 flex items-center justify-between">
    <a href="/" class="font-mono text-base font-bold tracking-[0.2em] uppercase text-ink no-underline">
      BountyView
    </a>
    <div class="flex items-center gap-4 font-mono text-sm overflow-x-auto">
      <a href="/bounties" class="text-ink no-underline hover:text-brand transition-colors duration-150">Bounties</a>
      {#if user?.role === 'employer'}
        <a href="/bounties/new" class="text-ink no-underline hover:text-brand transition-colors duration-150">Post</a>
        <a href="/templates" class="text-ink no-underline hover:text-brand transition-colors duration-150">Templates</a>
      {/if}
      {#if session}
        <a href="/dashboard" class="text-ink no-underline hover:text-brand transition-colors duration-150">Dashboard</a>
        <a href="/wallet" class="text-ink no-underline hover:text-brand transition-colors duration-150">Wallet</a>
        {#if user}
          <Badge variant={user.role === 'employer' ? 'success' : 'default'}>{user.role}</Badge>
        {/if}
        <form action="/signout" method="post" class="inline">
          <button class="font-mono text-sm text-muted hover:text-ink bg-transparent border-none cursor-pointer transition-colors duration-150">Sign out</button>
        </form>
      {:else}
        <a href="/login" class="text-ink no-underline hover:text-brand transition-colors duration-150">Log in</a>
      {/if}
    </div>
  </div>
</nav>
```

**Step 3: Rebuild root layout**

Rewrite `apps/web/src/routes/+layout.svelte`:
```svelte
<script lang="ts">
  import '../app.css';
  import { Nav, Toast } from '$lib/components';

  const { children, data } = $props();
</script>

<Nav user={data.currentUser} session={data.session} />

<main class="max-w-[960px] mx-auto px-4 py-8">
  {@render children()}
</main>

<Toast />
```

**Step 4: Verify and commit**

```bash
bun run check
git add apps/web/src/lib/components/ apps/web/src/routes/+layout.svelte
git commit -m "feat: add Nav component and rebuild root layout"
```

---

## Task 6: Redesign Landing Page

**Files:**
- Modify: `apps/web/src/routes/+page.svelte`

**Step 1: Rewrite landing page**

Rewrite `apps/web/src/routes/+page.svelte`:
```svelte
<script lang="ts">
  import { Button, Card } from '$lib/components';
</script>

<div class="space-y-16 py-8">
  <section class="space-y-6">
    <h1 class="font-mono text-3xl font-bold leading-tight">
      Replace technical interviews<br />with paid real work.
    </h1>
    <p class="text-muted max-w-lg">
      Employers fund bounties. Candidates build real solutions. Escrow ensures everyone gets paid fairly.
    </p>
    <div class="flex gap-3">
      <a href="/bounties"><Button>Browse bounties</Button></a>
      <a href="/bounties/new"><Button variant="secondary">Post a bounty</Button></a>
    </div>
  </section>

  <section class="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-ink">
    <div class="p-6 md:border-r-2 border-ink border-b-2 md:border-b-0">
      <h3 class="font-mono text-sm font-semibold uppercase tracking-wider mb-2">Post</h3>
      <p class="text-sm text-muted">Employers create bounties with USDC escrow. Real tasks, real stakes.</p>
    </div>
    <div class="p-6 md:border-r-2 border-ink border-b-2 md:border-b-0">
      <h3 class="font-mono text-sm font-semibold uppercase tracking-wider mb-2">Build</h3>
      <p class="text-sm text-muted">Candidates claim bounties and submit production-quality work via GitHub.</p>
    </div>
    <div class="p-6">
      <h3 class="font-mono text-sm font-semibold uppercase tracking-wider mb-2">Pay</h3>
      <p class="text-sm text-muted">Winner gets paid. On-chain escrow. No games, no ghosting.</p>
    </div>
  </section>
</div>
```

**Step 2: Verify and commit**

```bash
bun run check
git add apps/web/src/routes/+page.svelte
git commit -m "feat: redesign landing page with Concrete design system"
```

---

## Task 7: Redesign Login and Terms Pages

**Files:**
- Modify: `apps/web/src/routes/login/+page.svelte`
- Modify: `apps/web/src/routes/terms/+page.svelte`

**Step 1: Rewrite login page**

Rewrite `apps/web/src/routes/login/+page.svelte`:
```svelte
<script lang="ts">
  import { Button, Card } from '$lib/components';
</script>

<div class="max-w-md mx-auto py-16">
  <Card>
    {#snippet header()}Sign in{/snippet}
    <p class="text-sm text-muted mb-6">
      Use your GitHub account to access employer or candidate workflows.
      By continuing, you agree to the <a href="/terms" class="text-brand underline">Terms of Use</a>.
    </p>
    <form method="POST">
      <input type="hidden" name="providerId" value="github" />
      <Button type="submit" class="w-full">Continue with GitHub</Button>
    </form>
  </Card>
</div>
```

**Step 2: Rewrite terms page**

Rewrite `apps/web/src/routes/terms/+page.svelte`. Keep the existing legal content but restyle it using Tailwind. Use `font-mono` headings, `font-sans` body text, and a bordered container. Keep the accept button logic with `goto('/dashboard')` and the `toast` import for feedback instead of `alert()`.

Key structure:
```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button, Card, toast } from '$lib/components';

  const { data } = $props();

  async function acceptTerms() {
    try {
      const res = await fetch('/api/session/terms/accept', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? 'Failed to accept terms');
        return;
      }
      toast.success('Terms accepted');
      await goto('/dashboard');
    } catch {
      toast.error('Something went wrong');
    }
  }
</script>

<div class="max-w-2xl mx-auto space-y-8 py-8">
  <h1 class="font-mono text-2xl font-bold">Terms of Use</h1>

  <!-- Keep all existing terms sections, restyled with:
       - h2: font-mono text-lg font-semibold
       - p/li: text-sm text-muted leading-relaxed
       - sections separated with border-t-2 border-ink pt-6 -->

  {#if data.isAuthenticated}
    <div class="border-t-2 border-ink pt-6">
      <Button onclick={acceptTerms}>Accept Terms</Button>
    </div>
  {/if}
</div>
```

Preserve the exact legal text from the current terms page. Only change styling.

**Step 3: Verify and commit**

```bash
bun run check
git add apps/web/src/routes/login/ apps/web/src/routes/terms/
git commit -m "feat: redesign login and terms pages"
```

---

## Task 8: Redesign Bounties List Page

**Files:**
- Modify: `apps/web/src/routes/bounties/+page.svelte`

**Step 1: Rewrite bounties list**

Redesign with:
- Filter bar: horizontal bordered row with Input/Select components for level, min/max USDC, tags
- Bounty cards: vertical stack, each a bordered card showing title, company, level Badge, amount in monospace, deadline, tags as Badges
- Keep existing data fetching via `data.bounties` and `data.filters`
- Use the existing filter form pattern (GET request with query params) but styled with Tailwind

Key elements:
```svelte
<script lang="ts">
  import { Card, Badge, Input, Select, Button, EmptyState } from '$lib/components';

  const { data } = $props();
</script>
```

- Filter bar in a 2-border Card at top
- Each bounty as a bordered div with grid layout: title+company left, amount+deadline right
- Level shown as Badge, tags as small Badges
- Amount displayed in `font-mono text-lg font-bold`
- Deadline formatted as human-readable date

**Step 2: Verify and commit**

```bash
bun run check
git add apps/web/src/routes/bounties/+page.svelte
git commit -m "feat: redesign bounties list page"
```

---

## Task 9: Redesign Bounty Detail Page

**Files:**
- Modify: `apps/web/src/routes/bounties/[id]/+page.svelte`

**Step 1: Rewrite bounty detail**

Two-column layout on desktop:
- Left column (2/3): task description, deliverables list (bordered rows with type Badge), what happens after
- Right column (1/3): metadata Card with amount (large monospace), deadline, status Badge, role level Badge, company name, employer name
- CTA buttons (Claim / Submit) at top of right column
- Replace `alert()` with `toast` for claim feedback
- Keep `claimBounty()` logic, just restyle

```svelte
<script lang="ts">
  import { Card, Badge, Button, toast } from '$lib/components';

  const { data } = $props();
  const bounty = $derived(data.bounty);

  // ... keep existing claimBounty function but use toast instead of alert
</script>
```

**Step 2: Verify and commit**

```bash
bun run check
git add apps/web/src/routes/bounties/[id]/+page.svelte
git commit -m "feat: redesign bounty detail page"
```

---

## Task 10: Redesign Bounty Creation Page

**Files:**
- Modify: `apps/web/src/routes/bounties/new/+page.svelte`

**Step 1: Rewrite bounty creation form**

Single-column form using FormField, Input, Textarea, Select components:
- Each field wrapped in FormField with monospace label
- Inline validation errors instead of alert()
- Template selection as a bordered list (if templates exist)
- Tech stack tags as comma-separated Input
- Full-width submit Button at bottom
- Replace `alert()` with `toast` for feedback
- Keep the existing `$state()` for `feedback`

The form should POST to `/api/bounties` and redirect on success using `goto()`.

**Step 2: Verify and commit**

```bash
bun run check
git add apps/web/src/routes/bounties/new/+page.svelte
git commit -m "feat: redesign bounty creation page"
```

---

## Task 11: Redesign Submission Pages (Submit + Review)

**Files:**
- Modify: `apps/web/src/routes/bounties/[id]/submit/+page.svelte`
- Modify: `apps/web/src/routes/bounties/[id]/submissions/+page.svelte`

**Step 1: Rewrite candidate submit page**

Simple form with:
- Card header showing bounty title
- Input for Repository URL, Input for Pull Request URL
- Textarea for custom deliverables
- Submit Button
- Replace `alert()` with `toast`

**Step 2: Rewrite employer submissions review page**

- List of submission Cards, each showing:
  - Candidate GitHub username (monospace)
  - Repo link, PR link
  - Submitted date
  - Review status Badge
  - "Select Winner" Button (or "Winner" Badge if already selected)
- Replace `alert()` and `prompt()` with Modal + toast for winner selection (prompt for wallet address and tx hash)

**Step 3: Verify and commit**

```bash
bun run check
git add apps/web/src/routes/bounties/[id]/submit/ apps/web/src/routes/bounties/[id]/submissions/
git commit -m "feat: redesign submit and submissions review pages"
```

---

## Task 12: Redesign Dashboard Page

**Files:**
- Modify: `apps/web/src/routes/dashboard/+page.svelte`

**Step 1: Rewrite dashboard**

This is the largest page (190 lines). Redesign both employer and candidate views:

**Employer view:**
- Role indicator + switch Button at top
- "Your Bounties" section: bordered table/list rows, each with title link, status Badge, "Review" link, "Fund" and "Cancel" Buttons
- "Block Candidate" section: Card with Input fields + submit Button
- "Blocked Candidates" section: bordered list with unblock Buttons

**Candidate view:**
- Role indicator + switch Button
- "Your Submissions" section: bordered rows with bounty title, PR link, review status Badge, winner indicator
- "Your Payouts" section: bordered rows with amount (monospace), status Badge, provider

Replace ALL `alert()` with `toast` and ALL `prompt()` with Modal.

Key modals needed:
- Fund bounty modal: Input for transaction hash
- Cancel bounty modal: shows submission count, Input for rejection reason, Input for tx hash

Keep the `?? []` fallback patterns for data properties.

**Step 2: Verify and commit**

```bash
bun run check
git add apps/web/src/routes/dashboard/
git commit -m "feat: redesign dashboard page with modals and toasts"
```

---

## Task 13: Redesign Wallet and Templates Pages

**Files:**
- Modify: `apps/web/src/routes/wallet/+page.svelte`
- Modify: `apps/web/src/routes/templates/+page.svelte`

**Step 1: Rewrite wallet page**

- Balance display section (if balance data becomes available — for now, just the withdrawal form and history)
- Withdrawal form in a Card: Input for amount, bank account ID, currency Select
- Payout history: bordered rows with amount (monospace), status Badge, provider, external ref
- Replace `alert()` with `toast`

**Step 2: Rewrite templates page**

- Grid of template Cards
- Each card: title (monospace heading), description, role level Badge, tags as small Badges
- EmptyState if no templates

**Step 3: Verify and commit**

```bash
bun run check
git add apps/web/src/routes/wallet/ apps/web/src/routes/templates/
git commit -m "feat: redesign wallet and templates pages"
```

---

## Task 14: Add Error Page and Final Polish

**Files:**
- Create: `apps/web/src/routes/+error.svelte`
- Modify: `apps/web/src/app.html` (add favicon, meta tags)

**Step 1: Create error page**

Create `apps/web/src/routes/+error.svelte`:
```svelte
<script lang="ts">
  import { page } from '$app/state';
  import { Button } from '$lib/components';
</script>

<div class="max-w-md mx-auto py-24 text-center space-y-6">
  <h1 class="font-mono text-6xl font-bold">{page.status}</h1>
  <p class="font-mono text-sm text-muted">{page.error?.message ?? 'Something went wrong'}</p>
  <a href="/"><Button variant="secondary">Back to home</Button></a>
</div>
```

**Step 2: Update app.html**

Add to `<head>`:
```html
<meta name="theme-color" content="#f5f2eb" />
<meta name="description" content="Replace technical interviews with paid real work." />
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>◼</text></svg>" />
```

**Step 3: Final verification**

```bash
bun run check
```

Expected: 0 errors, 0 warnings across all 4 packages.

**Step 4: Commit**

```bash
git add apps/web/src/routes/+error.svelte apps/web/src/app.html
git commit -m "feat: add error page and meta tags"
```

---

## Task 15: Visual Review and Iteration

**This is a manual step.** After all tasks are complete:

1. Run `bun run dev` and visually review every page
2. Check typography consistency (mono for labels/headings, sans for body)
3. Check border consistency (2px ink everywhere)
4. Check spacing consistency (generous padding, tight margins)
5. Check mobile responsiveness at 375px, 768px, 1024px
6. Fix any visual issues found

This task produces no specific code — it's a review checkpoint.

```bash
git add -A
git commit -m "fix: visual polish and consistency pass"
```
