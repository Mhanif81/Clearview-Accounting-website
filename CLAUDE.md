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
  - Scroll-reveal content (`data-reveal`) only shows once observed, so sections far down a tall capture can render blank. Capture with a shorter height or at a `#section-id` URL when a section looks empty.
- Always screenshot from localhost, never a `file:///` URL.

## Architecture of index.html
Everything lives in one file, in this order:
1. **`<head>`**: Google Fonts (Barlow Condensed for display headings, Montserrat for body), Tailwind CDN with a small `tailwind.config`, then one large `<style>` block. Most styling is hand-written CSS classes, not Tailwind utilities; Tailwind is only used for occasional one-off classes.
2. **Design tokens on `:root`**: brand palette (`--blue #115ADB`, `--navy #0C2143`, `--logo #0071BC`, `--paper`, `--ink`, …; sampled from `Website Assets/CL Brand Guideline.jpg`), spacing (`--section`, `--gutter`), a depth/shadow system, and easing curves (`--spring`, `--ease-out`). Reuse these rather than introducing new values.
3. **SVG sprite**: `<symbol>`s for the logo mark (`#mark`) and icons (`#i-*`), used via `<use href="#i-name">`.
4. **Sections** (each `<section id>` is also a nav anchor): `#home` hero (with the count-down card to the 31 January Self Assessment deadline) → `#about` → `#services` (ARIA tabs: personal / business / tax) → `#blog` → `#testimonials` (carousel) → `#contact` (form) → footer.
5. **Main `<script>`**: page-load sequence, header hide/show on scroll, mobile menu, `IntersectionObserver` reveal + count-up stats, scroll-spy for active nav, tab keyboard navigation, carousel, contact-form validation.
6. **WebGL gradient wave** (second script): a vanilla port of a GradientWave component, rendered into `#hero-wave` and sized to the hero. If WebGL is missing it falls back to the hero's CSS radial gradients. It holds a still frame until the hero entrance animations finish and pauses when off-screen.

Animation conventions: elements opt in with `data-reveal` (scroll) or `.fade-in` (on load), both staggered by an inline `style="--d:.1s"` delay. These only hide content when `<html>` has the `.js` class, and `prefers-reduced-motion` disables them. Keep that contract when adding new animated elements.

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
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use the spacing tokens, not random Tailwind steps.
- **Depth:** Surfaces should follow the base → elevated → floating layering system.
- Mobile-first responsive.

## Hard Rules
- Do not add sections, features, or content not in the reference
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color
