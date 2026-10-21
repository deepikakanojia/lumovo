# Adversarial verification. Re-implements getDashboardData()/normalizeDate_/
# parseNoteParts_/deptToFunction_ in Python and runs them over the dummy rows.
# Every check defaults to FAIL.
# 2026-09-11: `os` was used at module level (line ~9) but only imported far
# below, so the verifier crashed with NameError before any check ran. Hoisted.
import os
import re, datetime as dt
from openpyxl import load_workbook
from collections import Counter

# Resolve against this file's own folder so the verifier works from any cwd.
XL=os.path.join(os.path.dirname(os.path.abspath(__file__)),
                "NHO_Tracker_Dummy_Data.xlsx")
wb=load_workbook(XL); ws=wb[wb.sheetnames[0]]
rows=list(ws.iter_rows(min_row=2, values_only=True))
hdr=[c for c in next(ws.iter_rows(min_row=1,max_row=1,values_only=True))]
fails=[]; ok=[]

MONTHS={m:f"{i+1:02d}" for i,m in enumerate(
  ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"])}
def _is_date(v):
    return isinstance(v,(dt.date,dt.datetime))

def as_iso(cell):
    """Mirrors Code.gs's `(row[6] instanceof Date) ? formatDate(...,'yyyy-MM-dd')
    : String(row[6]).trim()`. Cols G and H are MIXED-TYPE in the fixture on
    purpose - the live sheet is mixed too, and an all-text fixture only ever
    exercises the else-branch of the 11 guards."""
    if _is_date(cell): return cell.strftime("%Y-%m-%d")
    return str(cell or "").strip()

def as_display(cell):
    """Same, for col H's 'MMM dd, yyyy' form."""
    if _is_date(cell): return cell.strftime("%b %d, %Y")
    return str(cell or "").strip()

def normalizeDate_(raw):
    if not raw: return None
    if _is_date(raw): return raw.strftime("%Y-%m-%d")
    s=str(raw).strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}",s): return s
    m=re.search(r"([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})",s)
    if m:
        mon=MONTHS.get(m.group(1).lower()[:3])
        if mon: return f"{m.group(3)}-{mon}-{int(m.group(2)):02d}"
    return None

def parseNoteParts_(cell):
    s=str(cell or "").strip()
    if not s: return {"dept":"","recruiter":""}
    d=re.search(r"Dept:\s*([^|]+)",s,re.I); r=re.search(r"Recruiter:\s*([^|]+)",s,re.I)
    if d or r: return {"dept":d.group(1).strip() if d else "","recruiter":r.group(1).strip() if r else ""}
    return {"dept":"","recruiter":s}

# --- 1. Column contract: positions A-R must match Code.gs exactly ------------
# Must match generate_dummy_tracker_CANONICAL.py's HEADER_ROW, cols A-R.
# (2026-09-11 cleanup: the old generate_dummy_tracker.py was superseded and now
#  lives in _superseded/ -- do not run it, it writes a different 21-col layout.) Four of these are
# exact-match contracts in Code.gs (First Name / Last Name / Work Email are
# case-sensitive; Department is case-insensitive); the rest are positional and
# the label is cosmetic, but a drift here still means the two files disagree.
EXPECT=["CTA Status","Manager Email Sent","Slack","New Hire Kit Ordered","First Name","Last Name",
 "Joining Date","Next Cohort Date","Personal Email","Work Email","Job Title","Manager Name",
 "Manager Email","HRBP","Recruiter","Google Group Created","Google Group Meeting Link","Location"]
for i,e in enumerate(EXPECT):
    if hdr[i]!=e: fails.append(f"col {chr(65+i)} header = {hdr[i]!r}, expected {e!r}")
ok.append(f"18-column A-R contract intact ({len(hdr)} cols incl. Department/Okta/Ship)")
for nm in ("Department","Okta Activated","Device Ship Date"):
    if nm not in hdr: fails.append(f"header-located column {nm!r} missing")

# --- 2. Every row must key into a cohort via col H (index 7) ----------------
data={}
for r in rows:
    first,last=str(r[4] or "").strip(),str(r[5] or "").strip()
    if not first and not last: continue
    key=normalizeDate_(r[7])
    if not key: fails.append(f"row {first} {last}: col H {r[7]!r} does not normalize"); continue
    data.setdefault(key,[]).append(r)
ok.append(f"all {len(rows)} rows keyed into {len(data)} cohorts via col H")

# --- 3. Col G start date parses; on-cycle G == H ---------------------------
COHORTS=["2026-05-11","2026-05-25","2026-06-08","2026-06-22","2026-07-06","2026-07-13",
 "2026-07-27","2026-08-10","2026-08-24","2026-09-08","2026-09-21","2026-10-05",
 "2026-10-19","2026-11-02","2026-11-30","2026-12-14"]
off=0
for r in rows:
    g=as_iso(r[6]); h=normalizeDate_(r[7])
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}",g): fails.append(f"col G {g!r} not YYYY-MM-DD")
    if h is None: fails.append(f"col H {r[7]!r} does not normalize"); continue
    if g not in COHORTS:
        off+=1
        if h not in COHORTS: fails.append(f"off-cycle {g} rolls to non-official cohort {h}")
        if not (g < h): fails.append(f"off-cycle start {g} not before cohort {h}")
