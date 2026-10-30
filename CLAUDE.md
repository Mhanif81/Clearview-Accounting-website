# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Marketing site for ClearView Accounting (Luton, UK). No build step, no package.json, no tests: the whole site is `index.html` plus the images in `Website Assets/`.

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Commands
- Dev server: `node serve.mjs` → `http://localhost:3000` (honours `PORT`). Run it in the background; if it's already running, don't start a second one.
- Screenshot: `node screenshot.mjs <url> [label] [width] [height]` (defaults: `http://localhost:3000`, no label, 1440 × 7000 for a full-page capture).
  - Mobile check: `node screenshot.mjs http://localhost:3000 mobile 500 1000`
  - It drives **headless Microsoft Edge** (`--screenshot`), not Puppeteer. Override the binary with `BROWSER_PATH`. Each capture can take up to 60s, and occasionally times out; just retry.
  - Output goes to `temporary screenshots/screenshot-N[-label].png` (auto-incremented, never overwritten). Read the PNG with the Read tool to inspect it.
  - Edge captures after `--virtual-time-budget=4000`, i.e. roughly 4s after load. There is no pointer, so hover/pointer effects never show.
  - Scroll-reveal content (`data-reveal`) only shows once observed, so sections down the page often render blank, and short captures at a `#section-id` URL can come out entirely blank. Reliable workaround: write a throwaway `_preview.html` copy of `index.html` with a style injected before `</head>` (e.g. `.js [data-reveal]{opacity:1!important;transform:none!important}`), capture it at full height, then delete it. The same trick freezes an animation at a given frame (`animation-delay:-Xs; animation-play-state:paused`) or injects a script to simulate pointer moves.
- Always screenshot from localhost, never a `file:///` URL.
- Scroll behaviour can't be tested with synthetic `WheelEvent`s (they never scroll the page). For real input, launch headless Edge with `--remote-debugging-port` and drive it over CDP from Node (Node 24 has a global `WebSocket`): `Input.dispatchMouseEvent` with `type: 'mouseWheel'`, then read `scrollY` via `Runtime.evaluate`. Use a fresh port and `--user-data-dir` per run and close with `Browser.close`, or a stale browser gets reused and skews results.

## Architecture of index.html
Everything lives in one file, in this order:
1. **`<head>`**: Google Fonts (Barlow Condensed for display headings, Montserrat for body), Tailwind CDN with a small `tailwind.config`, then one large `<style>` block. Most styling is hand-written CSS classes, not Tailwind utilities; Tailwind is only used for occasional one-off classes.
2. **Design tokens on `:root`**: brand palette (`--blue #115ADB`, `--navy #0C2143`, `--logo #0071BC`, `--paper`, `--ink`, …; sampled from `Website Assets/CL Brand Guideline.jpg`), spacing (`--section`, `--gutter`), a depth/shadow system, and easing curves (`--spring`, `--ease-out`). Reuse these rather than introducing new values.
3. **SVG sprite**: `<symbol>`s for the logo mark (`#mark`) and icons (`#i-*`), used via `<use href="#i-name">`.
4. **Sections** (each `<section id>` is also a nav anchor): `#home` hero (count-down card to the 31 January Self Assessment deadline; the "Book a free consultation" CTA has a `.btn-glow` pulse every 5s) → services marquee strip → `#about` (photo card using `Website Assets/About bg.jpg`, timeline, count-up stats) → `#services` (`.grid-pulse` canvas background behind the heading, then ARIA tabs: personal / business / tax; each tab's intro card is one of the `[data-deck]` stacks of `.deck-card`s that rotate every 7s, with even cards in a deeper blue tone; a `.stack` strip of partner/software logos from `Website Assets/logos/` closes the section) → `#blog` → `#testimonials` (carousel) → `#contact` (form) → footer.
5. **Main `<script>`**: shared `$`/`$$` helpers and a `reduce` (reduced-motion) flag, page-load sequence, header hide/show on scroll plus parallax (`data-parallax`) and the timeline fill, the services grid pulse, mobile menu, `IntersectionObserver` reveal + count-up stats, scroll-spy for active nav, tab keyboard navigation, carousel, contact-form validation.
   - The grid pulse is a vanilla port of a React `GridPulse` component: a hairline grid whose cells light in brand blues where the pointer passes. Its height is set from JS (`--gp-h`) so it ends just above the tabs, and cells behind elements marked `data-grid-avoid` go faint.
6. **Hero skyline video** (`.hero-video`, `Website Assets/hero-video.mp4`, muted; no autoplay: it advances at 5x speed only while the page is scrolling (about 2s of scrolling to reach the end), plays through once and holds on its last frame. When the page opens at the top, wheel/touch/scroll-key input is intercepted (no `overflow: hidden`) and drives the video until it ends; the URL hash `''`/`#home`/`#top`/`#main` and reloads start locked at the top (`history.scrollRestoration = 'manual'`); deep links to other sections, in-page link clicks, scrollbar drags, video errors and reduced motion skip or release the lock. The MP4 has a single keyframe, so seeking/scrubbing it is slow): positioned from JS (`--hv-top` / `--hv-h`) to run from below the fixed header to just above `.hero-proof`. It gets a saturation/contrast boost, a light brand-blue multiply tint and a paper wash on the text side, fades in after the entrance animations, pauses off screen, and stays a still frame for reduced motion. Behind it, the hero's CSS radial gradients still show. (This replaced an earlier WebGL gradient wave.)

Animation conventions: elements opt in with `data-reveal` (scroll) or `.fade-in` (on load), both staggered by an inline `style="--d:.1s"` delay. These only hide content when `<html>` has the `.js` class, and `prefers-reduced-motion` disables them. Keep that contract when adding new animated elements; new CSS keyframe animations also need an `animation: none` entry in the `prefers-reduced-motion` block.

Third-party components (React/shadcn/TypeScript snippets) are not installed as-is: there is no React toolchain. Port them to vanilla JS/CSS inside `index.html` (as with the grid pulse), and swap their colours for the brand tokens.

The contact form only validates on the client side; it has no backend yet and needs one before launch.

## Files and repo
- `Website Assets/`: the real logo, favicon, webclip and brand guideline. Use these, never placeholders, and use the guideline's exact colours. `Design Brief for website.docx` holds the client's content requirements; it is gitignored and must stay out of the public repo.
- `archive/`: dated snapshots of earlier homepage designs (`index-YYYY-MM-DD-<name>.html`). Before a major redesign, copy the current `index.html` here first. Gitignored.
- GitHub: `Mhanif81/Clearview-Accounting-website` (public, branch `main`). The `temporary screenshots/` folder is gitignored too.

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so.
- When comparing, be specific ("heading is 32px but reference shows ~24px"). Check spacing, font size/weight/line-height, exact hex colours, alignment, border-radius, shadows, image sizing.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Derive from the brand tokens.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Tight tracking (`-0.03em`) on large headings, line-height `1.7` on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter (the `.grain` class) for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
- **Images:** Add a gradient overlay from the bottom and a color treatment layer with `mix-blend-multiply` (see `.photo .tint` / `.photo .shade`, which use a navy fade rather than black).
- **Spacing:** Use the spacing tokens, not random Tailwind steps.
- **Depth:** Surfaces should follow the base → elevated → floating layering system.
- Mobile-first responsive.

## Hard Rules
- Do not add sections, features, or content not in the reference
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color
