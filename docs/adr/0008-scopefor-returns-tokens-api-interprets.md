# scopeFor returns declarative scope tokens; the API layer interprets them

`scopeFor(role)` returns a per-resource map of declarative tokens (`'all'`, `'own'`, `'enrolledInOwnCourses'`, `'self'`, `'none'`, …); a single interpreter in the API layer (`src/data/api/scope.ts`) maps each token to its data join against store state. The permissions module stays pure data with no store or entity imports. We chose tokens over a predicate factory (predicates would couple the matrix to the store's shape and make the module untestable without fixtures) and over keeping the nine per-API `applyRoleFilter` copies (the divergence this replaces).

## Consequences

- The matrix is exhaustively testable as data; the interpreter is testable once, not nine times.
- Adding a new scope semantics (a new token) means one interpreter branch plus matrix cells — not a new per-API filter.
- Token semantics (which joins `'enrolledInOwnCourses'` performs) are the interpreter's contract; the matrix only names them.
