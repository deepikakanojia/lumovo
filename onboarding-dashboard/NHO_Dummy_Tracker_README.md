# Onboarding Demo Tracker — Handover Documentation

Companion document for `NHO_Tracker_Dummy_Data.xlsx`.
Reference date used throughout the data and this document: **2026-09-11**.

---

## 1. What this is

`./NHO_Tracker_Dummy_Data.xlsx` is a synthetic stand-in for the
Google Sheet tab that the Employee Onboarding Apps Script reads and writes. It has one tab,
named exactly **`Cohort Tracker May - December 26`**, with a single header row and **48 hire rows**
(rows 2–49) across 25 columns (A–Y). The tab name, the column order, the cell types and the date
string formats are reproductions of the production layout, so the same `Code.gs` logic can be
pointed at it without modification.

Every value in it is invented. There are **zero real employees, zero real email addresses, zero real
Slack or spreadsheet IDs**. All email addresses use the IANA-reserved documentation domains
`example.com` (work, manager, Google Group host) and `example.net` (personal), which can never be
registered, so nothing addressed to them can leave for a third party. Managers, HRBPs and recruiters
are generic labels (`Riley Chen`, `HRBP A`, `Recruiter B`). The file exists for **training,
documentation, handover and demo** — it lets someone learn the tracker, screenshot the dashboard, or
wire up a sandbox automation without touching live data. **The real tracker was not read from,
written to, copied or modified in any way to produce it**; the data was generated from scratch by a
Python script.

---

## 2. Column / field inventory

Example values are taken verbatim from the generated file. "Text" means the cell is a string with
number format `@`; "Boolean" means a real Excel/Sheets boolean (renders as a checkbox in Sheets).

| Col | Header | Data type | Example value (from the file) | What it means |
|---|---|---|---|---|
| A | CTA Status | Text or blank | `Onboarded` (23 rows); blank (25 rows) | Free-text note on the hire's "Welcome to Call to Adventure" session state. Human-maintained; the script only ever writes `""` here. |
| B | Manager Email Sent | Boolean | `TRUE` (37 rows), `FALSE` (11) | Day-1 manager DM has been sent for this row. Set by the Monday scanner. |
| C | Slack | Boolean | `TRUE` (37 rows), `FALSE` (11) | The cohort Slack channel exists and was detected. Set by the Slack-marking helper. |
| D | New Hire Kit Ordered | Boolean | `TRUE` (34 rows), `FALSE` (14) | Laptop/kit ordered. Never written by any code path — manual only. |
| E | First Name | Text | `Sanne` | Hire's first name. Row-liveness gate: blank E makes the row invisible to every scanner. |
| F | Last Name | Text | `Visser` | Hire's surname. Half of the fallback dedup key. |
| G | Joining Date | Text `yyyy-MM-dd` | `2026-05-11` | The hire's actual start date. Text, never a Date cell. |
| H | Next Cohort Date | Text `MMM dd, yyyy` | `May 11, 2026` | The onboarding cohort this hire is assigned to. Zero-padded day. **The** grouping key for every scanner and for the dashboard. |
| I | Personal Email | Text or blank | `sanne.visser@example.net` | Pre-start contact address; added to the cohort Google Group. Strongest dedup key. Blank on 2 rows. |
| J | Work Email | Text or blank | `sanne.visser@example.com` | Corporate address. Slack/Calendar identity and the row locator for manager DMs. Blank on 4 rows. |
| K | Job Title | Text | `Staff Software Engineer` | Title as advertised. Feeds messages and the dashboard function fallback. |
| L | Manager Name | Text | `Tomas Alvarez` | Single manager, `First Last`. Used in DM greetings and the manager table. |
| M | Manager Email | Text | `tomas.alvarez@example.com` | Manager's corporate address. Grouping key for manager DMs; looked up in Slack. |
| N | HRBP | Text or blank | `HRBP A` | HR business partner. Dashboard-only. Blank on 8 rows. |
| O | Recruiter | Text | `Recruiter A` | Recruiter name. Legacy rows may instead hold `Dept: X \| Recruiter: Y`; this file uses the bare-name form. |
| P | Google Group Created | Boolean `FALSE` **or** URL text | `https://groups.google.com/a/example.com/g/onboarding-2026-05-11` (35 rows); `FALSE` (13 rows) | Dual-typed by design: seeded boolean `FALSE`, overwritten with the group URL once the group exists. |
| Q | Google Group Meeting Link | Text or blank | `https://meet.google.com/avr-uwer-szx` | Welcome-call Meet link. Write-only — nothing in the script or dashboard reads it. Filled on 35 rows. |
| R | Location | Text | `Amsterdam, Netherlands` | Free-text location. Drives UK/EMEA Slack routing and the non-US IT alert. |
| S | Dashboard Link | blank | *(empty on all 48 rows)* | Manual human column carried over from the live sheet. Not read by anything. |
| T | DM to manager | Boolean | `TRUE` (31 rows), `FALSE` (17) | Manual human tick. Not read by `Code.gs`. |
| U | DM to new hire | Boolean | `TRUE` (31 rows), `FALSE` (17) | Manual human tick. Not read by `Code.gs`. |
| V | HRBP from sheet | blank | *(empty on all 48 rows)* | Manual human column. Not read by anything. |
| W | Department | Text | `Engineering` | Located **by header text**, not position. Drives the dashboard function tabs and the department chart. 13 distinct values in the file. |
| X | Okta Activated | Text or blank | `✓ 2026-05-11` | Located by header text. Set by the Okta sync. Filled on 27 rows, blank on 21. |
| Y | Device Ship Date | Text or blank | `2026-05-05`, or the literal `ordered` (3 rows) | Located by header text. Set by the IT/Slack sync; `ordered` means the source message carried no date. Filled on 32 rows. |

