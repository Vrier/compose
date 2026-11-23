"""
COMPOSE contrast table (S81).

Measures RENDERED elements, not palette tokens: several dark-mode tokens are
translucent (--select-soft is oklch(... / 0.15)), so a token-against-token
table would be fiction. For each element the script takes the computed colour
and composites the background stack the way a browser paints it, then reports
the WCAG 2.x ratio.

Palettes: the app writes data-theme from one state and data-dark from another.
A student sees parchment light or parchment dark, and teacher mode forces
studio. High-contrast is the S81 addition. (A fourth palette, twilight, was
never reachable from the UI and was removed in S83.)

Text needs 4.5:1 (3:1 at >=18.66px, or >=14px bold); UI state indicators 3:1.

Usage:
    python scripts/a11y-contrast.py [base_url]
"""
import sys

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://compose.tstephen.com/cc/"

# (description, selector, kind). Each is measured where it really appears.
TARGETS = [
    ("node label, selected node",    ".node-box.selected .node-label", "text"),
    ("node label, available node",   ".node-box.available .node-label", "text"),
    ("node label, plain node",       ".node-box:not(.selected):not(.available) .node-label", "text"),
    ("node span label",              ".node-box.selected .node-span-label", "text"),
    ("node denotation",              ".node-meaning:not(.pending)", "text"),
    ("node pending text",            ".node-meaning.pending", "text"),
    ("type badge",                   ".node-type-badge", "text"),
    ("exercise gloss, selected row", ".colx-item.on .colx-gloss", "text"),
    ("exercise gloss, plain row",    ".colx-item:not(.on) .colx-gloss", "text"),
    ("dock label",                   ".dock-label", "text"),
    ("dock hint",                    ".dock-hint", "text"),
    ("rule name",                    ".rule-card .rc-name", "text"),
    ("rule description",             ".rule-card:not(.rejected) .rc-desc", "text"),
    ("rule abbreviation chip",       ".rule-card .rc-abbr", "text"),
    ("refusal reason",               ".rule-card.rejected .rc-desc", "text"),
    ("sidebar section label",        ".sb-row-label", "text"),
    ("rule tag on a resolved node",  ".node-rule-tag", "text"),
    ("primary button",               ".btn-primary", "text"),
    ("raise handle glyph",           "button.qr-handle", "text"),
]

PALETTES = [("parchment", "false", "parchment light (student default)"),
            ("parchment", "true",  "parchment dark"),
            ("studio",    "false", "studio light (teacher mode)"),
            ("studio",    "true",  "studio dark"),
            ("hc",        "false", "high contrast (S81)"),
            ("hc",        "true",  "high contrast dark (S81)")]

MEASURE = """
(sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const parse = (c) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 1;
    const cx = cv.getContext('2d');
    cx.clearRect(0,0,1,1); cx.fillStyle = c; cx.fillRect(0,0,1,1);
    const d = cx.getImageData(0,0,1,1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  // source-over on non-premultiplied colours
  const over = (s, d) => {
    const a = s[3] + d[3] * (1 - s[3]);
    if (a === 0) return [0, 0, 0, 0];
    return [(s[0]*s[3] + d[0]*d[3]*(1-s[3])) / a,
            (s[1]*s[3] + d[1]*d[3]*(1-s[3])) / a,
            (s[2]*s[3] + d[2]*d[3]*(1-s[3])) / a, a];
  };
  const layers = [];
  for (let n = el; n; n = n.parentElement) {
    const c = parse(getComputedStyle(n).backgroundColor);
    if (c[3] > 0) { layers.push(c); if (c[3] >= 0.999) break; }
  }
  let bg = [255, 255, 255, 1];
  for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
  const fg = over(parse(getComputedStyle(el).color), bg);
  const cs = getComputedStyle(el);
  return { fg: fg.slice(0,3), bg: bg.slice(0,3),
           px: parseFloat(cs.fontSize), weight: cs.fontWeight };
}
"""


