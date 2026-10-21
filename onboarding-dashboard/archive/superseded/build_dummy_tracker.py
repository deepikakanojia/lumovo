# -*- coding: utf-8 -*-
"""
Builds NHO_Tracker_Dummy_Data.xlsx — a fully synthetic clone of the Onboarding tracker.

Structure (tab names, header row 7, column order A-Y, number formats, freeze panes)
mirrors the live tracker exactly so the onboarding Apps Script and the Cohort Dashboard work
unchanged.  Every person-identifying value is invented.
"""
import datetime as dt
import json
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter as L

# RETARGETED (repair round 3): second peer writer of the deliverable path.
# Canonical generator: /Users/azilen/.claude/jobs/cc36eb56/tmp/generate_dummy_tracker.py
OUT_XLSX = "SUPERSEDED_build_dummy_tracker.xlsx"
TAB      = "Cohort Tracker May - December 26"
TODAY    = dt.date(2026, 9, 11)          # demo "now"
D        = lambda s: dt.datetime.strptime(s, "%Y-%m-%d")
DATE     = lambda s: dt.datetime.strptime(s, "%Y-%m-%d").date()

# ── Fictional people ─────────────────────────────────────────────────────────
# HRBPs deliberately initial A/B/C/D, recruiters E..L — mnemonic like the
# "HRBP A / Recruiter B" placeholders, but readable on a dashboard.
HRBP = {"A": "Alexis Tran", "B": "Bianca Okoro", "C": "Colin Mercer", "D": "Dara Lindgren"}

# department -> HRBP, mirrors DEPT_HRBP_MAP in the onboarding Apps Script slot-for-slot
DEPT_HRBP = {
    "Customer Success": HRBP["A"], "Client Partnership": HRBP["A"],
    "CE&S Admin": HRBP["A"],       "Deployment": HRBP["A"],
    "Sales": HRBP["B"],            "Marketing": HRBP["B"],
    "Revenue Operations": HRBP["B"],
    "Engineering": HRBP["C"],      "Product": HRBP["C"],
    "Design": HRBP["C"],           "Data": HRBP["C"],
    "Recruiting": HRBP["D"],       "People": HRBP["D"],
    "Human Resources": HRBP["D"],  "Legal": HRBP["D"],
    "Finance": HRBP["D"],          "Accounting": HRBP["D"],
    "Operations": HRBP["D"],       "Behavioral Science": HRBP["C"],
    "Information Security": HRBP["C"], "Account Management": HRBP["B"],
    "Network Operations": HRBP["C"],
}
RECRUITERS = ["Elena Voss", "Felix Grant", "Georgia Pike", "Hugo Salas",
              "Imani Reid", "Jonas Brekke", "Kira Nolan", "Liam Ashby"]
MANAGERS   = ["Morgan Smith", "Jamie Wilson", "Riley Chen", "Priya Raman",
              "Marcus Delaney", "Nina Kovac", "Theo Barnes", "Sofia Marchetti",
              "Elias Fontaine", "Grace Abbott", "Omar Haddad", "Dana Whitfield"]

PERSONAL_DOMAIN = "example.com"     # personal email  -> alex.carter@example.com
WORK_DOMAIN     = "democo.example"  # work email      -> alex.carter@democo.example
                                    # .example is a reserved, non-routable TLD

def slug(first, last):
    return f"{first}.{last}".lower().replace(" ", "").replace("'", "")

def pmail(first, last): return f"{slug(first,last)}@{PERSONAL_DOMAIN}"
def wmail(first, last): return f"{slug(first,last)}@{WORK_DOMAIN}"
def mmail(full):
    f, _, l = full.partition(" ")
    return f"{slug(f,l)}@{WORK_DOMAIN}"

