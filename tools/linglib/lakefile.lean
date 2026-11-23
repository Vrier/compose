import Lake
open Lake DSL

/-! The Lean side of COMPOSE's Linglib cross-check (see README.md in this folder).

Linglib is pinned to a release tag, so its compiled files come from that release and Mathlib's
from the Mathlib cache: nothing of either is compiled locally. -/

package composeLean where
  leanOptions := #[⟨`autoImplicit, false⟩]

require linglib from git
  "https://github.com/linglib-community/linglib" @ "v4.36.0"

@[default_target]
lean_lib ComposeLean where
  globs := #[.submodules `ComposeLean]
