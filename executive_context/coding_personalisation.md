# coding_personalisation.md

Guidelines for AI coding agents (Codex, GPT, etc.) working in this
repository.

This document defines **how agents should modify code** to ensure stable
patches, diff-friendly edits, and compatibility with the developer
workflow.

------------------------------------------------------------------------

# About the user

The user may be addressed as Human during replies to tasks or questions.

Human iterates fast on production code and cares about **diff-friendly edits**. When code is provided, default to **edit only what is required** and keep everything else **identical for easy diffing** (including comments/formatting). 
Human often works with Python, Excel pipelines (openpyxl), pymupdf, cadquery, trimesh, opencv-headless, asyncio, fastapi, and Azure OpenAI / Azure AI Foundry.
For web based code, Human uses React with typescript, css, html, with vite as the builder with **dist** as the output folder

------------------------------------------------------------------------

# Core Principles

Agents must follow these rules when editing code.

1.  **Make the smallest change possible**
2.  **Preserve existing structure and formatting**
3.  **Do not refactor unless explicitly requested**
4.  **Prefer targeted edits over full-file rewrites**
5.  **Keep patches small and focused**

Large patches frequently fail on Windows due to command length limits,
so agents should avoid rewriting large files.

------------------------------------------------------------------------

# Editing Rules

## Diff-Friendly Editing

When modifying files:

-   Edit **only the lines required**
-   Keep all other lines **identical**
-   Preserve:
    -   comments
    -   spacing
    -   formatting
    -   section headers

Avoid:

-   reformatting the entire file
-   renaming unrelated variables
-   reorganizing imports unless necessary

The goal is **clean git diffs**.

------------------------------------------------------------------------

## Small Targeted Patches

For large files, agents must:

1.  Modify **one function or section at a time**
2.  Avoid rewriting the entire file
3.  Prefer **multiple small patches** over one large patch

Example preferred workflow:

1.  Update config/constants
2.  Update helper functions
3.  Update specific stage functions
4.  Update main entrypoint

Never attempt to rewrite a 500+ line file in one patch.

------------------------------------------------------------------------

# Code Style Requirements

## Python

Repository conventions:

-   Use **plain functions**
-   Do **not use classes** unless explicitly requested
-   Code must remain **easy to understand for learners**

Structure:

    # ============================================================
    # SECTION HEADER
    # ============================================================

Use section headers for major blocks.

Include a short **"Changes made"** bullet list and note any new deps/env vars

------------------------------------------------------------------------

## Error Handling

Agents should add reasonable guardrails when writing code:

-   error handling
-   retries where appropriate
-   timeout protection
-   safe file handling
-   progress bars (`tqdm`) for long loops

Avoid overly complex abstractions.

------------------------------------------------------------------------

# Script Conventions

## No argparse

Scripts must use **in-code variables** instead of CLI argument parsers.

Example:

    INPUT_FILE = "data.csv"
    OUTPUT_FILE = "results.csv"

------------------------------------------------------------------------

## Environment Variables

All environment variables must be read from:

    settings.py

Do not introduce new environment loading mechanisms.

Use:

    os.getenv("xxxx", "xxxx")

------------------------------------------------------------------------

# Technology Stack

Agents should assume the repository commonly uses:

Python libraries:

-   fastapi
-   asyncio
-   openpyxl
-   pymupdf
-   cadquery
-   trimesh
-   opencv-python-headless
-   pandas
-   tqdm

Infrastructure:

-   Azure Container Apps
-   Azure Blob Storage
-   PostgreSQL
-   Docker

------------------------------------------------------------------------

# Docker Rules

Dockerfiles must follow these requirements:

Base image:

    python:3.12.10-slim

When writing multi-line RUN commands:

-   never leave a trailing `\`
-   never include empty continuation lines

Example:

    RUN apt-get update && apt-get install -y \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
        && rm -rf /var/lib/apt/lists/*

------------------------------------------------------------------------

# Patch Stability Rules

Agents must avoid patterns that frequently break patches.

Do NOT:

-   rewrite entire files
-   reformat large blocks
-   reorder functions
-   rename unrelated symbols

Instead:

-   modify only the required lines
-   keep patches small
-   edit sections sequentially

------------------------------------------------------------------------

# Workflow Expectations

Agents should assume the developer workflow is:

    edit -> review diff -> commit

Therefore changes must produce **clean readable diffs**.

------------------------------------------------------------------------

# Additional Reliability Rules (Advanced)

These rules dramatically improve reliability when AI agents edit large
codebases.

## 1. Context Awareness

Before modifying a file, agents must:

-   read the full file
-   understand the surrounding context
-   ensure the change does not break adjacent logic

Agents must **never modify code blindly based on partial context**.

------------------------------------------------------------------------

## 2. Minimal Scope Changes

When implementing a feature or fix:

-   change the **smallest number of functions possible**
-   avoid touching unrelated modules
-   avoid reformatting imports or whitespace

If multiple files must be edited:

-   update them **one at a time**.

------------------------------------------------------------------------

## 3. Stable File Anchors

Agents should prefer **stable anchors** when editing code:

Examples:

-   function definitions
-   section headers
-   clear comment markers

Avoid relying only on line numbers because they frequently drift.

Example preferred anchor:

    def stage_user_flow(...):

Not:

    line 243

------------------------------------------------------------------------

# When Uncertain

If requirements are ambiguous, agents should:

1.  Ask clarifying questions
2.  Avoid speculative refactors
3.  Preserve existing code until clarification is provided

------------------------------------------------------------------------

# Environment Instructions

- rg is blocked in this environment, use PowerShell

------------------------------------------------------------------------

# Summary

Agents must prioritize:

-   minimal edits
-   small targeted patches
-   stable git diffs
-   readable code
-   compatibility with the existing architecture
