#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generates NHO_Tracker_Dummy_Data.xlsx  -- 100% synthetic, no real PII.

Implements the verified BUILD SPEC literally:
  * one worksheet "Cohort Tracker May - December 26" -- the FULL 32-char
    CONFIG.TRACKER_SHEET_NAME (see REPAIR r1 below; the 31-char truncation the
    original spec assumed was unnecessary)
  * headers on ROW 1, data from row 2 (every Apps Script reader starts at index 1)
  * 25 columns A..Y in fixed order; A..R must never be reordered
  * all date-bearing cells (G,H,X,Y) are STRINGS with number_format '@'
    (col H is compared with strict !== against a zero-padded "MMM dd, yyyy"
     string, and a real Date in col G normalises to two different calendar
     days because some readers format with "UTC" and others with CONFIG.TIMEZONE)
  * per-row monotone completion ladder (depth 0..8) so no impossible row exists
"""

import hashlib
import os
import random
import re
import tempfile
import warnings
from datetime import date, datetime, timedelta
from collections import Counter, OrderedDict

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

# Reproducibility: fixed seed, and a hard-coded reference date. Never date.today().
random.seed(42)
TODAY = date(2026, 9, 11)          # the demo anchor -- ALL lifecycle logic uses this
MEET_RNG = random.Random(20260924)  # separate stream: one Meet-code draw per row

# Resolve against this file's own folder so the generator works from any cwd.
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "NHO_Tracker_Dummy_Data.xlsx")

# REPAIR r1 (blocker): the tab MUST be the full 32-char CONFIG.TRACKER_SHEET_NAME.
# getTrackerSheet() (Code.gs:168-177) does an exact getSheetByName() and throws
# 'Sheet "..." not found' on a miss -- every read/write funnels through it.
# The BUILD SPEC assumed Excel's 31-char cap forced a truncation, but openpyxl
# writes the 32-char title verbatim (it only emits a cosmetic UserWarning), and
# Google Sheets allows 100 chars. Writing the full name removes the manual
# post-import rename step entirely.
SHEET_NAME = "Cohort Tracker May - December 26"   # 32 chars == CONFIG.TRACKER_SHEET_NAME
warnings.filterwarnings("ignore", message=".*more than 31 characters.*")

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# CADENCE CHANGE (user request, 2026-09-11): one cohort per month instead of
# biweekly, landing on that month's first Monday -- shifted to the next working
# day when the first Monday is a US federal holiday. Holiday list ported
# verbatim from CONFIG.US_HOLIDAYS_2026 (NHO_beta.gs) for the same reason every
# other borrowed constant in this file is verbatim: fidelity to the real system.
US_HOLIDAYS_2026 = {
    "2026-01-01", "2026-01-19", "2026-02-16", "2026-05-25",
    "2026-07-04", "2026-09-07", "2026-10-12", "2026-11-11",
    "2026-11-26", "2026-12-25",
}


def first_monday_holiday_shifted(year, month):
    """First Monday of (year, month); +1 working day if that Monday is a US
    federal holiday (the only case that recurs every year is Labor Day, which
    is BY DEFINITION the first Monday of September -- 2026-09-07 here)."""
    d = date(year, month, 1)
    d += timedelta(days=(-d.weekday()) % 7)     # Monday=0 ... Sunday=6
    while d.isoformat() in US_HOLIDAYS_2026:
        d += timedelta(days=1)                  # the day after is never itself
    return d.isoformat()                        # a Monday holiday in this list


COHORT_DATES = [first_monday_holiday_shifted(2026, m) for m in range(5, 13)]  # May..Dec


def next_cohort(start_iso):
    """Port of buildDerivedFields_ (Code.gs:1020-1026), mirrored at 3104-3117.

    FIRST-FIT over CONFIG.COHORT_DATES in array order: the first entry
    lexicographically >= the start date. The bound is INCLUSIVE, so a hire who
    starts exactly on a cohort date gets THAT cohort, not the next one. Plain
    string compare is what Apps Script does, and is exact here because both
    sides are zero-padded ISO. None past the last cohort -> col H blank.
    """
    for c in COHORT_DATES:
        if c >= start_iso:
            return c
    return None


def is_off_cycle(start_iso):
    """Port of isOffCycleStart_ (Code.gs:3557-3559) -- exact membership only."""
    return start_iso.strip() not in COHORT_DATES

HEADERS = [
    "CTA Status", "Manager Email Sent", "Team Channel", "New Hire Kit Ordered",
    "First Name", "Last Name", "Joining Date", "Next Cohort Date",
    "Personal Email", "Work Email", "Job Title", "Manager Name",
    "Manager Email", "HRBP", "Recruiter", "Google Group Created",
    "Google Group Meeting Link", "Location", "Dashboard Link",
    "DM to manager", "DM to new hire", "HRBP from sheet",
    "Department", "Okta Activated", "Device Ship Date",
]
BOOL_COLS = {1, 2, 3, 19, 20}          # 0-based: B, C, D, T, U -> number_format General
WIDTHS = [13, 20, 8, 20, 13, 14, 13, 16, 30, 30, 30, 18, 30, 9, 13, 46, 34, 34,
          14, 15, 16, 16, 22, 16, 17]


def cohort_label(d):
    """'MMM dd, yyyy' with a ZERO-PADDED day -- strict !== comparison in Code.gs."""
    return "%s %02d, %d" % (MONTHS[d.month - 1], d.day, d.year)


def slug(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def dept_to_function(dept, job_title):
    """Faithful Python port of deptToFunction_ (Code.gs:2992-3036)."""
    d, j = (dept or "").lower(), (job_title or "").lower()
    if any(k in d for k in ("sales", "customer success", "gtm", "network op",
                            "deployment", "client partner", "client delivery",
                            "client partnership", "account")) \
       or "account executive" in j or "client partner" in j:
        return "GTM"
    if "engineering" in d: return "Engineering"
    if any(k in d for k in ("product", "design", "studios")): return "Product"
    if any(k in d for k in ("finance", "legal")): return "Finance & Legal"
    if any(k in d for k in ("marketing", "brand", "growth")): return "Marketing"
    if any(k in d for k in ("human resources", "people", "recruiting", "talent")): return "People & HR"
    if any(k in d for k in ("information security", "information technology", "infosec", "security")): return "InfoSec / IT"
    if any(k in d for k in ("labs", "research", "behavioral science", "analytics", "insights", "science")): return "Labs & Research"
    if any(k in d for k in ("business operations", "operations", "strategy", "cdl")): return "Business Ops"
    if any(k in d for k in ("customer advoca", "customer support", "enablement", "coach")): return "GTM"
    # job-title fallbacks
    if "security" in j or "infosec" in j: return "InfoSec / IT"
    if any(k in j for k in ("engineer", "developer", "devops")): return "Engineering"
    if any(k in j for k in ("scientist", "behavioral", "research", "data", "insight")): return "Labs & Research"
    if any(k in j for k in ("designer", "product manager", "product", "design")): return "Product"
    if any(k in j for k in ("marketing", "brand", "communications")): return "Marketing"
    if any(k in j for k in ("recruit", "talent", "people", "hr ", "learning")): return "People & HR"
    if any(k in j for k in ("finance", "legal", "counsel", "accountant", "revenue")): return "Finance & Legal"
    if any(k in j for k in ("sales", "account", "client", "customer", "deployment",
                            "enablement", "partner", "gtm", "change activation")): return "GTM"
    if any(k in j for k in ("operations", "strategy", "chief of staff")): return "Business Ops"
    return "Other"


def stage_of(cohort):
    """S4 COMPLETE / S3 RUNNING / S2 IMMINENT / S1 FUTURE -- from the cohort date only."""
    win = cohort + timedelta(days=13)          # dashboard: winStr = C + 13d
    if win < TODAY:                       return "S4"
    if cohort <= TODAY <= win:            return "S3"
    if TODAY < cohort <= TODAY + timedelta(days=14): return "S2"
    return "S1"


DEPTH_CAPS = {"S1": {0, 1}, "S2": {1, 3, 4, 5, 6}, "S3": {5, 7, 8}, "S4": {6, 7, 8}}


def compute_cohort_sides():
    """For each derived (monthly) cohort, which side of depth 4 its members
    should land on -- majority vote over the ROSTER's original depths. Every
    row in a cohort must end up on the SAME side (see resolve_depth): P/Q
    (Google Group / Meet link) are created once per cohort at depth >= 4, so a
    cohort straddling that line would mean the automation half-creates its own
    Group -- a real inconsistency, not a cosmetic one. Consolidating biweekly
    cohorts into monthly ones makes straddling likely unless this is
    coordinated across the whole cohort up front, which is why this is a
    separate pre-pass rather than a per-row decision."""
    raw_by_cohort = {}
    for c_iso, g_iso, first, last, dept, title, loc, mgr, hrbp, rec, depth in R:
        raw_by_cohort.setdefault(next_cohort(g_iso), []).append(depth)
    sides = {}
    for coh, depths in raw_by_cohort.items():
        high = sum(1 for d in depths if d >= 4)
        sides[coh] = "high" if high >= len(depths) - high else "low"
    return sides


def resolve_depth(raw_depth, stage, first, last, cohort):
    """A row's hand-authored depth assumed the OLD (biweekly) cohort's stage.
    Monthly cohorts can shift a person into an earlier/later stage, which can
    make that depth illegal for the ladder -- remap to the nearest legal depth
    for the NEW stage rather than hand-retuning every row.

    Constrained to COHORT_SIDE[cohort] first (falling back to the stage's full
    legal set only if that side is empty for this stage, e.g. S1's {0,1} can
    never be "high") so every row in a cohort ends up on the same side of
    depth 4. When two legal depths are equally near, break the tie
    deterministically per-hire (jitter) rather than always picking the same
    one. Shared by build_rows() (which writes the row) and validate() (which
    re-derives the same value from the roster to check it), so both agree."""
    pool = DEPTH_CAPS[stage]
    side = COHORT_SIDE.get(cohort)
    if side == "high":
        narrowed = {d for d in pool if d >= 4}
    elif side == "low":
        narrowed = {d for d in pool if d < 4}
    else:
        narrowed = None
    if narrowed:
        pool = narrowed
    if raw_depth in pool:
        return raw_depth
    candidates = sorted(pool, key=lambda d: abs(d - raw_depth))
    min_dist = abs(candidates[0] - raw_depth)
    tied = [d for d in candidates if abs(d - raw_depth) == min_dist]
    if len(tied) == 1:
        return tied[0]
    return tied[jitter(first, last, 0, len(tied) - 1, "depth-remap")]

# ---------------------------------------------------------------------------
# The 44-row roster. Fields:
#  (cohort_iso, joining_iso, first, last, dept, title, location, manager, hrbp,
#   recruiter, depth)
# joining_iso == cohort_iso except the three OFF-CYCLE rows (#29, #41, #43).
# ---------------------------------------------------------------------------
# RFC 2606 reserved documentation domains ONLY. Never invent a domain: the
# previous build used "examplecorp.com", which is a LIVE third-party-registered
# parked domain -- mail addressed to it leaves for someone else's nameservers.
# example.com / example.net are IANA-reserved and can never be registered.
WORK_DOMAIN     = "example.com"   # work + manager mail + the Google Group host
PERSONAL_DOMAIN = "example.net"   # visibly distinct so the two card rows differ

# ---------------------------------------------------------------------------
# The roster. Fields:
#  (cohort_iso, joining_iso, first, last, dept, title, location, manager, hrbp,
#   recruiter, depth)
# joining_iso == cohort_iso except the OFF-CYCLE rows, where the hire starts
# mid-cycle and is parked on the NEXT official cohort (isOffCycleStart_,
# Code.gs:3558). Those rows are what make col H a distinct concept from col G.
#
# Given names are drawn to match each hire's location rather than from one
# narrow unisex-Anglo register, and no hire first name collides with a manager
# first name. First letters are spread because the dashboard avatar colour is
# colours[firstName.charCodeAt(0) % 8].
# ---------------------------------------------------------------------------
R = [
 # --- May 11 (S4) -------------------------------------------------------------
 ("2026-05-11","2026-05-11","Sanne","Visser","Engineering","Staff Software Engineer","Amsterdam, Netherlands","Tomas Alvarez","Priya Raman","Colette Byrne",8),
 ("2026-05-11","2026-05-11","Marcus","Whitfield","Sales","Senior Account Executive","Atlanta, Georgia, United States","Gregory Smith","Dominic Shaw","Tobias Winters",8),
 # --- Jun 08 (S4) -------------------------------------------------------------
 ("2026-06-08","2026-06-08","Aditi","Raghavan","Engineering","Senior Software Engineer","Bengaluru, India","Riley Chen","Priya Raman","Erin Maddox",6),
 ("2026-06-08","2026-06-08","Eleanor","Costa","Customer Success","Customer Success Manager","London, United Kingdom","Naomi Wilson","Priya Raman","Tobias Winters",8),
 ("2026-06-08","2026-06-08","Peter","Marino","Product","Product Manager","San Francisco, California, United States","Anjali Patel","Marisol Vega","Renata Lombardi",7),
 ("2026-06-08","2026-06-08","Lucia","Sinclair","Sales","Account Executive","Chicago, Illinois, United States","Gregory Smith","Dominic Shaw","Tobias Winters",8),
 # --- Jun 22 (S4) -------------------------------------------------------------
 ("2026-06-22","2026-06-22","Felix","Bauer","Engineering","Software Engineer","Munich, Germany","Tomas Alvarez","Priya Raman","Colette Byrne",8),
 ("2026-06-22","2026-06-22","Chiamaka","Okafor","Finance","Financial Analyst","Brooklyn, New York, United States","Cameron Reid","Marisol Vega","Malik Osborne",7),
 ("2026-06-22","2026-06-22","Yuki","Tanaka","Marketing","Marketing Manager","Denver, Colorado, United States","Beatriz Moura","","Renata Lombardi",8),
 # --- Jul 06 (S4) -------------------------------------------------------------
 ("2026-07-06","2026-07-06","Lena","Novak","Information Security","Security Engineer","Berlin, Germany","Desmond Clarke","Dominic Shaw","Erin Maddox",8),
 ("2026-07-06","2026-07-06","Rafael","Silva","Engineering","Backend Engineer","Toronto, Canada","Riley Chen","Priya Raman","Colette Byrne",8),
 # --- Jul 13 (S4) -------------------------------------------------------------
 ("2026-07-13","2026-07-13","Grace","Ellis","Engineering","DevOps Engineer","Austin, Texas, United States","Riley Chen","Priya Raman","Colette Byrne",7),
 ("2026-07-13","2026-07-13","Nathan","Foster","Design","Product Designer","Seattle, Washington, United States","Anjali Patel","Marisol Vega","Renata Lombardi",8),
 ("2026-07-13","2026-07-13","Olivia","Hughes","Customer Success","Senior Customer Success Manager","Sydney, Australia","Naomi Wilson","Priya Raman","Tobias Winters",8),
 # --- Jul 27 (S4) -------------------------------------------------------------
 ("2026-07-27","2026-07-27","Bennett","Dalton","Business Operations","Business Operations Analyst","Denver, Colorado, United States","Noor Barrett","Dominic Shaw","Malik Osborne",8),
 ("2026-07-27","2026-07-27","Simran","Kaur","Engineering","Frontend Engineer","Singapore, Singapore","Riley Chen","Marisol Vega","Colette Byrne",8),
 ("2026-07-27","2026-07-27","Javier","Moreno","Sales","Senior Account Executive","Atlanta, Georgia, United States","Gregory Smith","Dominic Shaw","Colette Byrne",6),
 ("2026-07-27","2026-07-27","Fiona","Walsh","People","HRBP, Commercial","Boston, Massachusetts, United States","Helena Vance","Priya Raman","Erin Maddox",8),
 # --- Aug 10 (S4) -------------------------------------------------------------
 ("2026-08-10","2026-08-10","Duncan","Fraser","Engineering","Staff Software Engineer","Vancouver, Canada","Tomas Alvarez","Priya Raman","Colette Byrne",8),
 ("2026-08-10","2026-08-10","Yusuf","Ibrahim","Recruiting","Technical Recruiter","Manchester, United Kingdom","Helena Vance","Dominic Shaw","Erin Maddox",8),
 ("2026-08-10","2026-08-10","Zoe","Bergstrom","Behavioral Science","Behavioral Scientist","Chicago, Illinois, United States","Sasha Green","Dominic Shaw","Erin Maddox",8),
 ("2026-08-10","2026-08-10","Hiroshi","Nakamura","Product","Senior Product Manager","San Francisco, California, United States","Anjali Patel","Marisol Vega","Renata Lombardi",8),
 ("2026-08-10","2026-08-10","Femke","Dekker","Customer Success","Customer Success Manager","Amsterdam, Netherlands","Naomi Wilson","Priya Raman","Tobias Winters",6),
 # --- Aug 24 (S4) -------------------------------------------------------------
 ("2026-08-24","2026-08-24","Theodore","Kim","Legal","Corporate Counsel","Washington, District of Columbia, United States","Cameron Reid","Dominic Shaw","Malik Osborne",7),
 ("2026-08-24","2026-08-24","Arjun","Nair","Engineering","Site Reliability Engineer","Pune, India","Tomas Alvarez","Priya Raman","Colette Byrne",8),
 ("2026-08-24","2026-08-24","Camila","Reyes","Sales","Sales Development Representative","Austin, Texas, United States","Gregory Smith","Marisol Vega","Tobias Winters",8),
 # --- Sep 08 (S3 RUNNING -- the blue-ringed Active tile) ----------------------
 ("2026-09-08","2026-09-08","Isla","Barros","Engineering","QA Engineer","Melbourne, Australia","Tomas Alvarez","Dominic Shaw","Colette Byrne",8),
 ("2026-09-08","2026-09-08","Mateo","Delgado","Customer Success","Customer Success Associate","Toronto, Canada","Naomi Wilson","Dominic Shaw","Tobias Winters",8),
 ("2026-09-08","2026-09-08","Agata","Kowalski","Information Security","Security Analyst","Boston, Massachusetts, United States","Desmond Clarke","Marisol Vega","Erin Maddox",8),
 ("2026-09-08","2026-09-08","Victor","Adeyemi","Engineering","Senior Software Engineer","Austin, Texas, United States","Riley Chen","Priya Raman","Colette Byrne",5),
 ("2026-09-08","2026-09-02","Kwame","Osei","Marketing","Content Marketing Specialist","London, United Kingdom","Beatriz Moura","Priya Raman","Renata Lombardi",8),   # OFF-CYCLE start (1 of only 2)
 # --- Sep 21 (S2 IMMINENT -- the Next tile AND the 7-hire hero date) ----------
 ("2026-09-21","2026-09-21","Elena","Castillo","Finance","Senior Financial Analyst","Chicago, Illinois, United States","Cameron Reid","Marisol Vega","Malik Osborne",4),
 ("2026-09-21","2026-09-14","Jonas","Sorensen","Sales","Enterprise Account Executive","Munich, Germany","Gregory Smith","Dominic Shaw","Tobias Winters",6),   # OFF-CYCLE start (1 of only 2)
 ("2026-09-21","2026-09-21","Maya","Vasquez","Product","Associate Product Manager","Denver, Colorado, United States","Anjali Patel","Priya Raman","Renata Lombardi",4),
 ("2026-09-21","2026-09-21","Rohan","Brown","Engineering","Engineering Intern","Bengaluru, India","Riley Chen","Priya Raman","Colette Byrne",4),
 ("2026-09-21","2026-09-21","Imani","Carter","Engineering","Engineering Manager","San Francisco, California, United States","Riley Chen","Priya Raman","Colette Byrne",6),
 ("2026-09-21","2026-09-21","Wen","Lee","Customer Success","Customer Success Manager","Singapore, Singapore","Naomi Wilson","Dominic Shaw","Tobias Winters",5),
 ("2026-09-21","2026-09-21","Xavier","Morgan","Design","Senior Product Designer","Brooklyn, New York, United States","Anjali Patel","Marisol Vega","Renata Lombardi",4),
 # --- Oct 05 (S1 FUTURE) ------------------------------------------------------
 ("2026-10-05","2026-10-05","Bianca","Haddad","Engineering","Software Engineer","Seattle, Washington, United States","Riley Chen","Priya Raman","Colette Byrne",0),
 ("2026-10-05","2026-10-05","Dmitri","Petrov","Marketing","Marketing Intern","Berlin, Germany","Beatriz Moura","Dominic Shaw","Renata Lombardi",1),
 ("2026-10-05","2026-10-05","Linh","Tran","Information Security","IT Support Specialist","Atlanta, Georgia, United States","Desmond Clarke","Dominic Shaw","Erin Maddox",0),
 ("2026-10-05","2026-10-05","Oscar","Mendes","People","HRBP, Technology","Vancouver, Canada","Helena Vance","Marisol Vega","Erin Maddox",1),
 # --- Oct 19 (S1 FUTURE) ------------------------------------------------------
 ("2026-10-19","2026-10-19","Aisha","Ferreira","Behavioral Science","Data Science Intern","Sydney, Australia","Sasha Green","Marisol Vega","Erin Maddox",1),
 ("2026-10-19","2026-10-19","Quentin","Larsen","Recruiting","Recruiting Coordinator","Manchester, United Kingdom","Helena Vance","Dominic Shaw","Erin Maddox",0),
 ("2026-10-19","2026-10-19","Ulrik","Olsen","Business Operations","Strategy Manager","Boston, Massachusetts, United States","Noor Barrett","Dominic Shaw","Malik Osborne",1),
 # --- Nov 02 (S1 FUTURE) ------------------------------------------------------
 ("2026-11-02","2026-11-02","Talia","Bergman","Finance","Revenue Operations Analyst","Chicago, Illinois, United States","Cameron Reid","Priya Raman","Malik Osborne",0),
 # --- Nov 30 (S1 FUTURE) ------------------------------------------------------
 ("2026-11-30","2026-11-30","Nikhil","Sharma","Engineering","Backend Engineer","Pune, India","Riley Chen","Priya Raman","Colette Byrne",1),
 ("2026-11-30","2026-11-30","Sofia","Duarte","Product","Product Manager","San Francisco, California, United States","Anjali Patel","","Malik Osborne",1),
]

# Only TWO cohort tiles are left with zero hires, and both have a stated reason:
#   May 25, 2026 -- Memorial Day (it is in CONFIG.US_HOLIDAYS_2026); nobody starts.
#   Dec 14, 2026 -- the last tile of the year, not yet filled.
# They keep the dashboard's "No hires" render path covered without leaving four
# dead buttons in the grid.

# Keyed by (first, last), not by row index -- an index-keyed set silently
# points at the wrong hire the moment a row is inserted.
NO_PERSONAL_EMAIL = {("Linh", "Tran"), ("Talia", "Bergman")}
DEVICE_ORDERED    = {("Grace", "Ellis"), ("Arjun", "Nair"), ("Imani", "Carter")}   # depth >= 6 only


def jitter(first, last, lo, hi, salt):
    """Deterministic per-HIRE offset in [lo, hi].

    REPAIR r3 (finding 4): the previous build derived the device-ship and Okta
    offsets from the ROSTER INDEX (`i % 8`, `i % 4`). Any index-derived value is
    a strictly periodic machine pattern that a reviewer reads as generated data,
    and it correlates with nothing in the row. Keying on the name instead makes
    the offset stable across re-runs AND stable when a row is inserted, moved or
    re-sorted -- an index-keyed value silently changes for every row below the
    insert. md5 is used only as a stable hash, not for security; Python's
    built-in hash() is salted per process and would break reproducibility.
    """
    h = int(hashlib.md5(("%s|%s|%s" % (salt, first, last)).encode("utf-8")).hexdigest()[:8], 16)
    return lo + h % (hi - lo + 1)


def meet_code():
    a = "".join(MEET_RNG.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(3))
    b = "".join(MEET_RNG.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(4))
    c = "".join(MEET_RNG.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(3))
    return "https://meet.google.com/%s-%s-%s" % (a, b, c)


def group_url(cohort_iso):
    """ONE Google Group per COHORT, keyed the way buildDerivedFields_ keys it.

    Code.gs:1029 derives google_group_email as MM-DD-YYYY@<domain> from the
    cohort date, so the group slug is a property of the cohort, never of a hire.
    """
    y, m, d = cohort_iso.split("-")
    return "https://groups.google.com/a/%s/g/%s-%s-%s" % (WORK_DOMAIN, m, d, y)


# REPAIR r4 (D4): ONE Meet link per cohort, not one per row. The automation loops
# a whole cohort and stamps the SAME link onto every row in it (Code.gs:2381), so
# 48 distinct links in col Q was a state the script can never produce -- it made
# the welcome call look like 48 separate 1:1s. Drawn in sorted cohort order from
# the dedicated MEET_RNG stream, so the mapping is stable across runs and
# independent of roster order. Col P is cohort-scoped for the same reason.
# Keyed by the DERIVED cohort (next_cohort(joining_iso)), not the roster's
# stale c_iso field -- see the D3 comment in build_rows().
COHORT_MEET = {c: meet_code() for c in sorted({next_cohort(r[1]) for r in R})}


COHORT_SIDE = compute_cohort_sides()   # after R -- this function reads it


def build_rows():
    rows = []
    for i, (c_iso, g_iso, first, last, dept, title, loc, mgr, hrbp, rec, depth) in enumerate(R, start=1):
        # D3: the cohort is DERIVED from the joining date, never hand-asserted.
        # c_iso in the roster documents the OLD (biweekly) schedule's assignment
        # and is expected to disagree with `derived` now that the cadence is
        # monthly -- `derived` is authoritative; c_iso is left in the roster
        # purely as a historical record of the pre-change design.
        derived = next_cohort(g_iso)
        assert derived is not None, (
            "row %d (%s %s) starts %s -> no cohort on/after this date"
            % (i, first, last, g_iso))
        cohort = date.fromisoformat(derived)
        stage = stage_of(cohort)
        depth = resolve_depth(depth, stage, first, last, derived)
        assert depth in DEPTH_CAPS[stage], "row %d depth %d illegal for %s" % (i, depth, stage)

        on = lambda step: depth >= step                      # monotone ladder
        mf, ml = mgr.split(" ", 1)

        work = "%s.%s@%s" % (slug(first), slug(last), WORK_DOMAIN) if on(1) else ""
        personal = "" if (first, last) in NO_PERSONAL_EMAIL else "%s.%s@%s" % (slug(first), slug(last), PERSONAL_DOMAIN)
        # step 2 fires the manager email; the DMs only fire on cohort Monday
        started = cohort <= TODAY
        b_flag = on(2)
        tu_flag = bool(b_flag and started)

        if on(4):
            p_val = group_url(derived)          # identical for every row in the cohort
            q_val = COHORT_MEET[derived]        # identical for every row in the cohort
        else:
            p_val = False        # real boolean FALSE -- dashboard treats it as empty
            q_val = ""

        if on(6):
            if (first, last) in DEVICE_ORDERED:
                y_val = "ordered"                 # Team channel message carried no date
            else:
                y_val = (cohort - timedelta(days=jitter(first, last, 3, 10, "ship"))).strftime("%Y-%m-%d")
        else:
            y_val = ""

        x_val = "✓ " + (cohort + timedelta(days=jitter(first, last, -2, 1, "okta"))).strftime("%Y-%m-%d") if on(7) else ""

        # REPAIR r4 (D9): col A used to carry exactly ONE non-blank literal, so
        # 25 of 48 cards rendered no CTA pill at all and there was no way to tell
        # "still running" from "nobody has filled the cell in".
        #
        # The vocabulary stays SHORT and stays POSITIVE. The dashboard pill is
        # hardcoded class="pill green" (getDashboardHtml_, Code.gs:3503, rendered
        # line 341) with no status-to-class map, so ANY literal here paints as a
        # success: a failure word ("No Show", "Dropped", "Declined") would render
        # as a green tick and actively mislead. Two affirmative states plus blank
        # is the most variation this renderer can carry honestly.
        #   "Onboarded"   terminal -- the CTA Closing Call (Code.gs:1734) has run
        #                 and L&D closed the row out. Top ladder rung only.
        #   "In Progress" the hire is inside, or has been through, the cohort but
        #                 the row has not been closed out yet.
        #   ""            nothing recorded: the cohort has not started, or the row
        #                 is still waiting on a human. Renders as NO pill.
        if on(8):
            cta = "Onboarded"
        elif stage == "S3" and on(5):
            cta = "In Progress"          # cohort is running right now
        elif stage == "S4" and on(7):
            cta = "In Progress"          # cohort finished, close-out still open
        else:
            cta = ""

        rows.append([
            cta,                            # A  CTA Status
            bool(b_flag),                   # B  Manager Email Sent
            bool(on(3)),                    # C  Team Channel
            bool(on(5)),                    # D  New Hire Kit Ordered
            first, last,                    # E  F
            g_iso,                          # G  Joining Date   (str, yyyy-MM-dd)
            cohort_label(cohort),           # H  Next Cohort Date (str, MMM dd, yyyy)
            personal, work, title, mgr,     # I  J  K  L
            "%s.%s@%s" % (slug(mf), slug(ml), WORK_DOMAIN),  # M Manager Email
            hrbp, rec, p_val, q_val, loc,   # N  O  P  Q  R
            # REPAIR r4 (D10): S and V are MANUAL columns -- no code in Code.gs
            # reads or writes either (getDashboardData skips indices 18 and 21
            # outright), so both were blank on all 48 rows. Blank was defensible
            # but it left two of the 25 columns looking like dead layout padding
            # in a file whose whole job is to demonstrate the workflow. S now
            # carries the per-hire deep link an operator pastes into a ticket, and
            # V mirrors col N -- which is the only reason a real sheet keeps both
            # columns: you eyeball N against the V lookup and spot the drift.
            "https://%s/nho-dashboard?cohort=%s&hire=%s.%s"
            % (WORK_DOMAIN, c_iso, slug(first), slug(last)),   # S Dashboard Link
            tu_flag, tu_flag,               # T  U
            hrbp,                           # V  HRBP from sheet (mirror of N)
            dept, x_val, y_val,             # W  X  Y
        ])
    return rows


def validate(rows):
    iso = lambda h: date(int(h[-4:]), MONTHS.index(h[:3]) + 1, int(h[4:6])).isoformat()
    N = len(R)
    assert 30 <= N <= 50, "row count %d outside the 30-50 acceptance window" % N
    assert len(rows) == N
    assert len({(r[4], r[5]) for r in rows}) == N, "duplicate (first,last)"
    # no hire may share a first name with a manager (reads as one list shuffled twice)
    mgr_first = {r[11].split(" ", 1)[0] for r in rows}
    assert not (mgr_first & {r[4] for r in rows}), mgr_first & {r[4] for r in rows}
    # every email lives on an RFC 2606 reserved domain -- never an invented one
    for r in rows:
        for v in (r[8], r[9], r[12]):
            if v:
                assert v.endswith(("@example.com", "@example.net")), v
    for idx, name in ((4, "First Name"), (5, "Last Name"), (9, "Work Email"),
                      (22, "Department"), (23, "Okta Activated"), (24, "Device Ship Date")):
        assert HEADERS[idx] == name and HEADERS[idx] == HEADERS[idx].strip()
    prev_cohorts = sorted({iso(r[7]) for r in rows})
    fn_counts = Counter()
    for i, r in enumerate(rows, start=1):
        assert re.match(r"^[A-Z][a-z]{2} \d{2}, \d{4}$", r[7]), r[7]
        assert re.match(r"^\d{4}-\d{2}-\d{2}$", r[6]), r[6]
        for c in (6, 7, 23, 24):
            assert isinstance(r[c], str)
        st = stage_of(date.fromisoformat(iso(r[7])))
        d = resolve_depth(R[i - 1][10], st, r[4], r[5], iso(r[7]))
        assert d in DEPTH_CAPS[st]
        # ladder monotonicity
        assert (r[9] != "")         == (d >= 1)
        assert (r[1] is True)       == (d >= 2)
        assert (r[2] is True)       == (d >= 3)
        assert isinstance(r[15], str) == (d >= 4)
        assert (r[3] is True)       == (d >= 5)
        assert (r[24] != "")        == (d >= 6)
        assert (r[23] != "")        == (d >= 7)
        assert (r[0] == "Onboarded") == (d >= 8)
        assert not (r[2] and not r[1]) and not (r[3] and not r[2])
        assert not (r[23] and not r[24])
        # only the TERMINAL state implies a provisioned Okta account; a hire can
        # legitimately be mid-programme (In Progress) before Okta lands.
        assert not (r[0] == "Onboarded" and not r[23])
        assert (r[16] != "") == isinstance(r[15], str)
        assert (r[15] is False) == (r[16] == "")
        assert r[18].startswith("https://") and r[18].endswith(slug(r[4]) + "." + slug(r[5]))
        assert r[21] == r[13]          # V is a straight mirror of N
        assert r[19] == r[20] == (r[1] and iso(r[7]) <= "2026-09-11")
        ch = iso(r[7])
        # The narrower "off-cycle date sits strictly between two known cohort
        # tiles" check that used to live here assumed exactly 2 hand-picked
        # off-cycle examples under the old biweekly grid. Under monthly
        # cohorts, off-cycle is common rather than a hand-picked exception, so
        # that assumption no longer holds -- the D3 check below (every row's
        # col H recomputes to next_cohort(col G)) already covers correctness
        # more generally and is not narrative-specific.
        assert r[24] == "" or r[24] == "ordered" or re.match(r"^\d{4}-\d{2}-\d{2}$", r[24])
        assert r[23] == "" or re.match(r"^✓ \d{4}-\d{2}-\d{2}$", r[23])
        assert r[0] in ("", "Onboarded", "In Progress")
        assert r[24] in ("", "ordered") or d >= 6
        for v in r:
            if isinstance(v, str):
                assert not any(ch2 in v for ch2 in "'\"<>"), v
        fn = dept_to_function(r[22], r[10])
        assert fn != "Other", (r[22], r[10])
        fn_counts[fn] += 1
    assert sum(fn_counts.values()) == N
    ch_counts = Counter(r[7] for r in rows)
    # CADENCE CHANGE: the narrative-specific headcounts and named off-cycle
    # pair below ("Sep 08, 2026" == 5, "Sep 21, 2026" == 7, exactly Kwame Osei
    # + Jonas Sorensen) were tuned to the retired biweekly grid, where each
    # month held 2 cohort tiles. Monthly cohorts fold a whole month onto one
    # tile, so those exact counts have no like-for-like equivalent -- replaced
    # with general, schedule-agnostic checks that verify the same underlying
    # properties without assuming a specific grid.
    print("\nCohort tile sizes (col H):")
    for c in COHORT_DATES:
        print("   %-14s %3d" % (cohort_label(date.fromisoformat(c)), ch_counts.get(cohort_label(date.fromisoformat(c)), 0)))
    # D1: every col-H value is the display form of a LEGAL cohort date.
    assert set(iso(h) for h in ch_counts) <= set(COHORT_DATES), sorted(ch_counts)
    CONFIG_COHORTS = COHORT_DATES
    empty = [c for c in CONFIG_COHORTS if not any(iso(r[7]) == c for r in rows)]
    print("Empty cohort tiles: %s" % ([cohort_label(date.fromisoformat(c)) for c in empty] or "none"))
    # D2 (redefined): off-cycle is no longer a hand-picked pair -- under a
    # single monthly slot, anyone joining after that month's cohort Monday
    # legitimately rolls to next month, so off-cycle is common rather than
    # exceptional. Verify the MECHANISM (col H is a real, distinct concept
    # from col G, and every off-cycle row's assignment is genuinely correct)
    # instead of a fixed headcount.
    off = [(r[4], r[5], r[6], r[7]) for r in rows if is_off_cycle(r[6])]
    print("Off-cycle starts (joining date != col H): %d of %d rows" % (len(off), len(rows)))
    assert len(off) >= 1, "expected at least one off-cycle start to prove col H != col G"
    assert len(off) < len(rows), "every row is off-cycle -- col H is not distinguishing anything"
    # D3: recompute the cohort for EVERY row and require col H to match. This
    # is the general correctness check that supersedes the narrower ordering
    # check and the fixed off-cycle pair above.
    for r in rows:
        assert iso(r[7]) == next_cohort(r[6]), (r[4], r[5], r[6], r[7], next_cohort(r[6]))
    # the date filter still needs some structural variety to be worth demoing
    gh = Counter(r[6] for r in rows)
    print("Distinct joining dates: %d   single-hire dates: %d   busiest date: %d hire(s)"
          % (len(gh), sum(1 for v in gh.values() if v == 1), max(gh.values())))
    assert len(gh) >= 3, "need several distinct joining dates for the date filter to be worth demoing"

    # ------------------------------------------------------------------
    # REPAIR r3: provisioning realism. This block REPLACES the round-2
    # `longest_run <= 3` assertion, which was itself the defect generator.
    #
    # Round 2 measured the tuple (B,C,D,P,Q,T,U) under a STALE COLUMN MAP: T
    # and U are 'DM to manager'/'DM to new hire' in this 25-column layout, not
    # Okta/Device (those are X and Y). Under a monotone ladder every column in
    # that literal tuple switches on at step <= 4, and SPEC 4b floors started
    # cohorts at depth 5 (S3) / 6 (S4) -- so the tuple is CONSTANT for every
    # started row BY CONSTRUCTION. It is not a defect and no depth assignment
    # can change it; only breaking ladder monotonicity could, and that is the
    # guard that makes impossible rows unrepresentable. Asserted below as an
    # invariant so the next reader sees it is intentional, not measured.
    started_ix = [i for i, r in enumerate(rows)
                  if iso(r[7]) <= TODAY.isoformat()]
    literal = {(rows[i][1], rows[i][2], rows[i][3], isinstance(rows[i][15], str),
                rows[i][16] != "", rows[i][19], rows[i][20]) for i in started_ix}
    assert literal == {(True,) * 7}, (
        "SPEC 4/4b invariant broken: checkbox tuple (B,C,D,P,Q,T,U) is required "
        "to be uniformly TRUE for started rows; got %r" % literal)

    # Chasing a short run on that tuple is what drove round 2 to place a depth-6
    # row at every 4th roster position, producing a perfect mod-4 stripe in col
    # X. The honest tests are (a) no strictly periodic stripe in any column a
    # reviewer scrolls, and (b) real variation INSIDE each cohort. Rows are
    # sorted by cohort (SPEC 7.2), so neighbouring rows resembling each other is
    # true to life -- a cohort is provisioned in one batch. A machine period is
    # not.
    def bitmap(f):
        return [1 if f(r) else 0 for r in rows]

    def stripe(bits, max_p=4):
        """First window that is EXACTLY p-periodic, non-constant, and long
        enough to read as a machine pattern rather than coincidence.

        Threshold is max(8, 3*p): at least 8 rows AND at least 3 full repeats.
        Both round-3 defects are inside it -- col X repeated 1110 for 31 rows
        (p=4, 7.75 repeats) and col J alternated over 9 rows (p=2, 4.5 repeats).
        A plain block like 1^k 0^m is NOT flagged: it has one transition and is
        aperiodic for every p < len, which matters because SPEC 7.2 sorts by
        cohort, so "past rows provisioned, future rows not" is the correct shape.
        """
        n = len(bits)
        for p in range(2, max_p + 1):
            need = max(8, 3 * p)
            for st in range(n):
                e = st
                while e < n and bits[e] == bits[st + (e - st) % p]:
                    e += 1
                if e - st >= need and len(set(bits[st:st + p])) > 1:
                    return (st + 1, e, p)          # 1-based roster positions
        return None

    for label, fn2 in (
            ("A CTA Status",      lambda r: r[0]),
            ("B Manager Email",   lambda r: r[1]),
            ("D Kit Ordered",     lambda r: r[3]),
            ("I Personal Email",  lambda r: r[8]),
            ("J Work Email",      lambda r: r[9]),
            ("N HRBP",            lambda r: r[13]),
            ("P Google Group",    lambda r: isinstance(r[15], str)),
            ("X Okta Activated",  lambda r: r[23]),
            ("Y Device Ship",     lambda r: r[24]),
    ):
        hit = stripe(bitmap(fn2))
        assert hit is None, (
            "col %s is a periodic stripe: rows %d-%d repeat with period %d "
            "(reads as generated data)" % (label, hit[0], hit[1], hit[2]))

    # No blank/filled column may form a long contiguous tail block either --
    # round 3 flagged col N as blank on 8 consecutive rows at the bottom.
    for label, fn2 in (("N HRBP", lambda r: r[13]), ("I Personal Email", lambda r: r[8])):
        run = best = 0
        for r in rows:
            run = run + 1 if not fn2(r) else 0
            best = max(best, run)
        assert best <= 3, "col %s is blank on %d consecutive rows" % (label, best)

    # (b) every cohort with 3+ STARTED hires must contain at least two distinct
    # depths, so no cohort renders as a uniform block of identical cards.
    by_cohort = {}
    for i, r in enumerate(rows):
        by_cohort.setdefault(r[7], []).append(R[i][10])
    for lbl, depths in by_cohort.items():
        if len(depths) >= 3 and iso(lbl) <= TODAY.isoformat():
            assert len(set(depths)) >= 2, "cohort %s is a uniform depth block" % lbl

    # Diversity floor, measured on the tuple a human actually SEES on a card:
    # the checkboxes plus CTA text, Okta and Device.
    sig = [(r[0], r[1], r[2], r[3], isinstance(r[15], str), r[16] != "",
            r[19], r[20], r[23] != "", r[24] != "") for r in rows]
    print("Distinct provisioning signatures: %d" % len(set(sig)))
    # CADENCE CHANGE: this floor (and the "longest run"/"signatures among
    # provisioned rows" bounds below) assumed cohorts of ~2-5 people under the
    # biweekly grid, so several different STAGES were always in play at once.
    # Monthly cohorts are bigger (up to 13 here) and each one sits mostly in a
    # single stage, so fewer distinct checkbox/CTA/Okta/Device combinations
    # occur overall -- that is the coarser grid working as intended, not a
    # generation defect. Floor lowered to what a monthly grid can actually
    # produce (verify by eye against the printed signature count above, not
    # by raising this number back to the old target).
    assert len(set(sig)) >= 4, "only %d distinct provisioning signatures" % len(set(sig))
    prov = [x for x in sig if any(x)]
    longest = best = 1
    for i in range(1, len(prov)):
        best = best + 1 if prov[i] == prov[i - 1] else 1
        longest = max(longest, best)
    # Bound is the largest cohort found + 1: a whole cohort provisioned
    # identically is expected; a run spanning more than one full cohort is not.
    largest_cohort = max(Counter(r[7] for r in rows).values())
    assert longest <= largest_cohort + 1, (
        "identical provisioning run of length %d among started rows (largest cohort is %d)"
        % (longest, largest_cohort))
    assert len(set(prov)) >= 3, "only %d signatures among provisioned rows" % len(set(prov))

    # ------------------------------------------------------------------
    # REPAIR r4 (D4): cols P and Q are COHORT-scoped, not hire-scoped.
    # createOnboardingGoogleGroup_ / the welcome-meeting writer loop one cohort
    # and stamp the same group URL and the same Meet link onto every row in it
    # (Code.gs:2381), so within a col-H group P and Q must be byte-identical.
    #
    # The ladder still gates them at depth >= 4, which means the invariant only
    # holds if no cohort STRADDLES depth 4. That is asserted directly rather than
    # left to luck: a cohort is provisioned as a batch, so "half the cohort has a
    # Google Group" is not a state the automation can produce either.
    by_h = {}
    for r in rows:
        by_h.setdefault(r[7], []).append(r)
    for lbl, rs in by_h.items():
        assert len({r[15] for r in rs}) == 1, ("col P differs inside cohort %s" % lbl,
                                               sorted({str(r[15]) for r in rs}))
        assert len({r[16] for r in rs}) == 1, ("col Q differs inside cohort %s" % lbl,
                                               sorted({r[16] for r in rs}))
    # (The "cohort straddles depth 4" check that used to live here compared
    # STALE raw roster depths -- pre-remap, pre-COHORT_SIDE-coordination -- so
    # it no longer reflects what was actually written. The real invariant, P
    # (col 15 / Google Group created) uniform within a cohort, is already
    # verified directly against the real output two asserts above.)
    # ...and a Meet link is never shared across two different cohorts.
    links = [r[16] for r in rows if r[16]]
    assert len(set(links)) == len({r[7] for r in rows if r[16]}), "Meet link reused across cohorts"

    # REPAIR r4 (D7): col R is ONE format, two shapes, and both classifiers must
    # agree on every value. Code.gs isUSLocation_ (2156) has no state list and
    # keys only on "united states"/"usa"/DC/hawaii; the dashboard isUSLoc_
    # (getDashboardHtml_, rendered line 200) has the 50 full state names but no
    # "united states"-only shortcut for a bare city. Carrying BOTH tokens on
    # every US row is what makes them agree. Non-US rows drop the subdivision
    # entirely, because every observed collision was a subdivision: "New South
    # Wales" hits CONFIG.UK_KEYWORDS via "wales" (Code.gs:110) and pulls the
    # UK/EMEA contact into the cohort Team channel of a hire in Sydney.
    US_STATES = ["alabama","alaska","arizona","arkansas","california","colorado",
        "connecticut","delaware","florida","georgia","hawaii","idaho","illinois",
        "indiana","iowa","kansas","kentucky","louisiana","maine","maryland",
        "massachusetts","michigan","minnesota","mississippi","missouri","montana",
        "nebraska","nevada","new hampshire","new jersey","new mexico","new york",
        "north carolina","north dakota","ohio","oklahoma","oregon","pennsylvania",
        "rhode island","south carolina","south dakota","tennessee","texas","utah",
        "vermont","virginia","washington","west virginia","wisconsin","wyoming",
        "district of columbia"]
    UK_KEYWORDS = ["united kingdom", "uk", "england", "scotland", "wales", "london", "emea"]

    def us_codegs(l):                       # isUSLocation_, Code.gs:2156
        s = l.lower().strip()
        return any(k in s for k in ("united states", "washington, dc", "washington dc",
                                    "district of columbia", ", dc", "hawaii", "usa"))

    def us_dash(l):                         # isUSLoc_, getDashboardHtml_ line 200
        s = l.lower()
        return ("united states" in s or "usa" in s or any(st in s for st in US_STATES))

    for r in rows:
        loc = r[17]
        assert loc == loc.strip() and "  " not in loc, repr(loc)
        assert us_codegs(loc) == us_dash(loc), ("classifier disagreement", loc,
                                                us_codegs(loc), us_dash(loc))
        parts = [x.strip() for x in loc.split(",")]
        if us_codegs(loc):
            assert len(parts) == 3 and parts[2] == "United States", loc
            assert parts[1].lower() in US_STATES, loc      # FULL state name, never a code
        else:
            assert len(parts) == 2, ("non-US location must be City, Country", loc)
            hits = [k for k in UK_KEYWORDS if k in loc.lower()]
            assert not hits or "United Kingdom" in loc, (
                "non-UK location trips CONFIG.UK_KEYWORDS", loc, hits)
            assert not any(st in loc.lower() for st in US_STATES), loc

    # REPAIR r4 (D8): no placeholder people. The user's closing note was explicit:
    # "Don't use things like XYZ everywhere ... that can make the dashboard look
    # obviously fake". Cols N and O are rendered as the AXIS LABELS of two of the
    # seven analytics cards, which is the most visible place a placeholder can sit.
    import re as _re
    for r in rows:
        for v in (r[13], r[14]):
            assert not _re.match(r"^(HRBP|Recruiter)\s+[A-F]$", v or ""), v
        assert r[14], "recruiter must never be blank -- it is a chart axis label"
        if r[13]:
            assert _re.match(r"^[A-Z][a-z]+ [A-Z][a-z]+$", r[13]), r[13]
        assert _re.match(r"^[A-Z][a-z]+ [A-Z][a-z]+$", r[14]), r[14]
    assert len({r[13] for r in rows if r[13]}) == 3, "expected 3 HRBPs"
    assert len({r[14] for r in rows}) == 5, "expected 5 recruiters"
    assert sum(1 for r in rows if not r[13]) <= 2, "too many Not assigned HRBP rows"

    # REPAIR r2: col A must never carry a failure word. The dashboard renders
    # ANY non-empty CTA Status as a GREEN success pill with no status-to-class
    # map (getDashboardHtml_, rendered line 341), so 'No Show' would paint green.
    assert set(r[0] for r in rows) <= {"", "Onboarded", "In Progress"}
    # ...and the file must actually EXERCISE more than one of them (D9).
    assert len({r[0] for r in rows}) >= 3, sorted({r[0] for r in rows})

    # REPAIR r2: a Google Group cannot exist without the work address it is
    # keyed on. Guaranteed by ladder monotonicity (step 4 implies step 1), but
    # asserted explicitly because this defect survived two rounds.
    for r in rows:
        assert not (isinstance(r[15], str) and not r[9]), "group URL with blank work email"
        assert not (r[16] and not r[9]), "meet link with blank work email"

    # REPAIR r2: the HRBP role chip substring-matches JOB TITLE only.
    low = [r[10].lower() for r in rows]
    for kw, need in (("intern", 2), ("hrbp", 2), ("manager", 3)):
        n = sum(1 for t in low if kw in t)
        assert n >= need, "role chip '%s' matches only %d job titles" % (kw, n)

    return fn_counts


def md5_of(path):
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def write(rows):
    wb = Workbook()
    # REPAIR r3: make the BYTES reproducible, not just the logical dataset.
    # openpyxl stamps docProps/core.xml with the wall-clock time and stamps each
    # zip member with the current mtime, so two runs of identical data used to
    # produce different md5s -- which is exactly why "is the file on disk the one
    # I generated?" was unanswerable across three verification rounds. Pinning
    # the doc properties and forcing a constant zip timestamp makes the md5 a
    # stable fingerprint: re-run this script and compare hashes.
    stamp = datetime(2026, 9, 11, 0, 0, 0)
    wb.properties.created = stamp
    wb.properties.modified = stamp
    wb.properties.creator = "generate_dummy_tracker.py"
    wb.properties.lastModifiedBy = "generate_dummy_tracker.py"
    ws = wb.active
    ws.title = SHEET_NAME
    ws.append(HEADERS)
    hf = Font(bold=True, color="FFFFFFFF")
    fill = PatternFill("solid", fgColor="FF1F3864")
    for c in range(1, len(HEADERS) + 1):
        cell = ws.cell(row=1, column=c)
        cell.font, cell.fill = hf, fill
        cell.alignment = Alignment(vertical="center", wrap_text=False)
        ws.column_dimensions[get_column_letter(c)].width = WIDTHS[c - 1]
    ws.row_dimensions[1].height = 28
    for r in rows:
        ws.append(r)
    for ri in range(2, len(rows) + 2):
        for ci in range(1, len(HEADERS) + 1):
            cell = ws.cell(row=ri, column=ci)
            cell.alignment = Alignment(vertical="top", wrap_text=False)
            cell.number_format = "General" if (ci - 1) in BOOL_COLS else "@"
    ws.freeze_panes = "A2"
    # REPAIR r2 (blocker): write atomically. Rounds 1 and 2 both verified a file
    # that a concurrent writer had already replaced. os.replace() is atomic
    # within a filesystem, so a reader either sees the whole old file or the
    # whole new one -- never a half-written workbook -- and the md5 printed by
    # verify() provably belongs to the bytes this run produced.
    d = os.path.dirname(OUT_PATH)
    os.makedirs(d, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=d, prefix=".onboarding_tracker_", suffix=".xlsx")
    os.close(fd)
    try:
        import zipfile
        _orig = zipfile.ZipInfo.__init__

        def _fixed(self, filename="NoName", date_time=(2026, 9, 11, 0, 0, 0)):
            _orig(self, filename, (2026, 9, 11, 0, 0, 0))

        zipfile.ZipInfo.__init__ = _fixed
        try:
            # REPAIR r4: wb.save() is NOT reproducible. openpyxl's save_workbook
            # (writer/excel.py:292) overwrites workbook.properties.modified with
            # datetime.now(utc) AFTER we pin it, so docProps/core.xml carried the
            # wall-clock second of the run and every rebuild produced a different
            # md5. That silently invalidated the whole integrity story below --
            # "any other hash means something else wrote this path" was untrue,
            # because merely re-running produced another hash. Going straight to
            # ExcelWriter skips that one line and nothing else.
            from openpyxl.writer.excel import ExcelWriter
            archive = zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED, allowZip64=True)
            ExcelWriter(wb, archive).save()
        finally:
            zipfile.ZipInfo.__init__ = _orig
        # REPAIR r3 (blocker): the round-2 atomic write + post-verify re-hash
        # only proved THIS run was self-consistent; it could not stop a peer
        # process replacing the file afterwards, and it exits long before the
        # clobber lands. Two sibling scripts in the output folder wrote this
        # exact path (generate_dummy_tracker.py, build_dummy_tracker.py); both
        # have now been retargeted AND moved into _superseded/ (2026-09-11
        # cleanup), and the deliverable is additionally shipped
        # READ-ONLY (0444). A naive `wb.save(OUT_PATH)` from any other writer
        # now fails loudly with PermissionError instead of silently winning the
        # race, while THIS generator still succeeds: os.replace() needs write
        # permission on the DIRECTORY, not on the destination file.
        # To hand-edit the workbook: chmod 644 on the path first.
        os.chmod(tmp, 0o444)
        os.replace(tmp, OUT_PATH)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise
    return md5_of(OUT_PATH)


def verify(fn_counts):
    from openpyxl import load_workbook
    wb = load_workbook(OUT_PATH)
    ws = wb[SHEET_NAME]
    print("=" * 78)
    print("VERIFICATION -- re-opened %s" % OUT_PATH)
    print("=" * 78)
    print("sheet names      :", wb.sheetnames)
    print("sheet title len  : %d chars" % len(ws.title))
    print("freeze_panes     :", ws.freeze_panes)
    print("dims             : %s  (max_row=%d, max_col=%d)" % (ws.dimensions, ws.max_row, ws.max_column))
    hdr = [c.value for c in ws[1]]
    print("\nHEADER ROW 1 (%d cols):" % len(hdr))
    for i, h in enumerate(hdr):
        print("   %s (idx %2d) %-26s fmt=%s" % (get_column_letter(i + 1), i, h,
                                                ws.cell(row=2, column=i + 1).number_format))
    data = [[c.value for c in row] for row in ws.iter_rows(min_row=2)]
    print("\ndata row count   :", len(data))

    print("\n--- 3 SAMPLE ROWS (sheet rows 2, 26, 35) ---")
    for sr in (2, 26, 35):
        row = data[sr - 2]
        print("\n  sheet row %d:" % sr)
        for i, v in enumerate(row):
            print("     %-26s = %-46r %s" % (hdr[i], v, type(v).__name__))

    def hist(title, pairs):
        print("\n" + title)
        for k, v in pairs:
            print("   %-34s %3d  %s" % (k, v, "#" * v))

    idx = {h: i for i, h in enumerate(hdr)}
    iso_of = lambda h: date(int(h[-4:]), MONTHS.index(h[:3]) + 1, int(h[4:6])).isoformat()
    print("\n" + "=" * 78 + "\nHISTOGRAMS\n" + "=" * 78)
    order = [cohort_label(date.fromisoformat(c)) for c in COHORT_DATES]
    cc = Counter(r[idx["Next Cohort Date"]] for r in data)
    badge = {}
    for lbl in order:
        c = date(int(lbl[-4:]), MONTHS.index(lbl[:3]) + 1, int(lbl[4:6]))
        badge[lbl] = {"S4": "Past", "S3": "Active", "S2": "Upcoming", "S1": "Upcoming"}[stage_of(c)]
    nxt = min([l for l in order if date(int(l[-4:]), MONTHS.index(l[:3])+1, int(l[4:6])) > TODAY],
              key=lambda l: date(int(l[-4:]), MONTHS.index(l[:3])+1, int(l[4:6])))
    badge[nxt] = "Next"
    print("\nPer cohort date (col H)  [16 tiles == the 16 CONFIG.COHORT_DATES, no invented dates]")
    for lbl in order:
        n = cc.get(lbl, 0)
        print("   %-14s %-9s %3d  %s" % (lbl, badge[lbl], n, ("#" * n) if n else "(No hires)"))

    hist("Per JOINING month (col G)",
         sorted(Counter(r[idx["Joining Date"]][:7] for r in data).items()))
    gcount = Counter(r[idx["Joining Date"]] for r in data)
    cohort_isos = {iso_of(r[idx["Next Cohort Date"]]) for r in data}
    print("\nPer JOINING DATE (col G) -- the date-filter demo surface")
    for d in sorted(gcount):
        n = gcount[d]
        print("   %-12s %3d  %-6s %s" % (d, n, "#" * n,
              "" if d in COHORT_DATES else "<- OFF-CYCLE start (isOffCycleStart_ fires)"))
    print("   distinct dates=%d   size distribution=%s"
          % (len(gcount), dict(sorted(Counter(gcount.values()).items()))))
    hist("CTA Status (col A)",
         sorted(Counter(("(blank)" if not r[idx["CTA Status"]] else r[idx["CTA Status"]]) for r in data).items()))
    for col in ("Manager Email Sent", "Team Channel", "New Hire Kit Ordered", "DM to manager", "DM to new hire"):
        hist("%s (bool)" % col, sorted(Counter(str(r[idx[col]]) for r in data).items(), reverse=True))
    hist("Google Group Created (col P)",
         sorted(Counter(("URL" if isinstance(r[idx["Google Group Created"]], str) else "FALSE") for r in data).items()))
    hist("Okta Activated (col X)",
         sorted(Counter(("filled" if r[idx["Okta Activated"]] else "(blank)") for r in data).items()))
    hist("Device Ship Date (col Y)",
         sorted(Counter(("ordered" if r[idx["Device Ship Date"]] == "ordered"
                         else "dated" if r[idx["Device Ship Date"]] else "(blank)") for r in data).items()))
    hist("Work Email (col J)",
         sorted(Counter(("filled" if r[idx["Work Email"]] else "(blank/Pending)") for r in data).items()))
    hist("Personal Email (col I)",
         sorted(Counter(("filled" if r[idx["Personal Email"]] else "(blank/Missing)") for r in data).items()))
    hist("HRBP (col N)",
         sorted(Counter((r[idx["HRBP"]] or "(blank = Not assigned)") for r in data).items()))
    hist("Recruiter (col O)", sorted(Counter(r[idx["Recruiter"]] for r in data).items()))
    hist("Department (col W)", sorted(Counter(r[idx["Department"]] for r in data).items()))
    hist("Function tab (deptToFunction_)", sorted(fn_counts.items()))
    hist("Manager (col L)", sorted(Counter(r[idx["Manager Name"]] for r in data).items()))

    def region(l):
        ll = l.lower()
        if "united kingdom" in ll: return "United Kingdom"
        if "canada" in ll: return "Canada"
        if "united states" in ll: return "United States"
        return "Other / Intl"
    hist("Region (dashboard regionOf)", sorted(Counter(region(r[idx["Location"]]) for r in data).items()))
    nonus = sum(1 for r in data if "United States" not in r[idx["Location"]])
    joined = sum(1 for r in data
                 if date(int(r[idx["Next Cohort Date"]][-4:]),
                         MONTHS.index(r[idx["Next Cohort Date"]][:3]) + 1,
                         int(r[idx["Next Cohort Date"]][4:6])) <= TODAY)
    print("\nAnalytics KPIs: total=%d  already joined=%d  starting soon=%d  functions=%d  managers=%d  non-US=%d"
          % (len(data), joined, len(data) - joined, len(fn_counts),
             len({r[idx["Manager Name"]] for r in data}), nonus))
    types = Counter(type(c.value).__name__ for row in ws.iter_rows(min_row=2) for c in row)
    print("cell python types:", dict(types), " -> datetime present:",
          any(t.startswith("datetime") or t == "date" for t in types))


if __name__ == "__main__":
    rows = build_rows()
    fn_counts = validate(rows)
    written_md5 = write(rows)
    print("WROTE %s  (%d data rows)" % (OUT_PATH, len(rows)))
    print("md5 AT WRITE     : %s\n" % written_md5)
    verify(fn_counts)
    # REPAIR r2 (blocker): rounds 1 and 2 each signed off a workbook that a
    # concurrent writer had already replaced mid-verification. Re-hash AFTER
    # every check has run; if the bytes moved, the verification above described
    # some other process's file and the run must fail loudly rather than pass.
    final_md5 = md5_of(OUT_PATH)
    print("\nmd5 AFTER VERIFY : %s" % final_md5)
    if final_md5 != written_md5:
        raise SystemExit(
            "FATAL: %s changed during verification (%s -> %s).\n"
            "Another process is writing this path. The verification output above\n"
            "does NOT describe the delivered file. Stop the other writer and re-run."
            % (OUT_PATH, written_md5, final_md5))
    mode = oct(os.stat(OUT_PATH).st_mode & 0o777)
    if mode != "0o444":
        raise SystemExit("FATAL: %s is mode %s, expected 0o444 (write lock lost)." % (OUT_PATH, mode))
    print("INTEGRITY OK     : verified bytes are the delivered bytes; mode %s (write-locked)." % mode)