# ── Roster: (first, last, dept, job title, location) ─────────────────────────
# cohort -> list of hires.  Cohort dates are the real CONFIG.COHORT_DATES values
# so the dashboard's cohort buttons light up unchanged.
ROSTER = {
 "2026-05-11": [
   ("Alex","Carter","Client Partnership","Principal Client Partner","Austin, Texas, United States"),
   ("Jordan","Lee","Engineering","Staff Software Engineer","Toronto, Ontario, Canada"),
   ("Taylor","Morgan","Customer Success","Senior Customer Success Manager","Denver, Colorado, United States"),
 ],
 "2026-05-25": [
   ("Casey","Brown","Sales","Senior Enterprise Account Executive","Chicago, Illinois, United States"),
   ("Rowan","Okafor","Design","Senior Product Designer","London, England, United Kingdom"),
 ],
 "2026-06-08": [
   ("Avery","Nguyen","Engineering","Senior Backend Engineer","Singapore"),
   ("Quinn","Patel","Product","Principal Product Manager","Seattle, Washington, United States"),
   ("Skyler","Rivera","Deployment","Client Delivery Director","Miami, Florida, United States"),
   ("Devon","Novak","Finance","Senior Financial Analyst","Boston, Massachusetts, United States"),
 ],
 "2026-06-22": [
   ("Harper","Bennett","Client Partnership","Vice President, Client Partner","New York, New York, United States"),
   ("Emerson","Hale","Behavioral Science","Senior Behavioral Scientist","Amsterdam, Netherlands"),
   ("Finley","Iyer","Engineering","Senior AI Automation Engineer","Bengaluru, India"),
 ],
 "2026-07-06": [
   ("Kendall","Kowalski","Sales","Account Director, Strategic","Dallas, Texas, United States"),
   ("Logan","Larsen","Customer Success","Customer Success Manager","Sydney, NSW, Australia"),
   ("Marley","Ferraro","Engineering","Engineering Intern","San Luis Obispo, California, United States"),
   ("Nico","Osei","Engineering","Engineering Intern","Manchester, England, United Kingdom"),
   ("Peyton","Pruitt","Legal","Senior Commercial Counsel","Portland, Oregon, United States"),
 ],
 "2026-07-20": [
   ("Reese","Quintero","Account Management","Senior Account Manager","Vancouver, British Columbia, Canada"),
   ("Sawyer","Rashid","Deployment","Deployment Manager","Berlin, Germany"),
 ],
 "2026-08-03": [
   ("Tatum","Sorensen","Client Partnership","Principal Client Partner","Minneapolis, Minnesota, United States"),
   ("Wren","Tanaka","Data","Senior Data Analyst","Singapore"),
   ("Blake","Underwood","People","People Operations Partner","Atlanta, Georgia, United States"),
 ],
 "2026-08-17": [
   ("Cameron","Vargas","Sales","Senior Enterprise Account Executive, EMEA","Madrid, Spain"),
   ("Dakota","Walsh","Customer Success","Senior Customer Success Manager","Dublin, Ireland"),
   ("Ellis","Yamada","Engineering","Senior Frontend Engineer","Tokyo, Japan"),
   ("Frankie","Zielinski","Information Security","Security Engineer","Phoenix, Arizona, United States"),
 ],
 "2026-08-31": [
   ("Greer","Ashford","Client Partnership","Client Partner","Charlotte, North Carolina, United States"),
   ("Hayden","Beaumont","Marketing","Product Marketing Manager","Toronto, Ontario, Canada"),
 ],
 # ── next cohort (today is 2026-09-11) ────────────────────────────────────
 "2026-09-14": [
   ("Jamie","Castellanos","Sales","Enterprise Account Executive","Houston, Texas, United States"),
   ("Kai","Duarte","Engineering","Senior Platform Engineer","Lisbon, Portugal"),
   ("Lennox","Ellery","Customer Success","Customer Advocate","Salt Lake City, Utah, United States"),
   ("Micah","Fontaine","Product","Senior Product Manager","Montreal, Quebec, Canada"),
   ("Noor","Grayson","Deployment","Deployment Specialist","Singapore"),
 ],
 # ── upcoming — includes the 24 September multi-hire day ──────────────────
 "2026-09-28": [
   ("Orla","Holloway","Client Partnership","Principal Client Partner","San Diego, California, United States"),
   ("Remy","Ibarra","Engineering","Staff Software Engineer","Austin, Texas, United States"),
   ("Sasha","Jensen","Sales","Senior Enterprise Account Executive","London, England, United Kingdom"),
   ("Teagan","Kerrigan","Recruiting","Technical Recruiter","Ottawa, Ontario, Canada"),
   ("Wilder","Lindqvist","Finance","Finance Manager","Stockholm, Sweden"),
   ("Zara","Maddox","Design","Product Designer","Melbourne, Victoria, Australia"),
 ],
 "2026-10-12": [
   ("Ainsley","Nakamura","Engineering","Senior Data Engineer","Singapore"),
   ("Brennan","Oyelaran","Customer Success","Customer Success Manager","Lagos, Nigeria"),
   ("Corin","Pereira","Client Partnership","Client Partner","Sao Paulo, Brazil"),
 ],
 "2026-10-26": [
   ("Delphine","Radcliffe","Legal","Commercial Counsel","London, England, United Kingdom"),
   ("Emory","Stavros","Network Operations","Network Operations Engineer","Chicago, Illinois, United States"),
 ],
 "2026-11-09": [
   ("Frey","Whitlock","Sales","Vice President, Key Accounts","New York, New York, United States"),
   ("Giles","Ashcombe","Engineering","Engineering Manager","Toronto, Ontario, Canada"),
 ],
 "2026-11-23": [
   ("Halle","Brightwater","People","Senior People Partner","Denver, Colorado, United States"),
 ],
 "2026-12-07": [
   ("Ines","Calloway","Product","Principal Product Manager","Barcelona, Spain"),
 ],
}