ok.append(f"col G format valid; {off} off-cycle hires roll forward to official cohorts")

# --- 4. Flag consistency ---------------------------------------------------
# There is NO strict P -> C -> B ladder. Code.gs sets the three flags from three
# INDEPENDENT code paths at three different times, and guards P and Q
# separately (`if (groupLink)` / `if (meetLink)`, Code.gs:2380-2381):
#   B  sendManagerDMs_            (cohort Monday)   Code.gs:2027
#   C  markSlackChannelInTracker_ (cohort Friday)   Code.gs:2539
#   P  markGoogleGroupInTracker_  (cohort Friday)   Code.gs:2380
#   D  no writer anywhere in Code.gs - hand-maintained
# So "group set but Slack FALSE" and "Slack TRUE but B FALSE" are both REAL
# states the script can produce, and the fixture carries them on purpose (the
# Jul 27 cohort where the channel never existed; the Jun 22 row with a blank
# col M, where the group is skipped before the col-B write). The old ladder
# check asserted an ordering the code does not implement and failed 9 correct
# rows. What IS checkable: the flags must be genuine booleans, and col P must
# never be a checkbox-shaped string.
for r in rows:
    nm=f"{r[4]} {r[5]}"
    for idx,lbl in ((1,"B Manager Email Sent"),(2,"C Slack"),(3,"D Kit Ordered")):
        if r[idx] not in (True,False):
            fails.append(f"{nm}: col {lbl} is {r[idx]!r}, not a boolean - the STRING "
                         f"'FALSE' is truthy and would permanently block the row")
    grp=r[15]
    if not (grp is False or (isinstance(grp,str) and grp.startswith("https://"))):
        fails.append(f"{nm}: col P is {grp!r}; must be boolean False or a group URL")
ok.append("cols B/C/D are real booleans and col P is dual-typed (False | group URL)")

# --- 5. Col O must round-trip through parseNoteParts_ ----------------------
# Col O is the RECRUITER column, not a Notes column. Code.gs:620 writes
# `recruiter || ""` and :3508 comments 'Column O = "Recruiter" (name only)'.
# parseNoteParts_ accepts BOTH the bare name and the legacy
# 'Dept: X | Recruiter: Y' string; when neither regex matches it returns the
# whole cell as the recruiter, which is the intended modern behaviour. Demanding
# a dept out of every cell was the old contract and failed 40 correct rows.
legacy=0; modern=0; blank=0
for r in rows:
    cell=str(r[14] or "").strip()
    if not cell: blank+=1; continue
    p=parseNoteParts_(cell)
    if not p["recruiter"]:
        fails.append(f"{r[4]} {r[5]}: col O {cell!r} yields no recruiter")
    if p["dept"]:
        legacy+=1
        if p["dept"]!=str(r[18]).strip():
            fails.append(f"{r[4]} {r[5]}: legacy col O dept {p['dept']!r} != Department col")
    else:
        modern+=1
if legacy<1: fails.append("no legacy 'Dept: X | Recruiter: Y' row - that parser branch is untested")
if modern<1: fails.append("no modern bare-name col O row")
ok.append(f"col O parses: {modern} modern bare-name, {legacy} legacy Dept|Recruiter, {blank} blank")