def lum(c):
    def ch(v):
        v = v / 255.0
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2])


def ratio(fg, bg):
    a, b = lum(fg), lum(bg)
    return (max(a, b) + 0.05) / (min(a, b) + 0.05)


def need(px, weight, kind):
    if kind == "ui":
        return 3.0
    bold = False
    try:
        bold = int(weight) >= 700
    except (TypeError, ValueError):
        bold = weight == "bold"
    return 3.0 if (px >= 18.66 or (bold and px >= 14)) else 4.5


def hexs(c):
    return "#%02x%02x%02x" % tuple(int(round(x)) for x in c)


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(BASE, wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(700)
    pg.get_by_text("Adjectives, Relatives & Pronouns", exact=False).first.click(); pg.wait_for_timeout(300)
    pg.get_by_text("Quantifiers in Object Position", exact=False).first.click(); pg.wait_for_timeout(450)
    pg.get_by_text("Gandalf loves every hobbit.", exact=True).first.click(); pg.wait_for_timeout(500)
    # Drive to a state that shows everything at once: a resolved node (rule
    # tag, raise handle), a selected node, an available node, a refused rule
    # and the term entry with its primary button.
    for _ in range(8):
        ready = pg.locator(".tree-node", has_text="ready — select")
        if ready.count() == 0:
            break
        ready.first.locator(":scope > *").first.click(); pg.wait_for_timeout(220)
        nn = pg.locator("button", has_text="Non-branching")
        if nn.count() == 0 or "exactly one child" in nn.first.inner_text():
            pg.get_by_role("button", name="Cancel").first.click(); break
        pg.locator("button:has-text('inherits that child')").first.click(); pg.wait_for_timeout(220)
    pg.locator(".node-box[data-nodeid][aria-label^='Node DP. ready']").first.click(); pg.wait_for_timeout(260)
    pg.locator("button:has-text('Apply a function sister')").first.click(); pg.wait_for_timeout(320)
    pg.locator("input:visible").last.fill("λQ.∀z.hobbit(z)→Q(z)")
    pg.get_by_role("button", name="Check answer").click(); pg.wait_for_timeout(520)
    pg.locator(".node-box[data-nodeid][aria-label*='ready to compose']").first.click()
    pg.wait_for_timeout(300)
    cards = pg.locator(".dock .rule-card")
    if cards.count() > 1:
        cards.nth(0).click(); pg.wait_for_timeout(320)

    fails = []
    for theme, dark, name in PALETTES:
        pg.evaluate("([t, d]) => { document.documentElement.dataset.theme = t;"
                    "document.documentElement.dataset.dark = d; }", [theme, dark])
        # .node-box carries `transition: all .16s`, so a palette swap animates;
        # measuring too early samples a colour mid-transition.
        pg.wait_for_timeout(500)
        print(f"\n=== {name}")
        print(f"{'style':30} {'fg':>8} {'bg':>8} {'px':>5} {'ratio':>8} {'needs':>6}  verdict")
        for desc, sel, kind in TARGETS:
            m = pg.evaluate(MEASURE, sel)
            if not m:
                print(f"{desc:30} {'—':>8} {'—':>8} {'—':>5} {'not in this state':>8}")
                continue
            r = ratio(m["fg"], m["bg"])
            n = need(m["px"], m["weight"], kind)
            ok = r >= n
            if not ok:
                fails.append((r, name, desc))
            print(f"{desc:30} {hexs(m['fg']):>8} {hexs(m['bg']):>8} {m['px']:5.1f} "
                  f"{r:6.2f}:1 {n:5.1f}  {'ok' if ok else 'FAILS'}")

    print(f"\n{len(fails)} measured style(s) below threshold")
    for r, name, desc in sorted(fails):
        print(f"  {r:5.2f}:1  {name:34} {desc}")
    b.close()