# Joining dates that deliberately differ from the cohort Monday (off-cycle hires
# who roll into the *next* cohort).  Keyed by "First Last".
# The 24 September group is the demo case the dashboard filter is shown with.
OFF_CYCLE = {
    "Orla Holloway":  "2026-09-24",   # ── 24 Sep → 4 new hires ──
    "Remy Ibarra":    "2026-09-24",
    "Sasha Jensen":   "2026-09-24",
    "Teagan Kerrigan":"2026-09-24",
    "Devon Novak":    "2026-06-01",
    "Emerson Hale":   "2026-06-15",
    "Nico Osei":      "2026-06-29",
    "Blake Underwood":"2026-07-27",
    "Frankie Zielinski":"2026-08-10",
    "Noor Grayson":   "2026-09-08",
    "Corin Pereira":  "2026-10-05",
}

# Deliberate data gaps so the dashboard's Missing/Pending states and
# runTrackerAudit() have something to report.
NO_PERSONAL_EMAIL = {"Wren Tanaka", "Emory Stavros"}
NO_WORK_EMAIL     = {"Halle Brightwater", "Ines Calloway", "Zara Maddox"}
NO_LOCATION       = {"Devon Novak", "Frey Whitlock", "Giles Ashcombe"}
NO_MANAGER_EMAIL  = {"Nico Osei", "Delphine Radcliffe"}

FREEFORM_NOTES = {
    "Marley Ferraro": "Intern cohort — attends Day 1 and Day 3 sessions only.",
    "Emerson Hale":   "Off-cycle start; rolled into the following cohort.",
    "Frey Whitlock":  "Exec onboarding path — 1:1 orientation instead of group onboarding.",
}

# ── Row assembly ─────────────────────────────────────────────────────────────
COHORTS = sorted(ROSTER)
NEXT_COHORT = next(c for c in COHORTS if DATE(c) >= TODAY)

def phase(cohort):
    if DATE(cohort) < TODAY:      return "past"
    if cohort == NEXT_COHORT:     return "next"
    return "upcoming"

HEADERS = ["CTA Status ", "Manager Email Sent ", "Slack ", "New Hire Kit\n Ordered",
           "First Name", "Last Name", "Joining Date", "Next Cohort Date",
           "Personal Email", "Work Email", "Job Title", "Manager Name",
           "Manager Email", "HRBP", "Notes", "Google Group Created",
           "Welcome Calll Invitation Sent?", "Location", "Dashboard Link ",
           "DM to manager ", "DM to new hire ", "HRBP from sheet ", "Department",
           "Okta Activated", "Device Ship Date"]

