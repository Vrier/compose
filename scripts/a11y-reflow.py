"""
COMPOSE reflow and resize check (S81) — SC 1.4.10 and SC 1.4.4.

Walks the four derive states at a given viewport and reports, for each, any
horizontal scrolling of the page and any dock control that is clipped. The
tree pane is allowed to scroll: it is a diagram in its own scroll container,
which 1.4.10 exempts. The chooser, the term input and the feedback are not.

Viewports:
  320x640   the 1.4.10 reflow width (320 CSS px, equivalent to 400% zoom)
  640x450   what a 1280x900 window becomes at 200% browser zoom (1.4.4)

Usage:
    python scripts/a11y-reflow.py <width> <height> [base_url] [--shots DIR]
"""
import os
import sys

from playwright.sync_api import sync_playwright

W = int(sys.argv[1]) if len(sys.argv) > 1 else 320
H = int(sys.argv[2]) if len(sys.argv) > 2 else 640
BASE = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith("--") \
    else "https://compose.tstephen.com/cc/"
SHOTS = None
if "--shots" in sys.argv:
    SHOTS = sys.argv[sys.argv.index("--shots") + 1]
    os.makedirs(SHOTS, exist_ok=True)

# controls that must stay fully visible, whatever the width
MUST_FIT = [".dock .rule-card", ".dock input", ".dock .btn-primary",
            ".dock .feedback", ".dock-label", "button.qr-site"]

problems = []


def check(pg, state):
    r = pg.evaluate(
        """(sels) => {
            const vw = document.documentElement.clientWidth;
            const vh = document.documentElement.clientHeight;
            const out = { hscroll: document.documentElement.scrollWidth - vw, clipped: [] };
            for (const sel of sels) {
                for (const el of document.querySelectorAll(sel)) {
                    const b = el.getBoundingClientRect();
                    if (b.width === 0 && b.height === 0) continue;
                    if (b.right > vw + 1 || b.left < -1) {
                        out.clipped.push(sel + ' right=' + Math.round(b.right) + ' vw=' + vw);
                    }
                }
            }
            return out;
        }""", MUST_FIT)
    bad = r["hscroll"] > 1 or r["clipped"]
    print(f"  {state:22} page h-overflow {r['hscroll']:>4}px   clipped {len(r['clipped'])}")
    for c in r["clipped"][:3]:
        print("      " + c)
    if bad:
        problems.append((state, r))
    if SHOTS:
        pg.screenshot(path=os.path.join(SHOTS, f"{W}x{H}-{state.replace(' ', '-')}.png"),
                      full_page=False)


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": W, "height": H})
    pg.goto(BASE, wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(800)
    print(f"\n== {W}x{H}")
    check(pg, "library")

    # Open the worksheet by its unlock code rather than by clicking through
    # the sidebar: the three layout bands put those rows in different places,
    # and the point here is the derive view, not the navigation.
    root = BASE.rsplit("/cc/", 1)[0] if "/cc/" in BASE else BASE.rstrip("/")
    pg.goto(root + "/?code=RRJ87W", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(900)
    if W < 760:
        t = pg.get_by_role("button", name="Exercises")
        if t.count():
            t.first.click(); pg.wait_for_timeout(400)
    g = pg.get_by_text("Gandalf loves every hobbit.", exact=True)
    if g.count():
        g.first.click(); pg.wait_for_timeout(700)
    if W < 760:
        d = pg.get_by_role("button", name="Derive")
        if d.count():
            d.first.click(); pg.wait_for_timeout(500)
    opened = pg.locator(".prob-title").first.inner_text() if pg.locator(".prob-title").count() else "?"
    print(f"  (worksheet open: {opened.strip()[:48]})")

    for _ in range(8):
        ready = pg.locator(".tree-node", has_text="ready — select")
        if ready.count() == 0:
            break
        ready.first.locator(":scope > *").first.click(); pg.wait_for_timeout(220)
        nn = pg.locator("button", has_text="Non-branching")
        if nn.count() == 0 or "exactly one child" in nn.first.inner_text():
            pg.get_by_role("button", name="Cancel").first.click(); break
        pg.locator("button:has-text('inherits that child')").first.click(); pg.wait_for_timeout(220)

    dp = pg.locator(".node-box[data-nodeid][aria-label^='Node DP. ready']")
    if dp.count():
        dp.first.click(); pg.wait_for_timeout(350)
    check(pg, "rule chooser open")

    fa = pg.locator("button:has-text('Apply a function sister')")
    if fa.count():
        fa.first.click(); pg.wait_for_timeout(400)
    check(pg, "term entry")
    inp = pg.locator("input:visible")
    if inp.count():
        inp.last.fill("λQ.∀z.hobbit(z)→Q(z)")
        pg.get_by_role("button", name="Check answer").first.click(); pg.wait_for_timeout(600)

    dps = pg.locator(".node-box[data-nodeid][aria-label^='Node DP']")
    for i in range(dps.count()):
        dps.nth(i).focus(); pg.keyboard.press("r"); pg.wait_for_timeout(300)
        if pg.locator("button.qr-site").count() > 0:
            break
    check(pg, "raise landing list")

    print(f"\n{len(problems)} state(s) with clipping or page-level horizontal scrolling")
    b.close()
    sys.exit(1 if problems else 0)
