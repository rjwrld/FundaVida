# Product

## Register

product

## Users

Staff of a Costa Rican educational non-profit, role-played through four personas: an **admin** coordinating three community centers (Sedes), **Teachers** running course cohorts (marking attendance, issuing Grades, closing Courses), **Students** (minors, with guardians) tracking their own enrollment and progress, and **TCU Trainees** (university volunteers) logging service hours toward 300. The app is a browser-only portfolio demo — no backend, seeded data — but design decisions treat the personas as real daily users: take the workflow seriously and portfolio quality follows. The demo viewer (recruiter, peer) experiences the app _through_ a persona, never as a separate audience with separate affordances.

## Product Purpose

Educational management: Students enroll in Courses (cohorts at community centers); attendance, Grades, and Certificates track their progress; volunteers log community-service hours. Success for any screen is that the persona's primary task is obvious, fast, and safe — the teacher lands on the course that needs grading, the volunteer sees their assigned Course and logs hours in two clicks, the admin sees what needs closing. Domain vocabulary is contractual: `CONTEXT.md` terms (Course, Term, Session, Sede, Grade, Certificate, Encargado, Student Progress, Owned Courses) appear verbatim in UI copy, EN and ES.

## Brand Personality

**Calm, structural, hopeful.** Near-monochrome engineering restraint — flat bordered surfaces, hairline borders, compressed structural type — with Figure Green (`#32982D`, hue 138, the logo green) as the single chromatic voice. The green is scarce so it is semantically loud: primary actions, active nav, moments of achievement (a passing Grade, an issued Certificate). Tone of copy is plain and warm, never corporate; "Hope changes everything" is the register.

## Anti-references

- **Electric lime `#7CFC00`** — the old blueprint-skin accent, explicitly reverted; never reintroduce it as the brand green.
- **SaaS dashboard clichés** — hero-metric cards with gradient accents, identical icon-card grids, decorative glassmorphism. The dashboard is a work surface, not a pitch.
- **NGO-pastel softness** — rounded pastel illustration-heavy charity aesthetics; this brand's warmth comes from copy and the green, not from decoration.
- **Duplicated affordances** — the same data rendered twice on one screen with different chrome (the Schedule / Mark-attendance wall) is the house failure mode; one surface per concept.

## Design Principles

1. **Workflow first.** Every screen answers "what does this persona do next?" before it answers "what does this show?" The primary task gets the primary affordance.
2. **One surface per concept.** A concept (Sessions, Progress, hours) renders once, with states, not twice with different chrome. Duplication is a design bug.
3. **Derived, never duplicated.** UI verdicts come from the domain's derivation seams (`sessionsFor`, `closeReadiness`, scope tokens) — the UI never re-derives a rule the domain already owns (ADRs 0001, 0029–0036).
4. **Scarce green.** Figure Green marks the action or the achievement; everything else stays in the mono ramp. If a screen is >10% green, it's shouting.
5. **Both languages, all states.** Every string through i18next EN+ES; every list ships loading / empty / no-results states; WCAG A/AA is CI-enforced (full axe sweep), not aspirational.

## Accessibility & Inclusion

WCAG 2.1 A/AA enforced in CI by a full-page axe sweep (all pages, best-practice rules on). Keyboard-first flows (skip link, focus-on-navigate already shipped); Radix primitives for dialogs/menus; `prefers-reduced-motion` respected via the motion seam (ADR-0027). Spanish is a first-class locale, not a translation afterthought — copy length differences must not break layouts.
