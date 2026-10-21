# Changelog

Newest entries last. Dates are 2026-10-21 unless stated. "WA" numbers are defined in README.md section 3.

## Setup

- Cloned `https://github.com/deepikakanojia/lumovo.git` into the project folder.
- Reviewed the structure and mapped the page into working areas.
- **Found in the original:** stray markdown fences (` ```html `) pasted into the Selected work, second project card and About sections; a duplicated Selected work header; a placeholder email; placeholder project cards.

## Landing page (`index.html`)

### Working areas defined
Services = WA-01, Selected work = WA-02 (later removed), Principles = WA-03, About = WA-04, Connect = WA-05, Footer = WA-06. Nav and Hero are unnumbered.

### WA-01 Services
- Replaced the six service cards with **three equal columns** (Tool, Course, L&D Service) separated by **vertical lines only**.
- Removed the 01/02/03 numbers, the outer container border, rounded container and background tint, and the hover highlight.
- Moved project items in from WA-02, one per column: dashboard under **Tool**, AI upskilling game under **Course**, e-learning under **L&D Service**.
- Images: the fixed-height frame was cropping both screenshots (dashboard 1672x941 = 16:9, game 1536x1024 = 3:2). Frames now show the full image, then were made **uniform at 3:2** (the larger ratio) using `object-fit: contain`.
- The Tool item now opens the **local** dashboard instead of the external GitHub Pages site. The L&D Service item opens the local Finnish course with a real screenshot thumbnail and a real description in place of the placeholder.

### WA-02 Selected work: removed
- Removed the whole section (header, duplicate header, stray fences and the English fluency tool and Analytics & AI placeholder cards).
- Removed the nav "Selected work" link. The hero button "Explore selected work" became "Explore our work" and now points to `#services`.

### WA-04 About
- Removed stray ` ```html ` fragments.
- The profile preview image did not exist (`profile-website-preview.png` was never added). Replaced with a **circular placeholder portrait** (`assets/deepike_profile_pic_place_holder.png`), recoloured from orange to navy blue.
- Added a caption under the portrait: **Deepika Kanojia / Founder / Click to know her more**. The whole card links to the profile site.
- The LinkedIn link is now the **LinkedIn logo** (inline SVG) centred above "Connect with Deepika on LinkedIn". Arrows removed from both links.

### WA-05 Connect
- The button now reads **Contact** and uses `mailto:deepika.community@gmail.com`, so the visitor's email app opens with the address filled in.

### Site-wide layout
- `.wrap` container changed from fixed 1160px to **fluid**: full width, max 1680px, side padding `clamp(10px, 2.5vw, 48px)` (halved from the first fluid version, `clamp(20px, 5vw, 96px)`). A 20px-only version was tried and reverted.

### Documentation
- Added structural comments to `index.html` (HTML region markers and CSS group labels).
- Rewrote `README.md`; added `CHANGELOG.md`, `TODO.md`.

## Onboarding dashboard (`onboarding-dashboard/`)

- **Source:** `Dummy NHO-20261021T151546Z-1-001.zip`.
- **Investigation:** the repo root already held the dashboard files, byte-identical apart from Windows line endings. Missing were the base workbook `NHO_Tracker_Dummy_Data.xlsx`, its generator, verifier and README, so the rebuild script could never run.
- **Moved** everything into `onboarding-dashboard/`, preserving the original folder relationships (`app/` finds the workbook one level up) so no script paths changed. Old builders went to `archive/superseded/` (the zip's own notes warn they can overwrite the workbook). Loose root copies were removed.
- Added `.gitattributes` so `.sh`, `.py`, `.js` stay LF (CRLF breaks shell scripts).
- **Fix:** `build_nho_data.py` wrote output in the Windows default encoding, corrupting em-dashes. It now writes UTF-8 with LF. A full rebuild now reproduces the shipped `operations_data.js` exactly.
- **Verified:** 30 of 30 unit tests pass; rebuild reproduces data (needs `pip install openpyxl`); page renders in headless Chrome. The page has no external dependencies.
- **Responsive fix:** the chart grid had a 390px minimum column that overflowed phones. It is now `minmax(min(390px, 100%), 1fr)` and children can shrink. The Cohorts, Sessions and Fast-Track pages already adapted well at 390px and 820px.
- **Not done (see TODO.md):** further responsive and polish work, and a back link to the landing page.

## Finnish course (`finnish-course/`)

- **Source:** `Y:\Buisness\Course using AI\Finnish\0001_validation\docs\`.
- **Investigation:** plain HTML, CSS and JS with no external requests. Only the contents of `docs/` are needed. Its two `localStorage` keys are namespaced (`lumovo.arrival.v1`, `lumovo.arrival.game.v1`), so they cannot clash with other pages.
- **Moved** the whole `docs/` folder as-is. The two Aino `.mp4` videos (75MB) and the `00-project` to `05-feedback` folders were deliberately **not** copied: the page does not use them.
- Verified that the game and the text guide render at 390px.
- Created `assets/finnish-first-hour-preview.png` (headless-Chrome screenshot of the game's opening scene) for the landing page.
- The content is marked **DRAFT**; the Finnish needs native-speaker review.

## Hero visual refinement

- Explored light / illumination versions of the hero orb in `design-explorations/orb-variants.html` (six shapes, five "L" treatments, three ripple-bulb versions, two merges). Reference stock imagery was used for inspiration only; all artwork is original.
- Chose **M2**: the line-art bulb on a soft blue disc, with lumen ripples born at the bulb's core.
- Replaced the old `.orb` in the hero with the M2 visual (`.lumo-visual`, inline SVG, no image files). Ripples travel **6.4x** their size before fading, twice the first version (3.2x). Hidden on mobile like the old orb; disabled for reduced-motion users.
- **Open:** the request to "change it to lumovo-edu" is not yet applied (brand name vs. wordmark vs. visual name not confirmed).

## Header logo and light / dark mode

- **Logo:** the header mark is now a blue-to-cyan **bulb** (inline SVG, white filament, screw base), replacing the old arch mark. Interim logo, as requested.
- **Theme toggle:** a sun / moon button in the nav (kept visible on mobile) switches light and dark mode.
  - Colours moved to CSS tokens: `--surface`, `--link`, `--grad-a`, `--nav-text`, `--pane-bg`, `--ghost-hover`, `--rip`, `--hero-bg`, `--footer-bg`. A `:root[data-theme="dark"]` block overrides them.
  - The choice is saved in `localStorage` (`lumovo-theme`). First visit follows the visitor's system setting.
  - A tiny script in `<head>` sets the theme before first paint, so there is no flash of the wrong colours.
  - The toggle's `aria-label` and `aria-pressed` update on every click.
- Checked both modes across the whole page in headless Chrome. The contact band keeps its blue gradient in both modes by design.
- **Not yet applied to** the dashboard (`onboarding-dashboard/`) and the Finnish course (`finnish-course/`), which have their own styles.

## Rename: LUMOVO to LUMOVO-EDU

- Brand name changed to **LUMOVO-EDU** (an "illumination" name with an education tag) everywhere it is visible: header wordmark, footer, page title and meta description, hero and section copy, the header link's aria-label, the Finnish course brand lines, and the README.
- Deliberately **not** renamed, because renaming would break code or data: the `lumovo-theme` and `lumovo.arrival.*` storage keys, the `window.LUMOVO_DESTINATIONS` / `LUMOVO_JOURNEY` / `LumovoArt` identifiers, GitHub and email addresses, and the historical entries above in this file.
