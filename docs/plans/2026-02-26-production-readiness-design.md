# BountyView Production Readiness Design

## Product Overview

BountyView is a bounty-based technical interview platform where employers fund real interview tasks (escrowed on-chain via Base USDC) and candidates submit production-like solutions through GitHub. Two roles: employer and candidate.

## Current State

The backend is solid: 17 API routes, Zod validation, audit logging, on-chain transaction verification, 7 background worker jobs, GitHub App integration, Circle fiat withdrawals, rate limiting, security headers. CI passes with 0 errors and 0 warnings.

The gaps: the frontend is unstyled raw HTML with `alert()` modals, there's no email notification system, no proper error/loading UX, wallet/Privy integration is stubbed, and there's no deployment configuration.

## Priority Order

1. Frontend redesign
2. Email notifications
3. Error/loading UX
4. Wallet/Privy integration
5. Deployment infrastructure

---

## 1. Frontend Redesign

### Approach: Tailwind CSS + Custom Svelte Components

No component framework (shadcn-svelte, Skeleton, DaisyUI). Their default aesthetics fight the brutalist direction. Tailwind provides utility ergonomics without visual opinions. Every component is built from scratch for total control.

### Design System: "Concrete"

**Typography**
- Primary: JetBrains Mono (monospace) — headings, labels, nav, buttons
- Secondary: Inter or system sans-serif — body text, descriptions
- Scale: 12/14/16/20/24/32px. Tight. Hierarchy through weight and size only.

**Color Palette**
- Background: `#f5f2eb` (warm off-white, aged paper)
- Surface: `#ffffff` (cards, inputs)
- Ink: `#1a1a1a` (primary text)
- Muted: `#6b6b6b` (secondary text)
- Brand: `#2d5a27` (deep forest green)
- Accent: `#c45d3e` (burnt orange — CTAs, warnings)
- Danger: `#b91c1c`
- Border: `#1a1a1a` (solid black, 1-2px — the defining visual element)

**Borders & Structure**
- 1-2px solid black borders everywhere. The signature.
- No rounded corners (or max 2px). Square edges.
- No shadows. No gradients. Depth from borders and spacing.
- Generous padding inside elements, tight margins between them.

**Interactions**
- Hover: background shift, not color change
- Buttons: border thickens on hover, slight translate on active (-1px, physical press feel)
- 150ms ease transitions on everything — this is where "smooth" lives
- Focus rings: 2px offset outline in brand green

**Layout**
- Max-width: ~960px. Focused, not wide.
- CSS Grid for page layouts.
- Visible grid structure — sections delineated with borders.
- 3-4rem whitespace between sections.

### Component Library (12 components)

All in `apps/web/src/lib/components/`:

| Component | Purpose |
|-----------|---------|
| `Button.svelte` | Primary/secondary/danger/ghost. Monospace, black border, press animation. |
| `Input.svelte` | Black border, monospace label above, no floating labels. |
| `Textarea.svelte` | Same style as Input, resizable. |
| `Select.svelte` | Native `<select>` with custom border styling. |
| `Card.svelte` | Black border box. Optional header slot with divider. |
| `Badge.svelte` | Status pills (open/claimed/cancelled/expired). Monospace, bordered. |
| `Toast.svelte` | Replaces `alert()`. Top-right slide-in, auto-dismiss, bordered. |
| `Modal.svelte` | Replaces `prompt()`. Centered overlay, bordered, monospace header. |
| `Nav.svelte` | Top bar. Logo left, links right, black bottom-border. |
| `EmptyState.svelte` | "No bounties yet." Centered, muted. |
| `LoadingSpinner.svelte` | Monospace "loading..." pulse or minimal CSS spinner. |
| `FormField.svelte` | Wraps inputs with label + error message slot. |

### Page Designs

**Nav (global layout)**
- Full-width bar, 1px black bottom border
- Left: "BOUNTYVIEW" in monospace caps, letter-spaced
- Right: Bounties / Dashboard / Wallet / role badge / Sign out
- Mobile: links in a scrollable row, no hamburger

**Landing (`/`)**
- Large monospace heading, 2-line sans-serif description, single CTA
- 3-column bordered grid: Post / Build / Pay
- No images. Text and structure only. Minimal footer.

