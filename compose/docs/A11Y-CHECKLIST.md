# Assistive-technology checklist (S81)

A manual pass over the derive view with a screen reader. Automated testing
(axe-core, the keyboard walk, the contrast and reflow scripts) runs in CI and
in `scripts/a11y-*.py`; this covers what only a person with a screen reader can
judge, which is whether the announcements make sense in sequence.

Worksheet throughout: **Quantifiers in Object Position**, code `RRJ87W`, item
*Gandalf loves every hobbit*. Allow 20 minutes per pass.

## Configurations

| # | Platform | Screen reader | Browser | Done | By | Date |
|---|----------|---------------|---------|------|----|------|
| 1 | macOS | VoiceOver | Safari | ☐ | | |
| 2 | macOS | VoiceOver | Chrome | ☐ | | |
| 3 | iOS | VoiceOver | Safari | ☐ | | |
| 4 | Windows | NVDA | Firefox | ☐ | | |
| 5 | Windows | NVDA | Chrome | ☐ | | |

Keys: VoiceOver VO = Control+Option; next item VO+→; activate VO+Space.
NVDA browse mode moves with ↓; Enter activates; Insert+Space toggles focus mode.
On iOS, swipe right for next item, double-tap to activate.

## Steps

Record what was actually heard next to each expectation. "As expected" is a
valid entry; anything else should be quoted.

| # | Action | Expected announcement | Heard |
|---|--------|----------------------|-------|
| 1 | Load `/?code=RRJ87W` | Page title "COMPOSE"; language English | |
| 2 | Reach the exercise list, open *Gandalf loves every hobbit* | The row is a button and reads the sentence | |
| 3 | Tab into the tree | "Derivation tree for: Gandalf loves every hobbit, group" | |
| 4 | Reach an unresolved branch node | "Node VP. awaiting children, group" | |
| 5 | Reach a resolved leaf | "Leaf loves. denotation lambda y lambda x dot love of x and y, type e to e to t, group" — the term as words, no glyph names | |
| 6 | Reach a node that is ready | "Node DP. ready to compose, press Enter to choose a rule, button" | |
| 7 | Press Enter | The dialog is entered and named "Choose a composition rule for DP"; focus lands on the first rule | |
| 8 | Move through the rules | Each reads name, abbreviation, description | |
| 9 | Choose a rule that does not apply | The card reads "Does not apply." before its name, reports itself as disabled, and the reason is read: "Function Application combines exactly two sisters; this node has 1." | |
| 10 | Press Escape | The dialog closes and focus returns to the node it came from | |
| 11 | Re-open, choose Function Application | Focus moves to the term input, which reads its label "Enter the beta-reduced result" | |
| 12 | Type a wrong answer, press Enter | Interrupts with "Not accepted. Not equivalent yet. Check which variable each argument replaces." | |
| 13 | Type the right answer with ASCII only (`lambda Q.forall z.hobbit(z) -> Q(z)`) | Accepted, and politely announced "Correct. Correct — node resolved by Function Application." | |
| 14 | Reach the raised DP and press R | "Choose a landing site for every hobbit. 1 site available, use the arrow keys and press Enter."; focus is on the first site | |
| 15 | Press Enter | "Raised every hobbit to S; trace t1 inserted. Focus is on the new lambda binder node, which Predicate Abstraction resolves." | |
| 16 | Confirm where focus landed | The new binder node | |
| 17 | Finish the derivation | On the last step: "Correct derivation. The meaning matches the target." | |
| 18 | Activate Undo raise | "Raise undone. The tree and the compositions you had before the raise are restored." | |
| 19 | Open Display, switch High contrast on | The switch reports its state both ways | |
| 20 | With the OS "reduce motion" setting on, repeat steps 6 to 15 | Nothing animates; no announcement is lost | |

## What counts as a failure

- A term or type read as glyph names, or skipped.
- An announcement that never arrives, or arrives so late it has been
  overtaken by the next one.
- Focus landing somewhere the step above does not name.
- A refusal reason reachable only by sight.
- Any step that cannot be completed without a pointer.

## Recording

Copy this table into a new dated section below per configuration, fill the
Heard column, and note the versions (macOS, iOS, Windows, NVDA, browser).
Failures become issues referencing the step number.

---

## Results
