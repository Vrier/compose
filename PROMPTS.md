# PROMPTS.md — Claude Code prompt kit for COMPOSE Hosted V1

Three prompts: a one-time **bootstrap**, a reusable **session prompt** (fill in the session number), and a **resume** variant for picking up a half-finished session. Copy verbatim; text in ⟨angle brackets⟩ is yours to fill.

Before first use: commit `PLAN.md`, `IMPLEMENTATION.md`, and `PROMPTS.md` to the repo root.

---

## 1 · Bootstrap prompt (run once, before Session 1)

```
You are preparing the COMPOSE repo for a multi-session build. Do not implement any features in this session.

1. Read CLAUDE.md, PLAN.md (all of it), and IMPLEMENTATION.md §0–§2.
2. Run `npm install && npm test` and `npm run build`. Report results.
3. VERIFY the eight interface contracts in IMPLEMENTATION.md §2 (C1–C8) against the actual source. For speed, dispatch parallel read-only subagents: give each subagent 2–3 contracts, the exact file/line references, and instructions to quote the relevant source lines back and state VERIFIED or DISCREPANCY with details. Subagents must not edit anything.
4. For every discrepancy, correct IMPLEMENTATION.md (and PLAN.md if affected) to match the repo — the repo is the source of truth.
5. Update CLAUDE.md: add a short section telling future sessions that PLAN.md is the plan of record, IMPLEMENTATION.md contains binding per-session briefs and interface contracts, and the session protocol in IMPLEMENTATION.md §0 is mandatory.
6. Append a session-log entry to PLAN.md §8 ("S0 — bootstrap: contracts verified, ⟨n⟩ corrections").
7. Commit everything: "S0: bootstrap — docs committed, contracts verified".

Constraints: no feature code, no dependency changes, no golden-file regeneration. If npm test is not green at step 2, stop and report instead of fixing.
```

---

## 2 · Session prompt (reusable — fill in the session number)

```
Execute Session ⟨N⟩ of the COMPOSE Hosted build.

MANDATORY STARTUP
1. Read CLAUDE.md, then PLAN.md §1–§3 and §8 (checkboxes + session log — note anything previous sessions flagged for you), then IMPLEMENTATION.md §0 (protocol), §1–§2 (conventions + contracts), and the brief for Session ⟨N⟩ in §3. The brief is binding: where it makes a decision, follow it; where it says VERIFY, verify before building on the assumption.
2. Run `npm install && npm test`. If not green, stop and report — do not fix other sessions' breakage.
3. Post a short execution plan (files you will touch, order, where you'll use subagents) BEFORE editing. Keep it to ~10 lines.

SCOPE DISCIPLINE
- Implement only Session ⟨N⟩'s work items. If you hit a blocker owned by another session, log it in PLAN.md §8 and work around or stop — never fix it silently.
- Respect IMPLEMENTATION.md §1 absolutely: classic scripts only in compose/ (no import/export), identical duplicate top-level consts across files, no new runtime dependencies, terminology per PLAN §1.1 for all new user-facing strings.
- Never regenerate test/golden.txt unless your brief explicitly expects a golden change; if so, show me the diff summary in your final report.

SUBAGENT POLICY (Opus subagents via the Task tool)
Use subagents for read-only or isolated-artifact work; keep ALL edits to shared source files in the main thread so nothing conflicts:
- Verification: contract checks, "find every reveal-answer code path", auditing lingdown for raw innerHTML, checking how the picker groups unknown chapter prefixes.
- Isolated authoring: drafting test/server.mjs against a written spec, drafting schemas/*.json, drafting DEPLOY.md or Caddyfile/systemd units, drafting the S10 LaTeX preamble — anything that is a NEW file with no concurrent editor.
- Research: reading the pinned PocketBase version's hook/router API docs and reporting the exact function signatures before you write hook code.
Give each subagent: the minimal file list, the relevant IMPLEMENTATION.md excerpt pasted into its prompt (subagents don't inherit your context), and a required output format (VERIFIED/DISCREPANCY, or a complete file draft). Review every subagent product yourself before integrating; you are accountable for it, and run the tests after integrating each one.
Do NOT parallelise edits to compose/*.jsx, build.mjs, or any file two workstreams both touch.

MANDATORY SHUTDOWN
1. Run the full test suite plus this session's acceptance checks from the brief. All green.
2. Update PLAN.md §8: tick completed boxes; append a session-log entry (date, items done, state left in, surprises, anything the next session must know — especially any deviation from the brief and why).
3. If you deviated from IMPLEMENTATION.md, update the brief to match what you actually built, in the same commit.
4. Commit: "S⟨N⟩: ⟨items⟩ — ⟨one line⟩". Then give me a 10-line summary: what shipped, what's verified working, what's flagged for later.

If the session's scope turns out larger than one session, complete a coherent, green, committed subset and log precisely where the cut line is.
```

---

## 3 · Resume prompt (for a half-finished session)

```
Resume Session ⟨N⟩ of the COMPOSE Hosted build, which was left incomplete.

1. Read CLAUDE.md, IMPLEMENTATION.md §0–§2 and the Session ⟨N⟩ brief, and PLAN.md §8 — the last session-log entry describes where work stopped.
2. Run `git log --oneline -5` and `git status`, then `npm test`. Reconcile: what does the log entry claim vs. what the tree actually contains? List remaining work from the brief as a checklist before editing anything.
3. If the tree is dirty or red: first get to a coherent green state (finish or revert the smallest possible amount), commit that as "S⟨N⟩ (wip): stabilise", then continue the checklist.
4. Then follow the standard session prompt rules (scope discipline, subagent policy, shutdown ritual) to complete Session ⟨N⟩.
```

---

## 4 · Usage notes (for you, not the agent)

- Run sessions in PLAN §7 order: S0 (bootstrap), then 1 → 11. Sessions 1–7 = shippable; W12 content sessions can interleave anytime; W14 items can be appended to any light session ("also pick up two W14 items if time allows" is a safe suffix).
- Two decisions must be made by YOU before their sessions and stated in the prompt if you've decided: domain name (needed by Session 7 / S8-deploy) and whether `/edit/:id` pages stay publicly served with API-layer auth (IMPLEMENTATION S4 default) — if you want them gated, say so in the Session 4 prompt.
- If a session reports a contract discrepancy, let it update the docs — that's the system working, not a failure.
- Keep sessions in fresh conversations; the docs + git history + session log ARE the memory between them. Don't rely on chat history.
```