def build_rows():
    rows, n = [], 0
    for cohort in COHORTS:
        ph      = phase(cohort)
        cdate   = DATE(cohort)
        group_url = f"https://groups.google.com/a/democo.example/g/{cdate:%m-%d-%Y}-onboarding-cohort"
        for j, (first, last, dept, title, loc) in enumerate(ROSTER[cohort]):
            full     = f"{first} {last}"
            mgr      = MANAGERS[n % len(MANAGERS)]
            recruit  = RECRUITERS[n % len(RECRUITERS)]
            join     = DATE(OFF_CYCLE[full]) if full in OFF_CYCLE else cdate
            hrbp     = DEPT_HRBP.get(dept, "")

            # ── status block, driven purely by cohort phase ──
            if ph == "past":
                cta   = "Joined" if n % 11 == 4 else "Onboarded"
                mgr_email_sent = slack = kit = group = welcome = True
                dm_mgr = dm_hire = cdate >= dt.date(2026, 8, 17)
                okta  = f"✓ {cdate - dt.timedelta(days=1):%Y-%m-%d}"
                ship  = D(f"{cdate - dt.timedelta(days=5):%Y-%m-%d}")
            elif ph == "next":
                cta   = "Welcome Call Sent" if j < 3 else "Slack Channel Created"
                mgr_email_sent = slack = group = welcome = True
                kit   = j % 2 == 0
                dm_mgr = dm_hire = True
                okta  = ""
                ship  = D(f"{cdate - dt.timedelta(days=5):%Y-%m-%d}")
            else:
                soon  = (cdate - TODAY).days <= 21          # 2026-09-28 cohort
                cta   = "Pending" if (soon and j % 3 == 0) else "Upcoming"
                mgr_email_sent = soon and j % 2 == 0
                slack = False
                kit   = soon and j % 3 != 1
                group = False
                welcome = soon and j % 2 == 1
                dm_mgr = dm_hire = False
                okta  = ""
                ship  = D(f"{cdate - dt.timedelta(days=5):%Y-%m-%d}") if soon else None

            notes = FREEFORM_NOTES.get(full, f"Dept: {dept} | Recruiter: {recruit}")

            row = [
                cta,                                                        # A
                mgr_email_sent,                                             # B
                slack,                                                      # C
                kit,                                                        # D
                first,                                                      # E
                last,                                                       # F
                D(f"{join:%Y-%m-%d}"),                                      # G
                D(cohort),                                                  # H
                "" if full in NO_PERSONAL_EMAIL else pmail(first, last),    # I
                "" if full in NO_WORK_EMAIL else wmail(first, last),        # J
                title,                                                      # K
                mgr,                                                        # L
                "" if full in NO_MANAGER_EMAIL else mmail(mgr),             # M
                hrbp,                                                       # N
                notes,                                                      # O
                (group_url if (ph == "past" and j == 0 and n % 7 == 0)      # P
                 else group),
                welcome,                                                    # Q
                "" if full in NO_LOCATION else loc,                         # R
                "",                                                         # S
                dm_mgr,                                                     # T
                dm_hire,                                                    # U
                hrbp if ph != "upcoming" else "",                           # V
                dept,                                                       # W
                okta,                                                       # X
                ship,                                                       # Y
            ]
            rows.append(row)
            n += 1
    return rows

ROWS = build_rows()

# ── Workbook ─────────────────────────────────────────────────────────────────
HDR_FILL = PatternFill("solid", fgColor="D9D9D9")
HDR_FONT = Font(bold=True)

wb = openpyxl.Workbook()
ws = wb.active
ws.title = TAB

# rows 1-6: preamble, same shape as the live tracker (no real content)
ws["A1"] = "NEW HIRE COHORT TRACKING"; ws["A1"].font = Font(bold=True, size=14)
ws["G1"] = "DEMO TRACKER — 100% synthetic data. Safe for training and handover."
ws["H1"] = "IWD 1: Friday, March 20, 2026"
ws["H2"] = "IWD 2: Friday, April 10, 2026"
ws["H3"] = "IWD 3: Friday, August 7, 2026"
ws["H4"] = "IWD 4: Friday, September 25, 2026"
ws["I1"] = "Company Breaks 2026"
for r, (label, date) in enumerate([
        ("End of Winter Break (New Year's Day)", "2026-01-01"),
        ("Start Summer Break",                   "2026-06-29"),
        ("End Summer Break",                     "2026-07-03"),
        ("Start Winter Break",                   "2026-12-24"),
        ("End Winter Break (New Year's Day)",    "2027-01-01")], start=2):
    ws.cell(r, 9, label)
    ws.cell(r, 10, D(date)).number_format = "yyyy-mm-dd"
ws["O1"] = "Recruiter"; ws["V1"] = "HRBP (Auto)"; ws["W1"] = "Department"

# row 7: headers (labels byte-identical to the live tracker, trailing spaces incl.)
for c, h in enumerate(HEADERS, start=1):
    cell = ws.cell(7, c, h)
    cell.font, cell.fill = HDR_FONT, HDR_FILL
    cell.alignment = Alignment(wrap_text=True, vertical="bottom")

