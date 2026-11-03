"""
COMPOSE accessibility audit (S81).

Runs axe-core (WCAG 2.x A/AA + best-practice tags) on five states of a live
derivation, then checks keyboard operability, live regions and reduced-motion
support. Grown from the audit written against compose.tstephen.com v1.3.0 on
28 October 2026; selectors are listed at the top so they can be updated if the
DOM changes.

S81 changes to that original, all in the probe section:
  * The QR probe asked `locator("button", has_text="Raise").count() > 0`,
    which matches the pre-existing "Undo raise" button and so printed True on
    v1.3.0, where no keyboard path to Quantifier Raising existed at all. It now
    requires a control whose accessible name STARTS with "Raise", and then
    performs a keyboard-only raise and checks that a trace leaf appeared.
  * Inconclusive ("incomplete") results are broken down by rule and, for
    colour contrast, by axe's messageKey, because the headline count is
    dominated by axe limits on single-character and symbol text rather than by
    anything that can be fixed.

Usage:
    pip install playwright
    python -m playwright install chromium
    python scripts/a11y-audit.py [base_url]
"""
import re
import sys
from collections import Counter

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://compose.tstephen.com/cc/"
AXE = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js"
TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]

# Selectors observed on v1.3.0
NODE = ".node-box[data-nodeid]"            # role=button, tabindex=0, aria-label "Node VP. ready to compose, press Enter..."
READY = NODE + "[aria-label^='Node {cat}. ready']"
QR_HANDLE = "button.qr-handle"             # title "Drag to raise (QR)"
TERM_INPUT = "input[placeholder='Enter the β-reduced result…']"
RULE_FA = "button:has-text('Apply a function sister')"
RULE_NN = "button:has-text('inherits that child')"
RULE_PA = "button:has-text('Predicate Abstraction')"

TOTALS = Counter()


def axe(pg, label):
    pg.add_script_tag(url=AXE)
    pg.wait_for_timeout(500)
    res = pg.evaluate(
        "async (tags) => await axe.run(document, {runOnly:{type:'tag', values:tags}})", TAGS
    )
    inc = sum(len(i["nodes"]) for i in res["incomplete"])
    print(f"\n== {label}: {len(res['violations'])} violation(s), "
          f"{inc} inconclusive node(s)")
    for v in res["violations"]:
        print(f"  [{v['impact']}] {v['id']}: {v['help']} ({len(v['nodes'])} nodes)")
        TOTALS[v["id"]] += len(v["nodes"])
        for n in v["nodes"][:3]:
            print("     ", n["html"][:120].replace("\n", " "))
            if v["id"] == "color-contrast":
                d = (n.get("any") or [{}])[0].get("data") or {}
                print(f"       ratio {d.get('contrastRatio')}:1  fg {d.get('fgColor')}"
                      f"  bg {d.get('bgColor')}  {d.get('fontSize')}  {d.get('fontWeight')}")
    by_rule = Counter()
    for i in res["incomplete"]:
        by_rule[i["id"]] += len(i["nodes"])
    if by_rule:
        print("   inconclusive by rule:", dict(by_rule))
    keys = Counter()
    hidden = 0
    for i in res["incomplete"]:
        if i["id"] != "color-contrast":
            continue
        for n in i["nodes"]:
            d = (n.get("any") or [{}])[0].get("data") or {}
            keys[d.get("messageKey") or "none"] += 1
            if 'aria-hidden="true"' in n["html"][:300]:
                hidden += 1
    if keys:
        print("   contrast-inconclusive cause:", dict(keys),
              f"| of which aria-hidden {hidden}")
    return res


def solve_leaves(pg):
    for _ in range(8):
        ready = pg.locator(".tree-node", has_text="ready — select")
        if ready.count() == 0:
            break
        ready.first.locator(":scope > *").first.click()
        pg.wait_for_timeout(300)
        nn = pg.locator("button", has_text="Non-branching")
        if nn.count() == 0 or "exactly one child" in nn.first.inner_text():
            pg.get_by_role("button", name="Cancel").first.click()
            break
        pg.locator(RULE_NN).first.click()
        pg.wait_for_timeout(300)


def answer(pg, term):
    pg.locator("input:visible").last.fill(term)
    pg.get_by_role("button", name="Check answer").click()
    pg.wait_for_timeout(500)


def drag_raise(pg):
    handle = pg.locator(QR_HANDLE).first
    target = pg.locator(NODE).filter(has_text="S").first
    hb, sb = handle.bounding_box(), target.bounding_box()
    pg.mouse.move(hb["x"] + hb["width"] / 2, hb["y"] + hb["height"] / 2)
    pg.mouse.down()
    for k in range(1, 16):
        pg.mouse.move(hb["x"] + (sb["x"] + sb["width"] / 2 - hb["x"]) * k / 15,
                      hb["y"] + (sb["y"] + sb["height"] / 2 - hb["y"]) * k / 15)
        pg.wait_for_timeout(25)
    pg.mouse.up()
    pg.wait_for_timeout(700)


# ---- keyboard probes -------------------------------------------------------
def traces(pg):
    """Trace leaves in the tree, the observable result of a raise."""
    return pg.locator(NODE + " .node-word sub").count()


SITE = "button.qr-site"            # a landing site in the raise list


def dock_raise_entry(pg):
    """A raise control in the dock. The drag handle and 'Undo raise' must not match."""
    return pg.locator(".dock").get_by_role("button", name=re.compile(r"^\s*Raise", re.I))


