# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Marketing site for ClearView Accounting (Luton, UK). No build step, no package.json, no tests: the whole site is `index.html` plus the images and videos in `Website Assets/`. `serve.mjs` and `screenshot.mjs` are local dev tools only.

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Commands
- Dev server: `node serve.mjs` → `http://localhost:3000` (honours `PORT`). Run it in the background; if it's already running, don't start a second one. It serves `.mp4` as `video/mp4` with HTTP Range (206) support, which the hero videos need.
- Screenshot: `node screenshot.mjs <url> [label] [width] [height]` (defaults: `http://localhost:3000`, no label, 1440 × 7000 for a full-page capture).
  - Mobile check: `node screenshot.mjs http://localhost:3000 mobile 500 1000`. Use a width of at least 500; Edge clips anything narrower.
  - It drives **headless Microsoft Edge** (`--screenshot`), not Puppeteer. Override the binary with `BROWSER_PATH`. Each capture can take up to 60s, and occasionally times out; just retry.
  - Every capture reuses one profile, `%TEMP%\clearview-edge-shot`. If captures keep timing out, a stuck capture is holding it: stop only the `msedge.exe` processes whose command line contains `clearview-edge-shot` (never all Edge processes, which would close the user's browser), then retry.
  - Output goes to `temporary screenshots/screenshot-N[-label].png` (auto-incremented, never overwritten). Read the PNG with the Read tool to inspect it.
  - Edge captures after `--virtual-time-budget=4000`, i.e. roughly 4s after load, so transitions are often frozen part-way (half-drawn ticks, half-faded slides); that isn't a bug. There is no pointer, so hover/pointer effects never show.
  - Scroll-reveal content (`data-reveal`) only shows once observed, so sections down the page often render blank, and short captures at a `#section-id` URL can come out entirely blank. Reliable workaround: write a throwaway `_preview.html` copy of `index.html` with a style injected before `</head>` (e.g. `.js [data-reveal]{opacity:1!important;transform:none!important}`), capture it at full height, then delete it. The same trick freezes an animation at a given frame (`animation-delay:-Xs; animation-play-state:paused`), injects a script to simulate pointer moves, or shows a given hero slide (inject a `load` listener that clicks `[data-hs=next]` / `[data-hs=prev]` n times).
- Always screenshot from localhost, never a `file:///` URL.
- To test real behaviour (timings, scrolling, video playback), launch headless Edge with `--remote-debugging-port` and drive it over CDP from Node (Node 24 has a global `WebSocket`): read state with `Runtime.evaluate`, scroll with `Input.dispatchMouseEvent` (`type: 'mouseWheel'`; synthetic `WheelEvent`s never scroll the page). Add `--autoplay-policy=no-user-gesture-required` for video tests. Use a fresh port and `--user-data-dir` per run and close with `Browser.close`, or a stale browser gets reused and skews results.
- Media: ffmpeg 9 is installed via winget at `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin` (shells started before the install may not have it on PATH; call it by full path). Hero videos are capped at 12s and were trimmed **losslessly** (`-c copy`, video stream only, `-movflags +faststart`), verified frame-for-frame with `framemd5`; re-encoding these already-compressed sources with x264 lowered quality (VMAF 94–98) without saving space. Keep new videos to 12s the same way. Originals are in `archive/videos-original-2026-11-07/`. Python has OpenCV (`cv2`, frame grabs for posters) and PIL (resizing, progressive JPEG). Hero photos are 2200px wide, progressive JPEG quality 78–82, under 600 KB.

## Architecture of index.html
Everything lives in one file, in this order:
1. **`<head>`**: Google Fonts (Barlow Condensed for display headings, Montserrat for body), Tailwind CDN with a small `tailwind.config`, then one large `<style>` block. Most styling is hand-written CSS classes, not Tailwind utilities; Tailwind is only used for occasional one-off classes.
2. **Design tokens on `:root`**: brand palette (`--blue #115ADB`, `--navy #0C2143`, `--logo #0071BC`, `--paper`, `--ink`, …; sampled from `Website Assets/CL Brand Guideline.jpg`), spacing (`--s1`…`--s7`, `--section`, `--gutter`), `--header-h` (the fixed bar's height, which everything that clears the bar uses), a depth/shadow system, and easing curves (`--spring`, `--ease-out`). Reuse these rather than introducing new values.
3. **SVG sprite**: `<symbol>`s for the logo mark (`#mark`, still used by the marquee, blog covers and contact background) and icons (`#i-*`), used via `<use href="#i-name">`.
4. **Sections** (each `<section id>` is also a nav anchor): `#home` hero (see below) → services marquee strip → `#about` (photo card using `Website Assets/About bg.jpg`, timeline, count-up stats) → `#services` (`.grid-pulse` canvas background behind the heading, then ARIA tabs: personal / business / tax; each tab's intro card is one of the `[data-deck]` stacks of `.deck-card`s that rotate every 7s (after a deck's last card the next tab opens, Personal → Business → Tax → Personal; the audience chips are buttons that bring their card to the front), in three brand tones (navy → deep navy-blue → `--blue-deep`); hidden cards wait tucked at `translateY(-36px) scale(.9)` and fade out in 0.3s so a leaving card never passes over the tabs; a `.stack` strip of partner/software logos from `Website Assets/logos/` closes the section) → `#blog` → `#testimonials` (carousel) → `#contact` (form) → footer.
5. **Main `<script>`**: shared `$`/`$$` helpers and a `reduce` (reduced-motion) flag, page-load sequence, hero card wheel, hero slideshow, header (solid dark grey `#26282C` bar, white links, white logo `Website Assets/ClearView-Logo-White-nav.png`; always visible, no scroll state; `.on-dark` gives white focus outlines; the mobile menu panel stays light) plus parallax (`data-parallax`) and the timeline fill, the services grid pulse, mobile menu, `IntersectionObserver` reveal + count-up stats, scroll-spy for active nav, tab keyboard navigation, carousel, contact-form validation.
   - The grid pulse is a vanilla port of a React `GridPulse` component: a hairline grid whose cells light in brand blues where the pointer passes. Its height is set from JS (`--gp-h`) so it ends just above the tabs, and cells behind elements marked `data-grid-avoid` go faint.

### Hero (`#home`)
- **Slideshow** (`.hero-slides`, left column): 8 slides rotating every 8s (`DUR`), with prev/next/play-pause `.hero-ctrl` buttons and a segmented `.hero-meter`. Slide 1 is the practice intro (the page's only `h1`), slides 2–5 are insights (`h2`), slides 6–8 are `h2` copies of the intro. It waits while the hero is off screen or the tab is hidden, and starts paused for reduced motion. `go()` dispatches a `heroslide` event on `document` with the slide index (0–7).
- **"Your Year, Ticked Off" card** (right column, drawn at `scale: .95`): the four filings tick in on load. JS then turns the list into a looping wheel (`.tick-wheel`) with one item per slide, in slide order: a "ClearView" item ("Expert Accounting Solutions", hidden just above VAT return on load), the four filings, then three more ClearView copies for slides 6–8, all cloned above and below so it can loop. On each `heroslide` it spins the shortest way to put that slide's item under the blue `.tick-sel` selector, then swaps the card heading to the item's name. The card ends with the count-down to the 31 January Self Assessment deadline. The hero tint's `--fade-start` is measured from this card (accounting for its scale).
- **Backgrounds**: a base `.hero-photo` layer (showing the skyline `london_skyline_4k_16x9.jpg` on mobile only; desktop never downloads it, as the video layers cover it) with one layer per slide over it (`[data-hs-photo="<slide index>"]`, classes `--intro/--mtd/--cloud/--auto/--plan/--landscape/--cargo/--lights`). Every layer gets a blue multiply tint (`::before`) and an even navy shade plus a fade to black (`::after`).
  - **Desktop**: each layer holds a muted, looping `<video>` (`preload="none"`) whose first frame, saved as `<name>-poster.jpg`, is both its `poster` and the layer's CSS background. After page load the videos download one after another in slide order (slide 1's plays as soon as it can). Each restarts from 0 when its slide comes in and keeps playing until the next slide has faded in (paused 1.3s later). The pause button pauses the videos too and play resumes the current one; a slide that comes in while paused waits on its first frame. Reduced motion shows posters only.

    | Slide | Video | Mobile photo |
    |---|---|---|
    | 1 | `hero-city-blocks.mp4` | skyline |
    | 2 | `hero-mountain-climb.mp4` | `hero-ships.jpg` |
    | 3 | `hero-ships.mp4` | `hero-numbers.jpg` |
    | 4 | `hero-tractor.mp4` | `hero-advice.jpg` |
    | 5 | `hero-walk.mp4` | `hero-plan.jpg` |
    | 6–8 | `hero-landscape.mp4`, `hero-cargo.mp4`, `hero-city-lights.mp4` | skyline |
  - **Mobile (below 768px)**: no video is ever downloaded or played (`mobileMQ` / `noVideo()` in JS, `video { display: none }` in CSS); each layer shows the photo above, in a 580px-tall band that fades into black. Hero copy and controls are centred.
  - **Hand-off**: the outgoing layer is held fully visible with `.is-prev` while the incoming one fades in only after its `photoReady` promise (its background image decoded) resolves; `.is-prev` clears after 1.3s. This stops the skyline flashing between slides.
- **Changing the number of slides** touches all of these together: the `.hero-slide` markup and its `aria-label="n of N"`, a `.hero-photo` layer with the next `data-hs-photo` index, its desktop poster rule and its mobile photo rule (inside the `max-width: 767px` block), one `<i><b></b></i>` per slide in `.hero-meter`, and one wheel item per slide in the card (the wheel maps slide index straight to item index, so their counts and order must match; its starting position `pos = 2.5` centres the four filings).

Animation conventions: elements opt in with `data-reveal` (scroll) or `.fade-in` (on load), both staggered by an inline `style="--d:.1s"` delay. These only hide content when `<html>` has the `.js` class, and `prefers-reduced-motion` disables them. Keep that contract when adding new animated elements; new CSS keyframe animations also need an `animation: none` entry in the `prefers-reduced-motion` block.

Third-party components (React/shadcn/TypeScript snippets) are not installed as-is: there is no React toolchain. Port them to vanilla JS/CSS inside `index.html` (as with the grid pulse), and swap their colours for the brand tokens.

The contact form only validates on the client side; it has no backend yet and needs one before launch.

## Files and repo
- `Website Assets/`: the real logo, favicon, webclip, brand guideline, hero photos and videos. Use these, never placeholders, and use the guideline's exact colours. Unused files were cleared out on 2026-11-07; grep `index.html` before adding or relying on a file there. `Design Brief for website.docx` holds the client's content requirements; it is gitignored and must stay out of the public repo.
- `archive/`: dated snapshots of earlier homepage designs (`index-YYYY-MM-DD-<name>.html`). Before a major redesign, copy the current `index.html` here first. Gitignored.
- GitHub: `Mhanif81/Clearview-Accounting-website` (public, branch `main`; pushes go straight to `main`, and only when asked). The `temporary screenshots/` folder is gitignored too.

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly, using the real ClearView assets and copy. Only where no real asset or copy exists, use placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
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