Distinct values present in the file, for reference:

- Column A: `Onboarded` and blank only.
- Column W (Department): Engineering (14), Sales (5), Customer Success (5), Product (4), Finance (3),
  Marketing (3), Information Security (3), Design (2), Business Operations (2), People (2),
  Recruiting (2), Behavioral Science (2), Legal (1).
- Column H: 15 distinct cohort strings — 14 of the 16 official cohort dates plus one deliberate
  off-cycle value, `Sep 24, 2026`. The official cohorts `May 25, 2026` and `Dec 14, 2026` have no
  rows, on purpose, so the empty-cohort card renders.

---

## 3. Automation field map

| Col | Read by (functions) | Written by (functions) | Format the script expects | Verdict |
|---|---|---|---|---|
| A CTA Status | `getDashboardData` (`row[0]` → `hire.ctaStatus`); dashboard renderer (green pill only when non-empty) | `appendToTracker_`, `appendToTrackerHRReport_` — both write `""` | Free text or empty. Never parsed, compared or coerced. Any non-empty value renders a green `🎯 <text>` pill. | **Cosmetic** |
| B Manager Email Sent | `sendManagerDMs_` (gate: `data[i][1] === true \|\| 'TRUE' \|\| 'true'` → skips the whole manager group); `mondayScanner` indirectly | appenders (boolean `false`); `sendManagerDMs_` `setValue(true)`; the two reset helpers `setValue(false)` | Real boolean / checkbox. Readers also accept the strings `'TRUE'`/`'true'`. Anything else counts as not-sent. | **Must not change** |
| C Slack | `markSlackChannelInTracker_` (gate: `if (!row[2])` — bare truthiness, *not* equality); `getDashboardData` (`row[2] === true \|\| String(row[2]).toLowerCase() === 'true'`) | appenders (boolean `false`); `markSlackChannelInTracker_` `setValue(true)`, called from the Monday scanner, the Friday-afternoon scanner and two manual helpers | Real boolean / checkbox. Empty or boolean `false` = not done. | **Must not change** |
| D New Hire Kit Ordered | `getDashboardData` only (same strict true test) | appenders (boolean `false`). Never written again by any code path. | Real boolean / checkbox. Only `true`/`'true'`/`'TRUE'` renders done. | **Cosmetic** |
| E First Name | `isDuplicate_`, `updateExistingHireFromReport_`, `auditTrackerForIssues_`, `getCohortHires_` (blank E ⇒ row skipped entirely), the Slack/Group marking helpers, `removeDuplicateHires`, both sync jobs, `getDashboardData`, the Slack user-directory name match | `appendToTracker_`, `appendToTrackerHRReport_` | Non-empty text, compared case-insensitively after trim. Row 1 must literally read `First Name` — the IT sync throws `Header row not found.` otherwise. | **Must not change** |
| F Last Name | `isDuplicate_`, `updateExistingHireFromReport_`, `auditTrackerForIssues_`, `getCohortHires_` (synthesises the work email from E+F when J is blank), `removeDuplicateHires`, both sync jobs, `getDashboardData`, the Slack name match | both appenders | Text, single surname preferred. The Okta sync lowercases it and strips whitespace, then matches it against the last dot-segment of the work-email local part. | **Must not change** |
| G Joining Date | `isDuplicate_`, `updateExistingHireFromReport_`, `auditTrackerForIssues_` (blank G or G < today ⇒ row never audited), `getCohortHires_`, `removeDuplicateHires`, the Okta sync, `isOffCycleStart_`, `getDashboardData` (display only) | both appenders write the plain string `yyyy-MM-dd`. **Never** written by the update path. | Text `yyyy-MM-dd`. A real Date cell works but is formatted through UTC on some paths and America/Los_Angeles on others, so the two can disagree by a day. `9/21/2026` or `Sep 21, 2026` match nothing. | **Must not change** |
| H Next Cohort Date | `getCohortHires_` — the cohort selector, exact `!==` string compare; gates the daily, Monday and Friday-afternoon scanners and the channel-population helper. Also `markSlackChannelInTracker_`, `markGoogleGroupInTracker_`, `fixCohortDateFormat`, `getDashboardData` `cohortKey_`, and the cohort-date scanners | both appenders (`Utilities.formatDate(..., 'MMM dd, yyyy')`); `fixCohortDateFormat` | Text exactly `MMM dd, yyyy` — 3-letter month, **zero-padded** two-digit day, comma, 4-digit year. | **Must not change** |
| I Personal Email | `isDuplicate_` (strongest dedup key), `updateExistingHireFromReport_`, `auditTrackerForIssues_` (required for hires starting today or later), the Google Group add and the Friday checklist, the 2nd-choice Slack lookup, `getDashboardData`, `processHire_` warning | both appenders (the Ashby email parser never supplies one, so Gmail rows are blank); `updateExistingHireFromReport_` fills and overwrites from the HR report | Valid email or empty; compared trim+lowercase. **Must be unique per person.** | Safe to synthesise |
| J Work Email | `sendManagerDMs_` (row locator for the col-B flip), the reset helper, `getCohortHires_` (synthesises `first.last@<corp-domain>` when blank), the Slack/Calendar identity paths, `auditTrackerForIssues_`, both sync jobs, `getDashboardData` | both appenders (derived from E+F: lowercased, non-alphanumerics stripped, dot-joined); `updateExistingHireFromReport_`; the Okta sync; one one-off correction helper | Lowercase `firstname.lastname@<corp-domain>`, consistent with E/F. Compared with `toLowerCase()` equality; never parsed. | **Must not change** |
| K Job Title | `auditTrackerForIssues_`, `getCohortHires_` (Thursday notice, manager DMs, non-US alerts), `deptToFunction_` job-title fallback, `getDashboardData` (card title, search key, role chips) | both appenders; `updateExistingHireFromReport_` (overwrites on conflict) | Free text, non-empty. Substring-matched case-insensitively. | Safe to synthesise |
| L Manager Name | `auditTrackerForIssues_`, `getCohortHires_`, all four manager-DM builders, `getDashboardData` (manager grouping) | both appenders (first listed manager only — comma-separated input is split and the first taken); `updateExistingHireFromReport_` | `First Last`, one person, no comma-separated list. The manager email in M is derived from exactly this shape. | Safe to synthesise |
| M Manager Email | `sendManagerDMs_` (grouping key; blank silently drops the hire), `sendManagerFridayDMs_` (grouping + dedup property key), the reset/test helpers, the Slack `users.lookupByEmail` call, `getDashboardData` | both appenders (derived from L); `updateExistingHireFromReport_` | One valid `firstname.lastname@<corp-domain>`, lowercase. Used verbatim as an object key and in a Slack API query. | **Must not change** |
| N HRBP | `getDashboardData` only (card row + one bar chart; blank counts as "Not assigned") | both appenders write `""` | Free text or empty. Never parsed. | **Cosmetic** |
| O Recruiter | `getDashboardData` → `parseNoteParts_` (accepts both `Dept: X \| Recruiter: Y` and a bare name); the recruiter chart splits it on commas | `appendToTracker_` (raw, possibly multi-name); `appendToTrackerHRReport_` (single name); `updateExistingHireFromReport_` | Plain name / comma-separated names, or the legacy `Dept: … \| Recruiter: …` pattern. Only two regexes touch it. | Safe to synthesise |
| P Google Group Created | `getDashboardData` (`done` when non-empty and not the literal `false`) | `appendToTrackerHRReport_` (boolean `false`); `markGoogleGroupInTracker_` (`setValue(groupLink)` — a URL, not a boolean); the Friday checklist asks a human to paste it | Boolean `false` **or** a Google Group URL. Anything non-empty except `false` reads as done. | **Cosmetic** (but keep the dual type) |
| Q Google Group Meeting Link | Nothing reads it — write-only | `appendToTrackerHRReport_` (`""`); `markGoogleGroupInTracker_` (`setValue(meetLink)`) | A bare Meet URL or empty. Never parsed. | **Cosmetic** |
| R Location | `getCohortHires_` → the `hasUK` tests in the Monday scanner and the channel-population helper (UK keyword list substring-matched against the lowercased value); the non-US `#it-hr-xfn` alert via `isUSLocation_`; `auditTrackerForIssues_`; `getDashboardData` (flag, region bucket, Non-US block and tab) | `appendToTrackerHRReport_`; `updateExistingHireFromReport_`. **Not** written by `appendToTracker_`. | A human location string that substring-matches the keyword lists, e.g. `City, State, United States` / `London, United Kingdom`. The server-side US test does **not** recognise a bare US state name. | **Must not change** |
| W Department | `getDeptCol_` (scans row 1 for a header whose trimmed lowercase text `=== 'department'`); `updateExistingHireFromReport_`; `getDashboardData`; `deptToFunction_` | `getDeptCol_` (writes the header when it creates the column); `appendToTrackerHRReport_`; `updateExistingHireFromReport_`. Never written by `appendToTracker_`. | Header cell must be exactly the word `Department`. The column must live to the **right** of R. Values are free text, substring-matched. | **Must not change** |
| X Okta Activated | `getDashboardData` only, located by exact header text | the IT/Okta sync helper (`ensureCol()`, case-sensitive header match) | Header text must match exactly. Values are dates or a `✓ yyyy-MM-dd` string. | **Must not change** (the header) |
| Y Device Ship Date | `getDashboardData` only, located by exact header text | the IT/Slack sync helper | Header text must match exactly. Values are dates, a date string, or the literal `ordered`. | **Must not change** (the header) |
| S, T, U, V | Nothing | Nothing | Manual human columns carried over from the live sheet. `Code.gs` addresses A–R positionally and stops at index 17, so these are invisible to it. | Cosmetic |