def probe_dock_raise_entry(pg):
    """The chooser must offer a raise for a raisable node, not only the handle."""
    dps = pg.locator(NODE + "[aria-label^='Node DP']")
    for i in range(dps.count()):
        dps.nth(i).focus()
        pg.keyboard.press("Enter")
        pg.wait_for_timeout(300)
        if dock_raise_entry(pg).count() > 0:
            pg.keyboard.press("Escape")
            pg.wait_for_timeout(200)
            return True
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(150)
    return False


def probe_keyboard_raise(pg):
    """
    The acceptance test for the non-drag path: focus a raisable DP, press R,
    and drive the landing-site list with the arrow keys and Enter. No pointer
    is used, and the drag handle cannot satisfy it — the list must appear from
    the key press alone and focus must already be inside it.
    """
    # Not every DP can raise (a type-e subject cannot), so try each in turn
    # rather than assuming the first one in the tree is the quantifier.
    dps = pg.locator(NODE + "[aria-label^='Node DP']")
    if dps.count() == 0:
        return False, "no DP node"
    before = traces(pg)
    opened = False
    for i in range(dps.count()):
        dps.nth(i).focus()
        pg.keyboard.press("r")
        pg.wait_for_timeout(400)
        if pg.locator(SITE).count() > 0:
            opened = True
            break
    if not opened:
        return False, f"R on a focused node opened no landing-site list ({dps.count()} DP node(s) tried)"
    focused_in_list = pg.evaluate(
        "(sel) => !!document.activeElement && document.activeElement.matches(sel)", SITE)
    if not focused_in_list:
        return False, "landing-site list opened but focus was not moved into it"
    n_sites = pg.locator(SITE).count()
    pg.keyboard.press("ArrowDown")
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(700)
    after = traces(pg)
    moved = pg.evaluate(
        "() => { const a = document.activeElement; return a ? (a.getAttribute('data-nodeid') || '') : ''; }")
    if after <= before:
        return False, f"list drove but no trace appeared (traces {before} -> {after})"
    return True, (f"traces {before} -> {after}, {n_sites} site(s) offered, "
                  f"focus now on node {moved or 'unknown'}")


def live_text(pg):
    el = pg.locator("[aria-live], [role=status], [role=alert]")
    return " | ".join(el.nth(i).inner_text() for i in range(el.count()))


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(BASE, wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(800)
    axe(pg, "library")

    pg.get_by_text("Adjectives, Relatives & Pronouns", exact=False).first.click(); pg.wait_for_timeout(400)
    pg.get_by_text("Quantifiers in Object Position", exact=False).first.click(); pg.wait_for_timeout(600)
    pg.get_by_text("Gandalf loves every hobbit.", exact=True).first.click(); pg.wait_for_timeout(600)
    solve_leaves(pg)
    pg.locator(READY.format(cat="DP")).first.click(); pg.wait_for_timeout(400)
    axe(pg, "rule chooser open")

    pg.locator(RULE_FA).first.click(); pg.wait_for_timeout(500)
    axe(pg, "term entry")
    answer(pg, "λQ.∀z.hobbit(z)→Q(z)")
    good = live_text(pg)

    pg.locator(READY.format(cat="VP")).first.click(); pg.wait_for_timeout(400)
    pg.locator(RULE_FA).first.click(); pg.wait_for_timeout(400)
    axe(pg, "rule refused")
    pg.get_by_role("button", name="Cancel").first.click(); pg.wait_for_timeout(300)

    # --- keyboard and semantics probes -------------------------------------
    print("\n== keyboard / semantics")
    print("dock offers a Raise entry for a raisable node:", probe_dock_raise_entry(pg))
    kb_ok, kb_note = probe_keyboard_raise(pg)
    print("QR keyboard-operable (R, arrows, Enter completes a raise):", kb_ok, "|", kb_note)
    if not kb_ok:
        drag_raise(pg)
    axe(pg, "after QR")

    node = pg.locator(READY.format(cat="VP")).first
    if node.count() == 0:
        node = pg.locator(NODE + "[aria-label*='ready']").first
    node.focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(400)
    print("Enter on a focused node opens chooser:",
          "CHOOSE A COMPOSITION RULE" in pg.inner_text("body"))
    print("role=dialog present when chooser open:", pg.locator("[role=dialog]").count() > 0)
    print("chooser has an accessible name:", bool(
        pg.evaluate("""() => { const d = document.querySelector('[role=dialog]'); if (!d) return '';
            const l = d.getAttribute('aria-label'); if (l) return l;
            const id = d.getAttribute('aria-labelledby');
            const t = id && document.getElementById(id); return t ? t.textContent.trim() : ''; }""")))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    print("Escape closes chooser:",
          "CHOOSE A COMPOSITION RULE" not in pg.inner_text("body"))
    print("aria-live regions:", pg.locator("[aria-live]").count(),
          "| role=status:", pg.locator("[role=status]").count(),
          "| role=alert:", pg.locator("[role=alert]").count())
    print("feedback announced on a correct check:", bool(good.strip()), "|", good.strip()[:80])
    print("prefers-reduced-motion rule in CSS:", pg.evaluate(
        "() => Array.from(document.styleSheets).some(s=>{try{return Array.from(s.cssRules)"
        ".some(r=>r.cssText.includes('prefers-reduced-motion'))}catch(e){return false}})"))
    print("html lang:", pg.evaluate("() => document.documentElement.lang"))

    print("\n== violation totals across the five states:",
          dict(TOTALS) if TOTALS else "none")
    b.close()
