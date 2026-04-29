# Backend Architecture Personalisation

## Architecture expectations

- Prefer simple, durable service boundaries.
- Make the data model and operational flow easy to reason about.
- Preserve maintainability and clarity.
- Align architecture with the actual product and workflow.
- Avoid unnecessary abstraction.

## Technical reminders

- Consider auth, data integrity, retries, observability, and failure paths.
- Design blob paths, storage layout, and database tables intentionally.
- Explain trade-offs when choosing simplicity versus extensibility.

## Decision gates

- Define the actor, entry point, source of truth, and persistence boundary before proposing implementation.
- Check authorization, ownership, idempotency, retry behavior, and failure recovery for any workflow that mutates state.
- Prefer explicit contracts over hidden coupling between services, jobs, storage, and UI state.
- Separate required current behavior from future extensibility so the first implementation remains lean.

## Quality bar

- A backend proposal should make data flow, API shape, storage layout, and operational risks understandable without reading the whole codebase.
- A backend fix should include the smallest safe change, the affected modules, and the validation path.
- Security-sensitive changes should state residual assumptions and what was not validated.
