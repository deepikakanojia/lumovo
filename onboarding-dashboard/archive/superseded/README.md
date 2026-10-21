# Onboarding Demo Tracker — synthetic demo dataset

> ### ⚠️ This file describes a DIFFERENT build. Read `NHO_Tracker_Dummy_Data_README.md` instead.
>
> The workbook actually on disk — `NHO_Tracker_Dummy_Data.xlsx`, md5
> `8399e1fc7950c5ef12d06dee46a90172` — is the **25-column A–Y, 48-hire** file produced by
> **`generate_dummy_tracker_CANONICAL.py`**. This README and `FIELD_MAP.md` were written for a
> 21-column A–U variant from `generate_dummy_tracker.py`, which now writes to
> `SUPERSEDED_21col_tracker.xlsx`. Several statements below are **false of the delivered file**:
>
> - *"44 hires"*, the per-cohort counts, and the CTA vocabulary `Invite Sent / Confirmed /
>   Attended / No Show / Rescheduled` — the delivered file has **48 hires** and column A holds
>   only `Onboarded` (23), `In Progress` (5) or blank (20). A failure word such as `No Show`
>   would render as a **green success pill**, because the pill class is hardcoded `green` with no
>   status→colour map (`getDashboardHtml_`, Code.gs:3503, rendered line 341).
> - *"One row is written as `Denver, Colorado` with no country suffix, on purpose."* No such row
>   exists in the delivered file. Column R is one consistent format there —
>   `City, Full State, United States` for US rows and `City, Country` for the rest — and the
>   generator fails the build unless `isUSLocation_` (Code.gs:2156) and the dashboard's
>   `isUSLoc_` agree on **every** value.
> - *"HRBPs and recruiters are labelled `HRBP A`…`HRBP F` and `Recruiter A`…`Recruiter F`."*
>   The delivered file uses invented person names — 3 HRBPs and 5 recruiters. See
>   "Deliberate deviations from the brief" in `NHO_Tracker_Dummy_Data_README.md`.
> - *"personal mail at `mailbox.example.net`"* — the delivered file uses `example.net`.
> - `getPilotNames_` / `PILOT_SHEET_ID` are not the real identifiers. They are
>   **`getCesoNames_` (Code.gs:3577)** and **`CESO_SHEET_ID` (Code.gs:3578)**, alongside
>   **`getArchiveHires_` (Code.gs:3038)** and **`ARCHIVE_ID` (Code.gs:3039)**. The warning itself
>   is correct and is the single most important prerequisite for any demo — see §6.2 of
>   `NHO_Tracker_Dummy_Data_README.md`.
> - `Dashboard.html` is **dead code**. `doGet()` (Code.gs:3364) serves `getDashboardHtml_()`
>   (Code.gs:3502-3504), a ~577-line HTML string literal. Any dashboard claim sourced from the
>   `.html` file is unverified.
>
> Which layout ships is an **open decision for the owner**, not something either generator should
> settle by overwriting the other's output. Until it is settled, treat
> `NHO_Tracker_Dummy_Data_README.md` as describing the bytes on disk.

A fully synthetic clone of the onboarding cohort tracker, safe for training,
documentation and handover. **No real employee, manager, recruiter or HRBP data.**
The original tracker was read for structure only and was not modified.

## Files

| File | What it is |
|---|---|
| `NHO_Tracker_Dummy_Data.xlsx` | The dummy tracker. One tab, 48 fictional hires. |
| `generate_dummy_tracker.py` | **The generator.** Regenerates the `.xlsx` *and* `FIELD_MAP.md` *and* the stats block below. Edit the roster here and re-run. |
| `FIELD_MAP.md` | Column list, automation field map, do-not-change list. **Generated — do not edit by hand.** |
| `generate_dummy_extensions.py` | Builds the companion workbook `NHO_Dummy_Extensions.xlsx`. |
| `SeedDummyTracker.gs` | Loads the dummy data **into a Google Sheet**, in place. |
| `make_seeder.py` | Regenerates `SeedDummyTracker.gs` from `dummy_hires.json`. |
| `verify_dummy_tracker.py` | Replays the dashboard's own matching logic + PII scan. |
| `build_dummy_tracker.py` | **Superseded.** An older generator that wrote to the same output path. Kept for reference only — running it will overwrite the current workbook with a different, 48-row, header-on-row-7 layout. |

## Dataset

<!-- BEGIN GENERATED STATS -->
<!-- Written by generate_dummy_tracker.py. Do not edit by hand. -->

