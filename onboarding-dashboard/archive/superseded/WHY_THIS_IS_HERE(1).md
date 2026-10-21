# Why these files are here — DO NOT RUN ANYTHING IN THIS FOLDER

Moved here on 2026-09-11 during a working-directory cleanup. **Nothing was deleted.**

## What this folder is

Earlier attempts and stale documentation that **contradict the shipped workbook**
`../NHO_Tracker_Dummy_Data.xlsx`. They are kept only as history. Following or running them
will produce a different, wrong dataset — and historically they competed for the same output
path, which is how the good workbook nearly got destroyed.

The shipped workbook is **48 hire rows, columns A–Y (25 columns)**, single tab
`Cohort Tracker May - December 26`, produced solely by
`../generate_dummy_tracker_CANONICAL.py`.

## Superseded generators

Each of these once wrote to `NHO_Tracker_Dummy_Data.xlsx` with a **different layout**:

- `generate_dummy_tracker.py` — the 21-column A–U variant. Since retargeted to
  `SUPERSEDED_21col_tracker.xlsx`, but its layout, row count and vocabulary are wrong.
- `build_dummy_tracker.py` — a third layout; since retargeted to
  `SUPERSEDED_build_dummy_tracker.xlsx`.
- `build_nho_data.py` — builds the dashboard data bundle and **still points at the deliverable
  path**; it is the most dangerous file here. Do not execute it.
- `superseded_generate_dummy_tracker_21col.py.bak` — backup of the 21-column generator
- `superseded_build_dummy_tracker.py.bak` — backup of `build_dummy_tracker.py`

## Contradictory documentation

- `README.md` — describes a 44-row, A–U dataset with a five-value CTA vocabulary
  (`Invite Sent / Confirmed / Attended / No Show / Rescheduled`) and names the wrong generator.
  None of that matches the shipped file. It carries its own warning banner at the top, which
  points to `NHO_Tracker_Dummy_Data_README.md` — that file is now in `../_extras/`.
- `FIELD_MAP.md` — the field-by-field map for that same non-existent 44-row A–U dataset.

For the accurate description of what actually shipped, read `../NHO_Dummy_Tracker_README.md`.

## If you need something from here

Copy it out and re-point its output path first. Never run it in place: the deliverable is
shipped read-only (mode 0444) specifically to make a stray write fail loudly, but that is a
guard rail, not a guarantee.