**Bounties list (`/bounties`)**
- Filter bar: level dropdown, min/max USDC, tags — single bordered row
- Vertical stack of bordered cards: title, company, level badge, amount, deadline, tags

**Bounty detail (`/bounties/[id]`)**
- Two-column desktop: left = description/deliverables, right = metadata card (amount, deadline, status)
- CTA button prominent at top-right
- Deliverables as bordered list with type badges

**Bounty creation (`/bounties/new`)**
- Single-column form, FormField components, inline validation
- Full-width submit button at bottom

**Dashboard (`/dashboard`)**
- Role at top with switch button
- Employer: bounty table with status badges + actions
- Candidate: submissions list + payouts list
- Sections separated by thick borders, no tabs

**Wallet (`/wallet`)**
- Large monospace balance at top
- Payout history rows
- Withdrawal form in a card

**Terms (`/terms`)** — Full-width text, monospace headings, accept button

**Login (`/login`)** — Centered card, "Sign in with GitHub" button

---

## 2. Email Notifications

### Approach: Resend (transactional email API)

Lightweight, good DX, free tier covers early usage. React Email for templates (works server-side with Bun).

### Notification Events

| Event | Recipient | Content |
|-------|-----------|---------|
| Bounty claimed | Employer | "{candidate} claimed your bounty {title}" |
| Submission received | Employer | "{candidate} submitted a solution for {title}" |
| Winner selected | Candidate | "You won the bounty {title}! Payout of {amount} USDC initiated." |
| Bounty cancelled | All claimants | "The bounty {title} has been cancelled." |
| Payout completed | Candidate | "Your withdrawal of {amount} has been processed." |
| Payout failed | Candidate | "Your withdrawal of {amount} failed. Please retry." |

### Implementation

- New `packages/email` package with Resend client + templates
- Worker jobs for async sending (new queue: `send_email`)
- Email preferences: users table gets `emailNotifications` boolean (default true)
- Unsubscribe link in every email

---

## 3. Error/Loading UX

### Error Pages
- Custom `+error.svelte` at root layout: 404 and 500 pages in brutalist style
- Per-page error handling with user-friendly messages

### Loading States
- `LoadingSpinner` component for async operations
- Button loading states (disabled + "loading..." text swap)
- Skeleton-free: use the LoadingSpinner, keep it simple and honest

### Toast Notifications
- Replace every `alert()` call with Toast component
- Success (green border), error (red border), info (default border)
- Auto-dismiss after 4 seconds, dismissable on click

### Form Validation
- Inline errors below fields (red text, appears on blur/submit)
- No more `alert()` for validation failures

### Modal for Confirmations
- Replace `prompt()` calls with Modal component
- Cancel bounty, enter tx hash, confirm winner selection

---

## 4. Wallet/Privy Integration

### Approach

Privy embedded wallet for Web3 interactions. Users connect or create a wallet through Privy, then fund/claim bounties directly in the app.

### Flows
- Wallet connect button in Nav (when authenticated)
- Fund bounty: in-app USDC transfer to escrow contract on Base
- Claim winnings: in-app transaction to claim from escrow
- Cancel bounty: in-app cancel transaction

### Implementation
- `@privy-io/svelte` (or vanilla JS SDK) in the web app
- Wallet address stored on user record
- Transaction signing happens client-side, verification stays server-side (existing escrow.ts)

---

## 5. Deployment Infrastructure

### Architecture

```
                    ┌─────────────┐
                    │  Fly.io /   │
                    │  Railway    │
                    ├─────────────┤
                    │ SvelteKit   │ (adapter-node)
                    │ Web App     │
                    ├─────────────┤
                    │ Worker      │ (pg-boss)
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │  Postgres   │ (Neon / Supabase / Railway)
                    └─────────────┘
```

### Deliverables
- `Dockerfile` (multi-stage: install → build → runtime)
- `fly.toml` for web + worker processes
- `/health` endpoint (returns 200 + DB connectivity check)
- `.env.example` with all required variables documented
- `docker-compose.yml` for local development (Postgres + app + worker)

---

## Success Criteria

The product is ready to ship when:
1. Every page matches the Concrete design system
2. All `alert()`/`prompt()` calls replaced with Toast/Modal
3. Email notifications fire for all 6 events
4. Wallet connect works and users can fund/claim bounties in-app
5. The app deploys via `fly deploy` with a working health check
6. CI remains green throughout