# rows 8+: data
for i, row in enumerate(ROWS, start=8):
    for c, v in enumerate(row, start=1):
        if v is None or v == "":
            continue
        ws.cell(i, c, v)
    ws.cell(i, 7).number_format = "yyyy-mm-dd"    # G Joining Date
    ws.cell(i, 8).number_format = "mmm d, yyyy"   # H Next Cohort Date
    ws.cell(i, 25).number_format = "yyyy-mm-dd"   # Y Device Ship Date

for col, w in {"A":16.5,"B":13.13,"C":14.75,"D":13.0,"E":16.88,"F":13.88,"G":13.38,
               "H":16.5,"I":35.88,"J":30.5,"K":34.88,"L":17.88,"M":26.88,"N":18.13,
               "O":28.13,"P":22.0,"Q":26.0,"R":34.0,"S":16.0,"T":15.0,"U":15.0,
               "V":18.0,"W":20.0,"X":16.0,"Y":16.0}.items():
    ws.column_dimensions[col].width = w
ws.freeze_panes = "A8"

# ── Errors tab (written to by logError_ in the onboarding Apps Script) ──────────────────────
we = wb.create_sheet("Errors")
for c, h in enumerate(["Timestamp","Error Type","First Name","Last Name","Message"], 1):
    we.cell(1, c, h).font = HDR_FONT
for col, w in {"A":20,"B":24,"C":16,"D":16,"E":70}.items():
    we.column_dimensions[col].width = w

# ── "List " tab — dropdown / lookup source (note the trailing space) ─────────
wl = wb.create_sheet("List ")
LIST_COLS = {
  "Departments": sorted(set(DEPT_HRBP)),
  "Recruiters":  RECRUITERS,
  "Locations":   ["US", "EMEA", "APAC", "LATAM", "Canada"],
  "Offer Status":["Accepted", "Pending", "Rescinded"],
  "BGC Status":  ["Cleared", "Pending", "Failed"],
  "Conversion":  ["No", "Yes"],
  "Onboarding Track":   ["Full CTA", "Async Only", "Executive Path"],
  "HRBP":        [HRBP["A"], HRBP["B"], HRBP["C"], HRBP["D"]],
}
for c, (head, vals) in enumerate(LIST_COLS.items(), start=1):
    wl.cell(1, c, head).font = HDR_FONT
    for r, v in enumerate(vals, start=2):
        wl.cell(r, c, v)
    wl.column_dimensions[L(c)].width = max(14, len(head) + 6)

# ── "Imp Links" tab ──────────────────────────────────────────────────────────
wi = wb.create_sheet("Imp Links")
wi["A1"] = "Dashboard Link"; wi["C1"] = "HRBP Sheet"; wi["E1"] = "TA source of Truth"
for a in ("A1","C1","E1"): wi[a].font = HDR_FONT
wi["A2"] = "New Hire dashboard (demo)"
wi["C2"] = "HRBP (demo)"
wi["E2"] = "TA source of truth (demo)"
wi["A4"] = "CTA_Quest_Issue_Tracker (demo)"
for col, w in {"A":30,"B":6,"C":24,"D":6,"E":26}.items():
    wi.column_dimensions[col].width = w

wb.save(OUT_XLSX)

# ── JSON side-car, consumed by the Apps Script seeder ────────────────────────
def jsonify(v):
    if isinstance(v, dt.datetime): return {"__date__": v.strftime("%Y-%m-%d")}
    return v
with open("dummy_hires.json", "w") as f:
    json.dump({"tab": TAB, "headerRow": 7, "firstDataRow": 8,
               "rows": [[jsonify(v) for v in r] for r in ROWS],
               "headers": HEADERS}, f, indent=1)

# ── Summary ──────────────────────────────────────────────────────────────────
from collections import Counter
print(f"wrote {OUT_XLSX}: {len(ROWS)} synthetic hires, rows 8-{7+len(ROWS)}")
print(f"next cohort (today={TODAY}): {NEXT_COHORT}")
print("\nhires per cohort (col H, drives the dashboard buttons):")
for c in COHORTS:
    print(f"   {c}  {len(ROSTER[c]):>2}   [{phase(c)}]")
print("\njoining dates with >1 hire (col G, drives date filtering):")
jd = Counter(r[6].strftime("%Y-%m-%d") for r in ROWS)
for d_, k in sorted(jd.items()):
    if k > 1: print(f"   {d_}  ->  {k} new hires")
print("\nCTA Status spread:", dict(Counter(r[0] for r in ROWS)))
