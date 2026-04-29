# Agent Scenario Documentation

## Agent Usage Scenarios

The following scenarios describe how Codex should use the above Agents, and in what sequence they may be called, depending on the task provided by Human.

### When the task is to explore a startup idea, problem statement, or business concept:
- Start with the **Research Director** to gather facts, market context, competitors, customer pain points, and evidence from the web.
- Then pass the findings to the **Creative Director** to shape the USP, product angle, strategic differentiation, and high value concept direction.
- If funding, grants, or investor fit is relevant, then involve the **Financial Director**.
- If the findings are important for the long term direction of the project, then involve the **Documentation Specialist** to update "project_memory.md".

### When the task is to shape branding, messaging, campaigns, or posts:
- Start with the **Research Director** if market or industry research is still required.
- Then involve the **Creative Director** to determine the message angle, positioning, and unique concept.
- Then involve the **Marketing Director** to convert that into platform-specific posts, articles, campaigns, and image directions.
- If durable voice, tone, or audience preferences are identified, involve the **Documentation Specialist** to write them into "client_preferences.md" or "project_memory.md" where relevant.

### When the task is to prepare for fundraising or outreach:
- Start with the **Research Director** if more market or industry validation is required.
- Then involve the **Creative Director** to sharpen the uniqueness and strategic value of the company or solution.
- Then involve the **Financial Director** to identify likely funding pathways, grant fit, investor positioning, and write the investor outreach materials.
- If these become company-level decisions, involve the **Documentation Specialist** to preserve them.

### When the task is to design or build product features:
- Involve the **Creative Director** when the feature direction or product value still needs to be defined.
- Involve the **Solution Architect** for backend systems, APIs, storage, workflows, data structures, and service logic.
- Involve the **UI/UX Architect** for frontend UI, flows, component behaviour, and user experience design.
- Involve the **Quality Specialist** after implementation to test the flow and surface bugs.
- Involve the **Documentation Specialist** to update architecture notes, project memory, or instructions if the feature introduces durable changes.

### When the task is to solve a bug or validate software quality:
- Start with the **Quality Specialist** to reproduce the issue, inspect the full flow, identify the failing scenario, and define the test case.
- If the issue is backend related, pass it to the **Solution Architect**.
- If the issue is frontend related, pass it to the **UI/UX Architect**.
- After the fix, return to the **Quality Specialist** to rerun the test and confirm the behaviour.
- If the issue reveals a lasting rule, repeated failure mode, or client-specific preference, involve the **Documentation Specialist** to record it.

### When the task is to update project memory, client preferences, or instructions:
- Use the **Documentation Specialist**.
- Use the Documentation Specialist for durable context files such as "project_memory.md" and "client_preferences.md"; use the **Task Track n Log** skill for sprint logs in ".repo_executive_context".
- Other Agents may suggest updates, but the **Documentation Specialist** should be the primary Agent for writing and maintaining durable memory.

------------------------------------------------------------------------

## Practical Multi-Agent Examples

### Example 1: New startup concept
Spawn one **Research Director** to gather market research and competitor findings.
Then spawn one **Creative Director** to turn the findings into a differentiated product concept and USP.
Then ask the **Documentation Specialist** to write the resulting strategic decisions into the repo project's "project_memory.md" file.

### Example 2: Social media growth plan
Spawn one **Research Director** to gather market and audience signals.
Then spawn one **Creative Director** to define message angle and strategic hook.
Then spawn one **Marketing Director** to create LinkedIn, X, Reddit and Discord content plans and post drafts.
Then ask the **Documentation Specialist** to update durable messaging preferences if they should be remembered.

### Example 3: Fundraising preparation
Spawn one **Research Director** to gather market validation and industry signals.
Then spawn one **Creative Director** to sharpen the company's uniqueness and value proposition.
Then spawn one **Financial Director** to prepare funding strategy and investor outreach materials.
Then ask the **Documentation Specialist** to preserve the final direction in project memory.

### Example 4: Build and test a product flow
Spawn one **UI/UX Architect** for frontend flow design.
Spawn one **Solution Architect** for backend design and implementation.
Then spawn one **Quality Specialist** to perform end to end validation and write smoke tests.
Then ask the **Documentation Specialist** to update architecture and project memory where needed.

### Example 5: Bug reproduction and fix
Spawn one **Quality Specialist** to reproduce and define the issue.
If it is a backend issue, then spawn one **Solution Architect** to solve it.
If it is a frontend issue, then spawn one **UI/UX Architect** to solve it.
Then return to the **Quality Specialist** for validation.
If the finding is important to remember, ask the **Documentation Specialist** to record it.
