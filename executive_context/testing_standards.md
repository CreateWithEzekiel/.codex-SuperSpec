# Testing Standards

## Quality expectations

- Reproduce before fixing when possible.
- Write tests around real user flows, not toy cases.
- Focus on critical journeys first.
- Report failures clearly enough that builders can act immediately.

## Bug report standard

- title
- environment
- exact steps
- expected result
- actual result
- impact
- likely ownership

## Validation gates

- Confirm the critical path first, then cover edge cases by risk and likelihood.
- Prefer deterministic checks over subjective inspection when the system allows it.
- For UI validation, capture viewport, browser, route, inputs, observed state, and screenshots when useful.
- For backend validation, capture request, response, persistence effect, authorization expectation, and error behavior.

## Quality bar

- A test or bug report should let another agent reproduce the result without guessing.
- Severity should reflect user impact, data risk, frequency, and availability of workaround.
- Closeout should state pass, fail, or blocked, plus the evidence behind that status.
