"""
COMPOSE keyboard-only derivation walk (S81).

Drives the object-position worksheet ("Gandalf loves every hobbit") to
completion without ever using the pointer: focus is placed on elements that are
in the tab order, and every action is a key press. Quantifier Raising is
performed with R, the arrow keys and Enter.

The λ-terms are not hard-coded. At each term-entry step the script reads the
un-reduced term the dock displays, then β-normalises it with the app's own
engine (`window.LC`) and types the result, so the walk exercises the real
grader rather than a stored answer key.

Usage:
    python scripts/a11y-keyboard-walk.py [base_url]
"""
import sys

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://compose.tstephen.com/cc/"
NODE = ".node-box[data-nodeid]"
STEPS = []


def log(ok, what):
    STEPS.append((ok, what))
    print(("  ok   " if ok else "  FAIL ") + what)


def trace(msg):
    print("  ..   " + msg)


def tabbable(pg, sel):
    """Every control the walk uses must be reachable by Tab, not just focusable."""
    return pg.evaluate(
        """(sel) => Array.from(document.querySelectorAll(sel))
             .every(e => e.tabIndex >= 0)""", sel)


def press(pg, key, pause=320):
    pg.keyboard.press(key)
    pg.wait_for_timeout(pause)


def dock_text(pg):
    d = pg.locator(".dock")
    return d.inner_text() if d.count() else ""


def answer_for_step(pg):
    """
    Work out what to type, from what the dock is showing and the app's own
    engine. Function Application and Non-branching Node want the β-reduced
    combination; Predicate Abstraction wants that term with a λ-binder over
    the trace index added, which is what its placeholder asks for.
    """
    return pg.evaluate(
        """() => {
            const line = document.querySelector('.dock .compose-line');
            const input = document.querySelector('.dock input');
            if (!line || !input) return null;
            const spans = Array.from(line.querySelectorAll('.lx'));
            if (!spans.length) return null;
            const src = spans[spans.length - 1].textContent.trim();
            const ph = input.getAttribute('placeholder') || '';
            if (/modified predicate/i.test(ph)) return 'UNSUPPORTED:predicate-modification';
            try {
                const E = window.LC;
                const inner = E.normalize(E.parse(E.asciiToUnicode(src)));
                const pa = ph.match(/λx₀(\\d+)/);
                if (pa) return E.toStr(E.normalize(E.Lam('x' + pa[1], inner)));
                return E.toStr(inner);
            } catch (e) { return 'PARSE_FAIL:' + src; }
        }"""
    )


def focus_ready_node(pg, skip=()):
    """Focus a node that is ready to compose and not already exhausted."""
    return pg.evaluate(
        """(skip) => {
            const ns = Array.from(document.querySelectorAll(
                ".node-box[data-nodeid][aria-label*='ready to compose']"));
            const n = ns.find(e => !skip.includes(e.dataset.nodeid));
            if (!n) return null;
            n.focus();
            return n.dataset.nodeid;
        }""", list(skip))


