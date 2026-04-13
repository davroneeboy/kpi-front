---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or UI. Generates creative, polished code that avoids generic AI aesthetics — adapted for this project's stack (Next.js App Router, Tailwind v4, Geist, emerald/zinc palette).
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

## Project Stack Constraints

- **Framework**: Next.js App Router — server components by default, `"use client"` only when needed (state, effects, event handlers)
- **Styling**: Tailwind v4 — CSS-first config via `@theme` in `globals.css`, no `tailwind.config.js`. Use utility classes directly; custom tokens go in `@theme` block.
- **Fonts**: Geist Sans + Geist Mono are pre-loaded via `next/font`. Use `font-sans` / `font-mono` utilities. Do NOT import external fonts via `<link>` — add to `@theme` in globals.css if needed.
- **Palette**: Project uses emerald as primary accent (`emerald-700`, `emerald-600`), zinc for neutrals, white cards. Extend this system — don't break it with unrelated palettes unless the task is explicitly a new standalone page.
- **No animation libraries** in dependencies. CSS transitions and `animate-*` Tailwind utilities only, unless the user explicitly asks to install one.
- **Anti-copy protection**: `user-select: none` is global (see globals.css) — inputs/textareas are exempt. Don't override this.

## Design Thinking

Before coding, commit to a BOLD aesthetic direction:
- **Purpose**: What does this UI accomplish? Who uses it? (This is a KPI testing system for government agency employees)
- **Tone**: The project leans clean/institutional, but components can have character — sharp contrast, strong typography hierarchy, deliberate negative space, satisfying micro-states (hover, focus, loading, empty, error).
- **Constraints**: Tailwind v4 utilities, Geist font, emerald accent. Work within these — push them further, don't ignore them.
- **Differentiation**: What makes this component memorable? A loading skeleton with personality, an error state that's calm not alarming, a list item with a satisfying hover.

## Frontend Aesthetics Guidelines

- **Typography**: Use tight tracking for headings (`tracking-tight`), generous for labels (`tracking-[0.15em]` uppercase). Geist has good weight range — use `font-bold` for hierarchy, `font-medium` for secondary labels, `font-normal` for body. Size deliberately: don't default to `text-base` everywhere.
- **Color**: Emerald for primary actions and brand accents. Zinc scale for everything else: `zinc-900` text, `zinc-600` secondary, `zinc-400` placeholder/disabled, `zinc-100`/`zinc-200` borders and dividers, `zinc-50` subtle backgrounds. Red scale for errors, amber for warnings.
- **Motion**: CSS transitions only. `transition` + `duration-150`/`duration-200` on interactive elements. `animate-spin` for loaders. Stagger reveal with `animation-delay` inline styles for lists. No layout shifts.
- **Spatial Composition**: Cards use `rounded-2xl`, inputs `rounded-xl`. Consistent padding: `p-6`/`p-8` for cards, `px-3.5 py-2.5` for inputs. Use `space-y-*` for form stacks. Don't crowd — generous spacing signals quality.
- **Shadows**: `shadow-xl shadow-zinc-200/50` for elevated cards. `shadow-sm` for inputs. `shadow-md shadow-emerald-900/15` for primary buttons. Avoid heavy shadows that feel dated.
- **States**: Every interactive element needs all states — default, hover, focus-visible, disabled, loading. `focus-visible:outline` not `focus:ring` (unless both). Disabled: `opacity-60` + `cursor-not-allowed` + `pointer-events-none`.

## Component Patterns

```tsx
// Input field
const inputBase =
  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] text-zinc-900 shadow-sm transition outline-none placeholder:text-zinc-400 " +
  "focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/25 " +
  "disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-70";

// Primary button
const btnPrimary =
  "flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition " +
  "hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 " +
  "disabled:pointer-events-none disabled:opacity-60";

// Card
const card = "rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl shadow-zinc-200/50 sm:p-8";
```

## What to Avoid

- Generic AI aesthetics: purple gradients, rounded-lg everywhere uniformly, flat gray everything
- Importing fonts or animation libraries without explicit request
- Breaking the emerald/zinc color system for unrelated hues
- Skipping empty, loading, and error states — they must all be designed
- `any` types or untyped props
- Server components that need to be client (or vice versa)

**IMPORTANT**: Match complexity to vision. A simple list item needs careful hover/selected states and skeleton loader. A full page needs section hierarchy, responsive behavior, and all data states. Execute the vision with precision.

$ARGUMENTS