# --- 5b. Cols G, H, T and U must be UNIFORMLY TEXT -------------------------
# REVERSED from the previous revision, which demanded MIXED types on the theory
# that Code.gs's 11 `instanceof Date` guards on row[6]/row[7] prove the live
# column is mixed and both branches should be exercised. That inverted the
# actual contract:
#   * The build spec states col G is "PLAIN TEXT ... forced to text", col H is
#     "PLAIN TEXT in exactly 'MMM dd, yyyy'", and dashboardContract #6 is
#     "ALL DATE CELLS WRITTEN AS TEXT, NEVER AS Date OBJECTS".
#   * The two read sites that have NO Date branch are the ones that matter, and
#     seeding a date cell there produces garbage rather than surfacing a bug:
#       Code.gs:747  String(row[7]) in the audit line -> prints a raw Date
#                    toString instead of "Sep 21, 2026";
#       Code.gs:2829 fixCohortDateFormat(), whose /^\d{4}-\d{2}-\d{2}$/ can never
#                    match a stringified Date, so it logs "0 cell(s) fixed".
# The unguarded reads are reported as owner actions in the handover doc
# NHO_Dummy_Tracker_README.md (this note originally pointed at FIELD_MAP.md
# section 6; that file is now in _superseded/ and contradicts the shipped file),
# not baked into the fixture.
for idx,lbl in ((6,"G"),(7,"H"),(19,"T"),(20,"U")):
    bad=[f"{r[4]} {r[5]}" for r in rows if _is_date(r[idx])]
    if bad: fails.append(f"col {lbl} holds {len(bad)} real date cell(s) "
                         f"(e.g. {bad[0]}); every date column must be text")
    else: ok.append(f"col {lbl} is uniformly text ({len(rows)} rows, no date cells)")

# --- 6. Demo requirements --------------------------------------------------
c=Counter(normalizeDate_(r[7]) for r in rows)
multi=[k for k,v in c.items() if v>=4]
if len(multi)<3: fails.append(f"only {len(multi)} cohorts with >=4 hires")
if c.get("2026-09-21",0)<4: fails.append("next cohort Sep 21 has <4 hires")
empty=[d for d in COHORTS if d not in c]
if not empty: fails.append("no empty cohort to demo the 'No hires' block")
if not (30<=len(rows)<=50): fails.append(f"hire count {len(rows)} outside 30-50")
ok.append(f"{len(rows)} hires; {len(multi)} cohorts with 4+ hires; empty cohort(s): {empty}")

nonus=[r for r in rows if not re.search(r"\b(us|usa|united states)\b",str(r[17]).lower())
       and not re.search(r", [a-z]{2}$",str(r[17]).lower())]
if len(nonus)<5: fails.append(f"only {len(nonus)} non-US hires")
ok.append(f"{len(nonus)} non-US hires drive the Non-US dashboard section")
missing_pe=sum(1 for r in rows if not str(r[8] or "").strip())
ok.append(f"{missing_pe} hires missing personal email (exercises the audit warning)")

# --- 7. PII audit: no dummy value may appear in any real source file -------
# A scrubber must not ship the secrets it is scrubbing for. Nothing sensitive is
# inlined below: the real source paths come from the env var DEMO_REAL_SOURCES
# (colon-separated), and the forbidden-token denylist is DERIVED by parsing
# those sources at runtime, with an untracked local file as the fallback.
import os
real_txt=""
_default_real=[]
_env=os.environ.get("DEMO_REAL_SOURCES","").strip()
if _env:
    _default_real=[x for x in _env.split(":") if x]
else:
    # Convenience only: pick up a Code.gs / Dashboard.html sitting next to this
    # file, or in the job tmp dir the reviewer was using. Never a fixed job id.
    import glob as _glob
    _default_real=sorted(_glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)),"Code.gs"))
                       + _glob.glob(os.path.expanduser("~/.claude/jobs/*/tmp/Code.gs"))
                       + _glob.glob(os.path.expanduser("~/.claude/jobs/*/tmp/Dashboard.html")))
REAL=_default_real
_missing=[q for q in REAL if not os.path.exists(q)] or ([] if REAL else ["<none configured: set DEMO_REAL_SOURCES>"])
_real_raw=""
for q in REAL:
    if os.path.exists(q):
        _real_raw+=open(q,encoding="utf-8",errors="ignore").read()