- **Generator:** `generate_dummy_tracker.py` (fixed seed, "today" pinned to 2026-09-11).
- **Workbook:** `NHO_Tracker_Dummy_Data.xlsx` — one tab, `Cohort Tracker May - December 26`, header on **row 1**, data from **row 2**, columns **A-Y**.
- **Hires:** **44** across 15 of the 16 `CONFIG.COHORT_DATES` (the remaining 1 render the empty-state card).
- **Per cohort:** May 11, 2026 3, May 25, 2026 2, Jun 08, 2026 4, Jun 22, 2026 3, Jul 06, 2026 2, Jul 13, 2026 3, Jul 27, 2026 2, Aug 10, 2026 3, Aug 24, 2026 2, Sep 08, 2026 4, Sep 21, 2026 6, Oct 05, 2026 3, Oct 19, 2026 3, Nov 02, 2026 2, Nov 30, 2026 2.
- **Col A (CTA Status)** uses exactly this vocabulary and nothing else: `Invite Sent`, `Confirmed`, `Attended`, `No Show`, `Rescheduled`. Counts: Attended 20, (blank) 17, Invite Sent 3, Confirmed 2, No Show 1, Rescheduled 1.
- **Cols G, H, T and U are 100% text cells** (number format `@`, `data_type` `s`) on all 44 rows — zero real date cells anywhere in the workbook. Col G is the `yyyy-MM-dd` literal `isOffCycleStart_` membership-tests, col H the zero-padded `MMM dd, yyyy` literal every scanner `===`-compares. A single date-typed cell in either column would be read back as a JS `Date` and stringify to `Mon Sep 21 2026 00:00:00 GMT…`, which matches nothing.
- **Audit gaps:** 3 rows with a joining date on or after 2026-09-11 and at least one of the five audited fields empty — those are the only rows `auditTrackerForIssues_` can ever report (Code.gs:747 skips everything earlier).
- **Locations:** 12 non-US rows plus 1 deliberately blank.
<!-- END GENERATED STATS -->

## Running the seeder

`SeedDummyTracker.gs` is deliberately **not** pre-pointed at any spreadsheet. It
reads its target from the script property `DUMMY_SPREADSHEET_ID`, and refuses to
run until you set it:

1. In the Apps Script project: **Project Settings → Script Properties → Add**,
   key `DUMMY_SPREADSHEET_ID`, value = the id of the sheet you want seeded.
   Put the id in the script property, never back into this repository.
2. Run `previewDummyTrackerSeed`. Read-only; it logs exactly what it would
   change and delete. Authorize when prompted (Sheets scope only).
3. Run `seedDummyTracker`. Rewrites the tracker tab, rebuilds `List `, clears
   `Errors`, scrubs `Onboarding Process`, deletes the snapshot tabs.
4. Run `verifyNoRealDataRemains`. Should log that no corporate-domain references
   remain anywhere in the workbook.

> Step 3 deletes tabs and overwrites rows. It is meant to be destructive — that
> is how any pre-existing real data goes away — so read the preview output
> first, and confirm you are pointed at a copy and not at the source.

The seeder carries its own safety rail: it reads the production tracker id from
the script property `REAL_TRACKER_ID` (if you choose to set one) and aborts if
`DUMMY_SPREADSHEET_ID` matches it, or if the script is container-bound to it.

## Picking the date to demo from

**Do not run the demo with "today" = 2026-09-11.** All three scanners compare
`today` against a fixed offset from `CONFIG.COHORT_DATES` with an exact `===`,
and 2026-09-11 sits at `cohort+3` of the 2026-09-08 cohort — an offset no branch
uses. Nothing fires except the Gmail poll, which reads as a dead system. This is
a property of `COHORT_DATES` in `Code.gs`, not of this data, so it cannot be
fixed in the sheet. **FIELD_MAP.md §5** lists every date that does fire a branch,
which scanner it is and how many hires it hits; it is regenerated from the
scanner offsets on every run. The short answer is 2026-09-17 / 2026-09-18 /
2026-09-21 against the six-hire Sep 21 cohort.

## What the demo can show

`New hire → Tracker → Dashboard → Cohort view → Employee detail → Status`

- All 16 `CONFIG.COHORT_DATES` render as Past / Active / Next / Upcoming buttons
  with live counts; the one cohort with no rows renders the empty-state card.
- Three multi-hire dates so the click-through has substance on a past cohort, on
  the active-window cohort and on the next cohort.
- Deliberate gaps on the upcoming hires only, so the dashboard's red *Missing*
  and amber *Pending* states and `runTrackerAudit()` all have real output
  without the sheet looking broken. Past-cohort rows can never generate audit
  noise — `Code.gs:747` skips any row whose joining date is before today.
- Non-US hires across several regions, which exercises the flag icons and the
  "Non-US Hires — IT Setup Required" panel.
- One row is written as `Denver, Colorado` with **no country suffix, on
  purpose**. The server's `isUSLocation_` has no US-state list and classifies it
  as non-US; the dashboard's richer `isUSLoc_` renders it as US. That divergence
  is a real product bug and this row is how you demo it. Do not "fix" the data —
  fix `isUSLocation_`.

## Naming convention

All addresses use the RFC 2606 reserved domains: work and manager mail at
`example.com`, personal mail at `mailbox.example.net`. HRBPs and recruiters are
labelled `HRBP A`…`HRBP F` and `Recruiter A`…`Recruiter F`.

## Before connecting any automation

See **FIELD_MAP.md §4**. Repointing `CONFIG.SPREADSHEET_ID` is **not enough** —
`getArchiveHires_()` and `getPilotNames_()` each hard-code a second and third
spreadsheet id outside `CONFIG`, and both will merge real data into the demo
view if left alone.
