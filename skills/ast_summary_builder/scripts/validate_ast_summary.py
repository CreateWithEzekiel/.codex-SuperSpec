\
from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(".").resolve()
SUMMARY_ROOT = REPO_ROOT / ".repo_executive_context" / "ast_summaries"

REQUIRED_MD_HEADINGS = [
    "# AST Summary:",
    "## Summary Status",
    "## File Role",
]

REQUIRED_JSON_KEYS = [
    "source_path",
    "language",
    "source_hash",
    "file_role",
    "imports",
    "exports",
    "top_level_definitions",
    "functional_groups",
    "section_summaries",
    "logic_notes",
    "confidence",
]


def validate_markdown_file(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        text = path.read_text(encoding="utf-8")
    except Exception as exc:
        return [f"Could not read markdown file: {exc}"]

    for heading in REQUIRED_MD_HEADINGS:
        if heading not in text:
            errors.append(f"Missing heading: {heading}")

    if "- Source hash: `" not in text:
        errors.append("Missing source hash line in summary status block.")

    return errors


def validate_json_file(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"Could not parse JSON facts file: {exc}"]

    for key in REQUIRED_JSON_KEYS:
        if key not in payload:
            errors.append(f"Missing JSON key: {key}")

    if "section_summaries" in payload and not isinstance(payload["section_summaries"], list):
        errors.append("section_summaries must be a list.")

    if "logic_notes" in payload and not isinstance(payload["logic_notes"], list):
        errors.append("logic_notes must be a list.")

    if "functional_groups" in payload and not isinstance(payload["functional_groups"], list):
        errors.append("functional_groups must be a list.")

    return errors


def main() -> None:
    if not SUMMARY_ROOT.exists():
        print("No summary folder found.")
        raise SystemExit(1)

    failed = False
    md_files = sorted(SUMMARY_ROOT.rglob("*.md"))
    json_files = sorted(SUMMARY_ROOT.rglob("*.facts.json"))

    for path in md_files:
        errors = validate_markdown_file(path)
        if errors:
            failed = True
            print(path.relative_to(REPO_ROOT).as_posix())
            for error in errors:
                print(f"  - {error}")

    for path in json_files:
        errors = validate_json_file(path)
        if errors:
            failed = True
            print(path.relative_to(REPO_ROOT).as_posix())
            for error in errors:
                print(f"  - {error}")

    if failed:
        raise SystemExit(1)

    print(f"All AST summary files passed validation. Markdown files: {len(md_files)}, JSON facts files: {len(json_files)}")


if __name__ == "__main__":
    main()