def focus_dock_button(pg, needle):
    """Focus a dock control by its visible text. Returns False if absent."""
    return pg.evaluate(
        """(needle) => {
            const btns = Array.from(document.querySelectorAll('.dock button'));
            const b = btns.find(x => (x.innerText || '').toLowerCase().includes(needle.toLowerCase()));
            if (!b) return false;
            b.focus();
            return true;
        }""", needle)


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(BASE, wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(800)

    # reaching the worksheet. The visible text sits in a span inside the row's
    # button, so focus goes to the enclosing control, as Tab would.
    def focus_row(text, exact=False):
        return pg.evaluate(
            """([text, exact]) => {
                const hit = Array.from(document.querySelectorAll('button, [role=button], a[href]'))
                  .find(b => { const t = (b.innerText || '').trim();
                               return exact ? t === text : t.includes(text); });
                if (!hit) return false;
                hit.focus();
                return document.activeElement === hit;
            }""", [text, exact])

    for label in ["Adjectives, Relatives & Pronouns", "Quantifiers in Object Position"]:
        log(focus_row(label), f"sidebar row focusable by keyboard: {label}")
        press(pg, "Enter", 550)
    log(focus_row("Gandalf loves every hobbit."), "exercise row focusable by keyboard")
    press(pg, "Enter", 700)
    log(pg.locator(NODE).count() > 0, "worksheet opened with the keyboard")
    log(tabbable(pg, NODE + "[aria-label*='ready to compose']"),
        "every ready node is in the tab order")

    raised = False
    stuck = set()
    for step in range(14):
        if "Derivation complete" in dock_text(pg) or "readings derived" in dock_text(pg):
            break
        nid = focus_ready_node(pg, stuck)
        if nid is None:
            # Nothing composable is left: on this worksheet the object
            # quantifier has to be raised before the VP can compose at all.
            if raised:
                break
            dps = pg.locator(NODE + "[aria-label^='Node DP']")
            opened = False
            for i in range(dps.count()):
                dps.nth(i).focus()
                press(pg, "r", 380)
                if pg.locator("button.qr-site").count() > 0:
                    opened = True
                    break
            if not opened:
                log(False, "no ready node and no raisable DP; walk stalled")
                break
            log(True, "R opened the landing-site list")
            press(pg, "Enter", 700)          # take the focused site
            raised = True
            stuck.clear()
            log(pg.locator(NODE + " .node-word sub").count() > 0,
                "raise completed by keyboard, trace inserted")
            log(pg.evaluate("() => (document.activeElement.getAttribute('data-nodeid') || '')").startswith("qrlp-"),
                "focus moved to the new lambda binder")
            continue

        press(pg, "Enter", 380)              # open the chooser for this node
        # Applicability is not exposed in the DOM: a rule announces that it
        # does not apply only once it has been tried, and the chooser stays
        # open with the card marked refused. So try cards in turn, exactly as
        # a student does, until one is taken.
        resolved = False
        for attempt in range(6):
            picked = pg.evaluate(
                """() => {
                    const cards = Array.from(document.querySelectorAll('.dock .rule-card'));
                    const ok = cards.find(c => !c.classList.contains('rejected')
                                            && !/^Raise/.test((c.innerText || '').trim()));
                    if (!ok) return null;
                    ok.focus();
                    return (ok.innerText || '').split('\\n')[0].trim();
                }"""
            )
            if not picked:
                break
            press(pg, "Enter", 420)
            has_input = (pg.locator(".dock input").count() > 0
                         and pg.locator(".dock input").first.is_visible())
            if has_input:
                term = answer_for_step(pg)
                if not term or term.startswith("PARSE_FAIL") or term.startswith("UNSUPPORTED"):
                    log(False, f"{nid}: could not work out the term to type ({term})")
                    stuck.add(nid)
                    resolved = True
                    break
                pg.keyboard.type(term, delay=3)
                press(pg, "Enter", 520)      # Enter in the input submits
                body = dock_text(pg)
                if "Not accepted" in body or "Not quite" in body or "Keep going" in body:
                    log(False, f"{nid} {picked}: typed {term} and it was refused")
                    stuck.add(nid)
                else:
                    trace(f"{nid}: {picked}, typed {term}, accepted")
                resolved = True
                break
            if "CHOOSE A COMPOSITION RULE" not in dock_text(pg):
                trace(f"{nid}: {picked} applied, nothing to reduce")
                resolved = True
                break
            # still open: that card was refused, try the next one
        if not resolved:
            trace(f"{nid}: every rule refused, so this node needs a raise first")
            stuck.add(nid)
            press(pg, "Escape", 160)
        else:
            stuck.discard(nid)

    trace("final dock: " + dock_text(pg).replace("\n", " / ")[:150])
    done = "Derivation complete" in dock_text(pg) or "matches the target" in dock_text(pg)
    log(done, "derivation completed with the keyboard alone")
    log(raised, "the completion included a Quantifier Raising")

    print("\npointer events used: 0")
    print(f"steps passed: {sum(1 for ok, _ in STEPS if ok)}/{len(STEPS)}")
    b.close()
    sys.exit(0 if all(ok for ok, _ in STEPS) else 1)