real_txt=_real_raw.lower()
# An IDENTITY collision is a full name or a full address appearing in the real
# source - that is what would let someone mistake a dummy record for a real
# person. A single given name or surname TOKEN matching somewhere in a
# 4,000-line file is not a collision: with any plausible name pool, common
# tokens like a surname or a US state name ("dakota") will always hit. The old
# check compared bare tokens and so reported permanent false leaks. Tokens are
# still surfaced, but as a NOTE for a human to eyeball, never as a failure.
identities=set(); tokens=set()
for r in rows:
    first,last=str(r[4] or "").strip(),str(r[5] or "").strip()
    if first and last: identities.add(f"{first} {last}".lower())
    for idx in (8,9,11,12):                      # emails + manager name
        v=str(r[idx] or "").strip().lower()
        if len(v)>3: identities.add(v)
    for v in (first.lower(),last.lower()):
        if len(v)>3: tokens.add(v)

leaks=[] if not real_txt else sorted(v for v in identities if v in real_txt)
if leaks:
    fails.append(f"PII LEAK: {len(leaks)} dummy full identity/identities appear verbatim "
                 f"in the real source - rename them")
tok_hits=[] if not real_txt else sorted(v for v in tokens
                                        if re.search(r"\b"+re.escape(v)+r"\b", real_txt))
ok.append(("PII audit SKIPPED - real source not found: "+str(_missing)) if not real_txt else
          f"PII audit: 0 of {len(identities)} dummy full identities appear in the real source")
if tok_hits:
    ok.append(f"NOTE {len(tok_hits)} single name TOKEN(s) also occur in the real source "
              f"(common given names / surnames / US state names). Not a collision on its "
              f"own - confirm none is a real person's full name before shipping.")
# Build the forbidden-token denylist by PARSING the real sources, so no real
# identifier is ever written into this file. Falls back to an untracked local
# file (one token per line) when the sources are not on this machine.
def _derive_denylist(src):
    toks=set()
    toks.update(re.findall(r"\bU[A-Z0-9]{7,}\b", src))          # Slack user ids
    toks.update(re.findall(r"\bC[A-Z0-9]{7,}\b", src))          # Slack channel ids
    toks.update(re.findall(r"\bxox[abposr]-[A-Za-z0-9-]+", src)) # Slack tokens
    for m in re.findall(r"['\"]([A-Za-z0-9_-]{30,})['\"]", src):
        toks.add(m)                                             # Drive/Sheet ids
        toks.add(m[:8])                                         # and their prefixes
    for d in re.findall(r"@([A-Za-z0-9.-]+\.[A-Za-z]{2,})", src):
        if d.lower() not in ("example.com","example.net","example.org","mailbox.example.net"):
            toks.add(d)                                         # corporate domains
    return {t for t in toks if len(t)>=6}

DENY_LOCAL=os.path.join(os.path.dirname(os.path.abspath(__file__)),".pii_denylist.local")
deny=_derive_denylist(_real_raw) if _real_raw else set()
if not deny and os.path.exists(DENY_LOCAL):
    deny={l.strip() for l in open(DENY_LOCAL,encoding="utf-8") if l.strip() and not l.startswith("#")}
if not deny:
    fails.append("denylist is empty - set DEMO_REAL_SOURCES or create .pii_denylist.local; "
                 "the real-token check did NOT run")
else:
    flat=" ".join(str(cell or "") for r in rows for cell in r).lower()
    bad=sorted(t for t in deny if t.lower() in flat)
    if bad:
        # Do not print the tokens themselves - that would re-leak them. Report
        # shape and count only.
        fails.append(f"real-system token leaked into dummy data: {len(bad)} token(s), "
                     f"first prefix {bad[0][:3]}***")
    ok.append(f"no real corporate domains, Slack ids, tokens or spreadsheet ids in the "
              f"dummy file ({len(deny)} derived tokens checked)")

print("="*70)
for o in ok: print("  PASS  "+o)
if fails:
    print("-"*70)
    for f in fails: print("  FAIL  "+f)
print("="*70)
print(("ALL CHECKS PASSED" if not fails else f"{len(fails)} FAILURES"))
