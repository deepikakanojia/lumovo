# LUMOVO

**LUMOVO-EDU: Learning Intelligence & Transformation.** The landing page and showcase projects of an independent learning intelligence practice, founded by Deepika Kanojia. It brings together learning design, educational technology, AI, analytics and automation.

Everything here is **static**: plain HTML, CSS and vanilla JavaScript. There is no build step, no framework and no server. Open a page in a browser and it works.

---

## 1. Project structure

```
Lumovo/
├── index.html                  Landing page (all sections, CSS and JS in one file)
├── assets/                     Images used by the landing page
│   ├── learning-insights-dashboard.png     Tool thumbnail (16:9)
│   ├── ai-upskilling-learning-game.png     Course thumbnail (3:2)
│   ├── finnish-first-hour-preview.png      L&D Service thumbnail (3:2)
│   └── deepike_profile_pic_place_holder.png  Founder portrait (PLACEHOLDER)
│
├── onboarding-dashboard/       "Tool": Employee Onboarding Operations dashboard
│   ├── app/                    The runnable dashboard and its build tooling
│   │   ├── Employee_Onboarding_Operations.html   Open this one
│   │   ├── operations_dashboard.js               Dashboard logic
│   │   ├── operations_data.js                    Generated data bundle (do not hand-edit)
│   │   ├── test_dashboard_logic.js               30 unit tests (node)
│   │   ├── rebuild_dashboard.sh                  Regenerates data from the workbooks
│   │   ├── build_nho_data.py, generate_dummy_extensions.py, make_seeder.py, ...
│   │   └── README.md, WHY_THIS_IS_HERE.md        Dashboard documentation
│   ├── NHO_Tracker_Dummy_Data.xlsx   Base synthetic workbook (48 hires, columns A-Y)
│   ├── generate_dummy_tracker_CANONICAL.py   The one generator for that workbook
│   ├── verify_dummy_tracker.py       Verifier for the workbook
│   ├── NHO_Dummy_Tracker_README.md   Workbook handover documentation
│   └── archive/superseded/           Old builders, kept for reference. DO NOT RUN.
│
├── finnish-course/             "L&D Service": "Your first hour in Finland" e-learning
│   ├── index.html              Playable game ("Arrival")
│   ├── guide.html              Text version with progress tracking
│   ├── assets/css, assets/js   Styles, game engine, art, journey data
│   ├── data/destinations.js    Destination data for the guide
│   └── README.md               Course documentation
│
├── design-explorations/        Throw-away design previews (not part of the live site)
│   └── orb-variants.html       Hero visual options (bulb, ripples, L monograms)
│
├── README.md                   This file
├── CHANGELOG.md                Detailed log of changes
├── TODO.md                     Open work
└── .gitattributes              Forces LF line endings for .sh / .py / .js
```

## 2. Running it

| What | How |
|---|---|
| Landing page | Open `index.html` in a browser (or serve the folder, e.g. VS Code Live Server at `http://127.0.0.1:5500/`) |
| Dashboard | From the landing page click **Tool > View live dashboard**, or open `onboarding-dashboard/app/Employee_Onboarding_Operations.html` |
| Finnish course | From the landing page click **L&D Service > Play the course**, or open `finnish-course/index.html` |
| Dashboard tests | `cd onboarding-dashboard/app && node test_dashboard_logic.js` (expect `30 passed, 0 failed`) |
| Rebuild dashboard data | `pip install openpyxl`, then `cd onboarding-dashboard/app && sh rebuild_dashboard.sh`, then reload the page |

All paths are relative, so the folder can be hosted on any static host (for example GitHub Pages) without changes.

## 3. Landing page: working areas

Sections of `index.html` are referred to by **working area (WA)** number. The HTML and CSS carry matching comments.

| Ref | Section | Anchor | Contents |
|---|---|---|---|
| (none) | Nav | `header.nav` | Brand, Services and About links, "Start a conversation" button (scrolls to Connect) |
| (none) | Hero | `.hero` | Headline, orb, "Explore our work" (to Services) and "Work with LUMOVO" (to Connect), 30+ countries line |
| **WA-01** | Services | `#services` | Three columns split by vertical lines: **Tool**, **Course**, **L&D Service**. Each holds one project item |
| ~~WA-02~~ | Selected work | removed | Retired. Its cards were moved into WA-01 |
| **WA-03** | Principles | `.principles` | Human-centred, Evidence-informed, Built for the world |
| **WA-04** | About | `#about` | Circular founder card (links to the profile site), About copy, LinkedIn logo link |
| **WA-05** | Connect | `#contact` | **Contact** button (`mailto:deepika.community@gmail.com`) |
| **WA-06** | Footer | `footer` | Brand, tagline, auto-updating year |

### WA-01 project items

| Column | Item | Opens | Thumbnail |
|---|---|---|---|
| Tool | Learning insights dashboard | `onboarding-dashboard/app/Employee_Onboarding_Operations.html` (same tab) | `learning-insights-dashboard.png` |
| Course | AI upskilling learning game | `https://deepikakanojia.github.io/AI-upskilling-learning-game/` (new tab, external) | `ai-upskilling-learning-game.png` |
| L&D Service | Modern e-learning experiences | `finnish-course/index.html` (same tab) | `finnish-first-hour-preview.png` |

## 4. Design conventions

- **Tokens:** colours, radius and shadow are CSS variables on `:root` at the top of the `<style>` block.
- **Container:** every section uses `.wrap`: full width, side padding `clamp(10px, 2.5vw, 48px)`, capped at 1680px.
- **Images:** all three WA-01 thumbnails use one **3:2** frame (`.pane-thumb`) with `object-fit: contain`, so nothing is cropped. Rounded corners are allowed.
- **Light / dark mode:** colours are CSS tokens on `:root`, overridden by `:root[data-theme="dark"]`. The nav toggle saves the choice in `localStorage` (`lumovo-theme`); first visit follows the system setting.
- **Responsive:** below 800px the nav links hide and grids collapse to one column. WA-01 columns stack with horizontal dividers.
- **Accessibility:** reduced-motion is honoured. Links have labels and images have alt text.
- **Links:** every link to local content is relative.

## 5. Known placeholders and open items

- The founder portrait is a **placeholder** illustration with a faint "Magnific" watermark. Replace `assets/deepike_profile_pic_place_holder.png` with a real photo or licensed art.
- The Finnish text in `finnish-course/` is **DRAFT** and needs native-speaker review.
- The dashboard needs further responsive and polish work, and a back link to the landing page.
- Unused legacy CSS remains in `index.html` (listed in a comment above the `section{...}` rule).

See [TODO.md](TODO.md) for the live list and [CHANGELOG.md](CHANGELOG.md) for what changed and why.

## 6. Data and privacy

The onboarding dashboard runs on **entirely synthetic data**. All emails use the reserved `example.com` / `example.net` domains, and managers, HRBPs and recruiters are generic labels. No real employee data is in this repository. See `onboarding-dashboard/NHO_Dummy_Tracker_README.md`.
