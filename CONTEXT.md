# FundaVida

Educational management for a Costa Rican non-profit, rearchitected as a browser-only portfolio demo. Students enroll in courses run as cohorts at community centers; attendance, grades, and certificates track their progress.

## Language

### Scheduling

**Course**:
One cohort of a program: a named class with a Term and Meeting Days, taught by one Teacher. A new run of the same program is a new Course.
_Avoid_: class, program (a Program is what a Course is an instance of)

**Term**:
The date range a Course runs, from start date to end date. Enrollment, Sessions, and the Grade all fall inside or at the edges of the Term.

**Meeting Days**:
The weekdays a Course meets (e.g. Mon/Wed). Together with the Term, they derive the Session list.
_Avoid_: schedule (ambiguous)

**Session**:
A single class meeting, derived from Term × Meeting Days — never stored as free-standing dates. Attendance is recorded per Session.
_Avoid_: event, class day

**Demo Epoch**:
The moment the seed runs in the viewer's browser. All seeded dates are positioned relative to it (completed, in-progress, and upcoming Courses), so the demo never decays as real time passes.
_Avoid_: reference date, anchor date

### Credentials

**Grade**:
The single 0–100 score a Teacher issues for one Enrollment after the Term ends. 70 or above is passing.
_Avoid_: score (as an entity name), mark

**Certificate**:
Recognition of a passing Grade. Created automatically as *pending* when the passing Grade is saved; *approved* by an admin, which is what makes the PDF available.
_Avoid_: diploma, eligible/eligibility (the old derived-list vocabulary)

**Attendance**:
A per-Session, per-enrolled-student present/absent record, marked by the Course's Teacher (or an admin).

### Community Service

**TCU Trainee**:
A university student completing their required community-service hours (300) at the foundation. Not a Student — Trainees are not enrolled in Courses.
_Avoid_: organizer, tcu user

**TCU Activity**:
One unit of service work a TCU Trainee logs: title, hours, date. Belongs to a Trainee, never to a Student.