### Dedup key, and the 15- vs 18-column writer discrepancy

`isDuplicate_` scans every data row and returns true on the **first** row where *either* (1) the
incoming personal email equals column I (both trimmed and lowercased, both non-empty), *or* (2) first
name (E) **and** last name (F) **and** start date (G) all match, with Date cells formatted through
UTC as `yyyy-MM-dd`. No other column participates — not the cohort, not the work email. So two
different people who share a column I value will be merged (the HR-report path will "update" the
wrong person's row, overwriting title, manager and location), and conversely changing E, F, G and I
together re-adds the same person as a second row. Two sibling functions use *different* keys: the
bulk de-duplicator ignores column I entirely and formats dates in America/Los_Angeles (so it can
disagree with `isDuplicate_` by one day on Date-typed cells), and the dashboard applies a third,
display-only dedup on first+last within the same cohort.

There are also **two tracker writers that disagree about how wide a row is.** The HR-report path
(`appendToTrackerHRReport_`) builds an **18-element A–R row** plus the dynamic Department column, and
copies data validation across all 18 columns. The Gmail / manual path (`appendToTracker_`) builds only
a **15-element A–O row** and every range it touches is 15 wide. The consequences are silent and real:
columns **P, Q and R are never touched** on Gmail-added rows, and column R is the *only* input to
UK/EMEA-vs-US routing — so a hire added from the intake email never triggers the UK channel add and is
never flagged non-US, because that email carries no location field at all. Those rows also show up in
the audit as "missing: location" (usually "missing: personal email" too), never get the Department
column written, and end up classified as function `Other`. **Anything that regenerates or synthesises
tracker rows should produce the full 18 columns plus Department** — the 15-column row is a legal
historical artifact, not a target shape. This dummy file deliberately writes all 25 columns on every
row for exactly that reason.

---

## 4. Fields that MUST NOT change

> Treat this list as the contract. Everything here is compared with exact string equality or read by
> hard-coded position. There is no validation layer that will catch a mistake — the failures are all
> silent.

1. **Column G must be text `yyyy-MM-dd`, and the value must be one of the 16 configured cohort dates
   unless the hire is genuinely off-cycle.** `isOffCycleStart_` does an exact string membership test
   (`CONFIG.COHORT_DATES.indexOf(String(startDate).trim()) === -1`). Any other format — a real Date
   cell, `9/21/2026`, `Sep 21, 2026` — matches nothing and fires the off-cycle Slack alert on
   *every single hire*. It also breaks half the dedup key, so the HR-report run appends duplicate
   rows.
2. **Column H must be text `MMM dd, yyyy` with a zero-padded day.** `getCohortHires_` compares it with
   `!==` against formatted output, so `Sep 8, 2026` or `2026-09-08` returns **zero hires**: no Thursday
   notice, no Friday reminder, no manager DMs, no Google Group, no Day-1/2/3/6/10 messages, and the
   Monday scanner posts "no hires found in tracker" instead. `fixCohortDateFormat` will rewrite any
   `yyyy-MM-dd` cell it finds here. The dashboard is more forgiving than the scanners, so the sheet
   can look perfectly correct while every scanner ignores it.
3. **The tab name must be exactly `Cohort Tracker May - December 26`.** The sheet getter does an exact
   `getSheetByName()`; the dashboard swallows the miss silently and renders all 16 cohorts as
   "0 hires" with no error.
4. **The `Department` header literal.** `getDeptCol_` matches a row-1 header whose trimmed lowercase
   text is exactly `department`. Rename it to `Dept` or `Job Department` and the lookup returns -1,
   then **appends a second `Department` column at the far right** — reads and writes land in
   different columns from then on. The same applies to `Okta Activated` and `Device Ship Date`, which
   the IT sync locates by **case-sensitive** exact header text.
5. **Column position A–R.** Every one of those columns is read by hard-coded 0-based index
   (`row[0]`…`row[17]`) with no header lookup anywhere. Inserting, deleting or moving any column
   between A and R shifts every field at once and breaks the entire script. New columns go to the
   **right of R** only.
6. **Columns B, C and D must be real booleans.** Readers accept boolean `true` or the strings
   `'TRUE'`/`'true'` and nothing else — `Yes`, `Y`, `✓`, `1`, `Done` all read as *not done* and render
   a grey pill. Worse, the Slack-marking helper gates on bare truthiness (`if (!row[2])`), so the
   **string** `'FALSE'` is truthy: the row is treated as already marked, column C is never set, and the
   row looks permanently un-provisioned while the dashboard simultaneously shows it grey.
7. **Column P must stay dual-typed and must not carry checkbox validation.** It is seeded boolean
   `false` and later *replaced* with a Google Group URL. Add checkbox data validation to the column and
   the URL write conflicts with it. Note the dashboard's test is inverted-tolerant: anything non-empty
   except the literal `false` reads as done, so `No`, `Pending` and `N/A` all render a green ✓.
8. **Column E must be non-blank, and row 1 must literally read `First Name`.** A blank E makes the row
   invisible to every scanner (no messages, no group, no Slack invite) while the audit still processes
   it if F is filled. A first name of `First`, `First Name` or `Name` is silently dropped by the
   dashboard as header-row noise. The IT sync throws `Header row not found.` if the literal is absent.
9. **Column J must equal the address the code derives for that hire** (`first.last@<corp-domain>`,
   lowercased with non-alphanumerics stripped). If it doesn't, the manager-DM row locator finds no
   row, column B is never flipped, and the manager is re-DMed on every run. The Slack lookup also
   fails, so the hire is reported "No Slack account found" and is dropped from the welcome calendar
   invite.
10. **Column M must be a single valid manager address.** Blank silently excludes that hire from both
    manager DMs with no Slack warning at all — the failure is invisible outside the execution log.
    Two spellings of the same manager split one DM into two. This is the highest-blast-radius column
    in the sheet: a resolvable address sends a real DM to a real person.
11. **Column F must match the work-email local part.** A hyphenated or two-word surname makes the
    synthesised work email diverge from the real one, the Slack lookup fails, and the Okta sync
    silently stops matching that row.
12. **Column R must use a location string the keyword lists recognise.** The server-side US test only
    knows `united states`, `usa`, a few DC spellings and `hawaii` — a bare US state name is **not**
    recognised, so a row written as just `Denver, Colorado` is broadcast to the IT/HR channel as a
    non-US hire. And the UK keyword list is substring-matched with no word boundary, so any location
    containing `uk` or `wales` trips it. (This file contains two `Sydney, New South Wales, Australia`
    rows precisely to demonstrate that trap.) Blank R is silently non-routing but generates an audit
    line on every HR-report run.

---

## 5. Demo script

Anchor date for the whole demo: **2026-09-11**.

1. **Start at the intake.** Explain that a hire reaches the tracker one of three ways: parsed from an
   Ashby "New Hire Alert" email, parsed from the biweekly HR report, or typed in by hand. Point out
   that the email path writes only columns A–O — so location (R) arrives later, if at all. This is why
   two rows in the file are deliberately thin.

2. **Open the tracker.** Tab `Cohort Tracker May - December 26`, one header row, 48 hires. Walk the
   column groups: completion flags A–D, identity E–J, org K–N, provisioning O–R, manual notes S–V, and
   the three header-located columns W–Y (`Department`, `Okta Activated`, `Device Ship Date`).

3. **Show the dashboard.** It groups strictly on column H, not column G. The 16 official cohorts are
   pre-seeded so the grid is never empty — `May 25, 2026` and `Dec 14, 2026` show the "No hires"
   empty-state card. A sixteenth *unofficial* button also appears: `Sep 24, 2026`, created purely
   because four rows carry that column-H value. That is the "extra button" behaviour, demonstrated
   live rather than described.

4. **Pick the busiest date.** Two cohorts tie at **5 hires each — `Aug 10, 2026` and `Sep 08, 2026`**.
   Use **`Sep 08, 2026`**, because as of 2026-09-11 it is 3 days old and therefore the one badged
   *Active* (past, but inside the 13-day running window). Clicking it shows these five, sorted A–Z by
   first name:

   | Name | Title | Location | State |
   |---|---|---|---|
   | Agata Kowalski | Security Analyst | Boston, Massachusetts, United States | fully provisioned; Okta `✓ 2026-09-06`, device `2026-08-29` |
   | Isla Barros | QA Engineer | Melbourne, Victoria, Australia | fully provisioned; Okta `✓ 2026-09-08` |
   | Kwame Osei | Content Marketing Specialist | London, England, United Kingdom | **off-cycle** — joined `2026-09-02`, assigned to the Sep 08 cohort |
   | Mateo Delgado | Customer Success Associate | Toronto, Ontario, Canada | fully provisioned |
   | Victor Adeyemi | Senior Software Engineer | Austin, Texas, United States | flags all green but **Okta and Device Ship Date are both blank** |

   If you would rather demo the other tied cohort, `Aug 10, 2026` contains Duncan Fraser, Femke Dekker,
   Hiroshi Nakamura, Yusuf Ibrahim and Zoe Bergstrom.

5. **Drill into one employee.** Use **Agata Kowalski** as the clean case — every pill green, personal
   and work email present, group and Meet links populated, Okta and device dates filled. Then use
   **Victor Adeyemi** as the contrast: same cohort, same green flags, but the two IT columns are empty,
   so he appears in the "No Device Yet" block. Same cohort, different operational reality — that is the
   point of the per-column pill model.

6. **Show the off-cycle hires.** Ten rows have a joining date (G) that is not one of the 16 configured
   cohort dates, which is exactly what triggers the off-cycle alert at write time:

   | Hire | Joining date (G) | Assigned cohort (H) |
   |---|---|---|
   | Kwame Osei | 2026-09-02 | Sep 08, 2026 |
   | Jonas Sorensen | 2026-09-14 | Sep 21, 2026 |
   | Rohan Brown, Imani Carter, Wen Lee, Xavier Morgan | 2026-09-24 | Sep 24, 2026 |
   | Bianca Haddad | 2026-09-28 | Oct 05, 2026 |
   | Ulrik Olsen | 2026-10-13 | Oct 19, 2026 |
   | Aisha Ferreira | 2026-10-14 | Oct 19, 2026 |
   | Nikhil Sharma | 2026-11-23 | Nov 30, 2026 |

   Six of them show the normal pattern: an odd start date rolled forward to the next official cohort.
   The four `2026-09-24` rows show the other pattern — an entire off-cycle cluster whose column H is
   *not* an official cohort date, which is what produces the unseeded extra button in step 3.

7. **Show the deliberately-incomplete rows.** These exist so the audit and the "Missing"/"Pending"
   states are demonstrable instead of hypothetical:

   - **Linh Tran** (`Oct 05, 2026`, IT Support Specialist) — no personal email, no work email, no HRBP.
     The dashboard shows red `Missing` for personal email and orange `Pending` for work email.
   - **Talia Bergman** (`Nov 02, 2026`, Revenue Operations Analyst) — same shape, on a far-future cohort.
   - **Bianca Haddad** (`Oct 05, 2026`) and **Quentin Larsen** (`Oct 19, 2026`) — work email blank only.
   - Eight rows have a blank HRBP (including Yuki Tanaka, Elena Castillo, Rohan Brown, Sofia Duarte),
     which bucket into "Not assigned" on the HRBP chart.

   All of these sit on **future** cohorts on purpose: the audit skips any row whose start date is blank
   or in the past, so past cohorts stay clean and the audit output stays short and credible.

8. **Finish on the routing traps** if the audience is technical. `Quentin Larsen` and `Yusuf Ibrahim`
   (Manchester, England, United Kingdom) legitimately trip the UK routing. `Olivia Hughes` and
   `Aisha Ferreira` (Sydney, New South Wales, Australia) trip it **by accident**, because `wales` is a
   substring of `New South Wales`. And 23 of the 48 locations fail the server-side US test, including
   every row written as `City, State, United States`-style variants the test doesn't know — which is
   why location strings are on the must-not-change list.

---

## 6. Status model

**There is no onboarding-stage field in this tracker.** Nothing in the sheet holds a single value like
"Onboarded" or "Pending" that the system reads. Status is *inferred* from two independent things: the
cohort date in column H versus today's date, and four separate completion flags. No column overrides
another; there is no precedence.

Mapping the words used in the request to what actually exists:

| Word used | Is it a real status value? | What actually drives it |
|---|---|---|
| **Upcoming** | No | Computed. A cohort whose date is after today gets the badge `Upcoming`. Nothing in the sheet says so. |
| **Joined** | No | Computed. The KPI is labelled **"Already joined"** and counts hires whose *cohort* date is ≤ today. Its complement is labelled **"Starting soon"**, not "Pending". |
| **Welcome call sent** | No — no such label exists anywhere | The nearest real artifact is columns **P** (group URL) and **Q** (Meet link) being populated. That is a human step done on the cohort Friday. If you want words on screen for it, they have to be typed into column A. |
| **Slack channel created** | **Yes** | Column **C** = `TRUE`. Set only after the channel is actually found in Slack. Renders as the pill `💬 Slack ✓`. |
| **Onboarded** | No — not a column and not a dashboard word | The nearest real concept is the cohort ageing out of the 13-day active window, after which the badge changes from `Active` to `Past`. In *this dummy file*, the word `Onboarded` has been typed into column A on 23 rows to make the concept visible — but be clear with the audience that this is free text a human wrote, not a system state. |
| **Pending** | Partly | The dashboard does print the literal word `Pending`, in orange, but **only** for a missing work email. It is not a hire status. Personal email and location render red `Missing` instead. |

The real vocabulary, as it appears on screen:

- **Cohort badges:** `Past`, `Active` (past but within 13 days), `Next`, `Upcoming`.
- **Per-hire pills**, each independently green or grey: `💬 Slack ✓/—` (column C), `👥 Group ✓/—`
  (column P), `📦 Kit ✓/—` (column D), `🔐 Okta ✓/—` (Okta Activated), `💻 Device <date>/—`
  (Device Ship Date), and `🎯 <column A text>`.
- **Field states:** `Missing` (red) for personal email and location, `Pending` (orange) for work email,
  `—` for an empty job title, manager or start date.

Two behaviours worth warning a presenter about:

- The column-A pill is **always green**, whatever the text says. If someone types `Blocked` or
  `Not Started` into column A, it renders as a success pill. Column A is opaque free text to the code.
- Column P's test is inverted-tolerant: any non-empty value that isn't the literal string `false`
  renders `👥 Group ✓` — including `No`, `Pending`, `N/A` or a URL. Only an empty cell or `false`
  shows grey.

In this file the two systems line up as follows: 23 rows, all on cohorts `Sep 08, 2026` or earlier,
carry `Onboarded` in column A with B/C/D all `TRUE` and P/Q populated. The `Sep 21, 2026` and
`Sep 24, 2026` rows are partially provisioned — column A blank, B and C `TRUE`, kit (D) mixed, the
manual DM ticks in T/U still `FALSE`, and three of those rows (Maya Vasquez, Rohan Brown, Xavier
Morgan) still have `FALSE` in P with no Meet link in Q. Every cohort from `Oct 05, 2026` onward sits
at the freshly-created state: A blank, B/C/D `FALSE`, P `FALSE`, Q blank.

---

## 7. Connecting a safe demo automation

If you want to run the real automation against this data, do it from a **copy** of `Code.gs` in a
**separate Apps Script project** bound to a demo spreadsheet. Never repoint the production project.

Change these `CONFIG` entries — referred to by key name only:

| CONFIG key | Change to |
|---|---|
| `SPREADSHEET_ID` | The ID of your demo spreadsheet (the one you imported this xlsx into). |
| `TRACKER_SHEET_NAME` | Leave it alone — this file already uses the exact production tab name. |
| `SLACK_CHANNEL_*` (the general, IT/HR cross-functional, UK/EMEA and any cohort-channel keys) | IDs of throwaway channels in a sandbox Slack workspace, or empty so the posts are skipped. |
| `SLACK_BOT_TOKEN` / any Slack credential property | A sandbox-workspace token stored in Script Properties, never in the file. |
| The notification recipient / tagged-user ID lists (the people tagged in the non-US alert, the audit post and the Friday checklist) | Your own sandbox user ID, or an empty list. |
| The Google Group owner/member lists and the group-domain constant used to build the group address | A demo Google Workspace domain and a group you own. The dummy rows already point at `example.com`, which cannot receive mail. |
| `ARCHIVE_SPREADSHEET_ID` and the Pilot tracker ID (both hard-coded IDs in the dashboard helpers) | Empty or a demo copy — otherwise the dashboard silently merges real archive hires into your demo dataset. |
| `COHORT_DATES` | Leave as-is. This dummy data was built against the same 16 dates, so the cohort buttons and scanner branches line up. |
| `TIMEZONE` | Leave as-is — the dummy column G/H strings were generated for it. |

Also disable or delete the time-driven triggers on the copy before you run anything, then invoke the
scanners manually. Several of them send real Slack DMs on the first run.

> **Warning.** The production `Code.gs` contains **live Slack channel IDs, live Slack user IDs, real
> internal email addresses, real employee names in one-off fix helpers, and a real spreadsheet ID**.
> It must be sanitised before it is shared with anyone outside the team, attached to a ticket, pasted
> into a chat, or uploaded anywhere. Sanitising means replacing those values, not just deleting the
> obvious ones — check the one-off/backfill helper functions at the bottom of the file, which hard-code
> individual people and dates.

---

## 8. Regenerating

The deliverable is produced by **`./generate_dummy_tracker_CANONICAL.py`**:

```bash
cd "<project folder>"
chmod u+w NHO_Tracker_Dummy_Data.xlsx   # the file ships read-only (mode 0444)
python3 generate_dummy_tracker_CANONICAL.py
```

It is **deterministic**. `random.seed(42)` is set at the top, a second independent stream
(`random.Random(20260924)`) draws the Meet codes, and the reference date is the hard-coded constant
`TODAY = date(2026, 9, 11)` — `date.today()` is never called. The 44-entry roster and every lifecycle
depth are literals in the script. Re-running it on any machine, on any day, reproduces the same file,
and the script verifies its own output (it re-opens the workbook, re-checks the column contract, and
compares MD5s) before it finishes. It writes via a temp file and `os.replace`, then re-applies mode
`0444`.

Requires Python 3 with `openpyxl`.

> **Note on the other script in this folder.** `./generate_dummy_tracker.py`
> is an **earlier, superseded 21-column (A–U) generator**. It has been retargeted to write
> `SUPERSEDED_21col_tracker.xlsx` and no longer produces the deliverable — at one point both scripts
> hard-coded the same output path and raced each other. Run the `_CANONICAL` script; keep the other one
> only as history, or delete it. The same applies to `build_dummy_tracker.py` and the two
> `superseded_*.bak` files.

### If you change the data

Re-run `verify_dummy_tracker.py` afterwards. Anything you add by hand must satisfy section 4: column G
text `yyyy-MM-dd`, column H text `MMM dd, yyyy` with a zero-padded day, B/C/D real booleans, P either
boolean `false` or a URL, no columns inserted anywhere in A–R, and the `Department` / `Okta Activated`
/ `Device Ship Date` headers spelled exactly as they are now.
