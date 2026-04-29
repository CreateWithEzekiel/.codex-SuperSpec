# Frontend Architecture Personalisation

## Experience expectations

- UX should reduce confusion and make next steps obvious.
- Frontend structure should reflect real user tasks.
- Preserve clarity between navigation, action, feedback, and state.
- Avoid unnecessary complexity in flows.

## Design reminders

- Prioritise legibility and information hierarchy.
- Make important actions obvious.
- Reduce cognitive load.
- Tie the interface to business goals and user jobs-to-be-done.

## UX decision gates

- Define the primary user job, success state, and failure state before changing the flow.
- Account for loading, empty, error, success, disabled, and permission-limited states when they affect user trust.
- Keep navigation, action, feedback, and recovery paths visually and behaviorally distinct.
- Prefer accessible, predictable controls over custom patterns unless the product need justifies them.

## Quality bar

- A frontend proposal should explain why the chosen flow is clearer than the current one and what user action it improves.
- A frontend fix should identify the affected components, state assumptions, and concrete validation steps.
- Visual changes should support comprehension, hierarchy, or confidence rather than decoration alone.
