---
name: "DOCS:OBSIDIAN_BOT"
description: "Maintains project documentation in Obsidian-compatible Markdown format"
version: "1.0.0"
tags: ["docs", "obsidian", "markdown", "automation"]
triggers: ["docs/obsidian/", "major-logic-change"]
---

# DOCS:OBSIDIAN_BOT

This skill automates the updating of technical documentation in `/docs/obsidian/`.

## Core Instructions

1. **Hierarchy**: Maintain the folder structure:
   - `/docs/obsidian/architecture/`
   - `/docs/obsidian/api/`
   - `/docs/obsidian/features/`
2. **Mermaid Diagrams**: Include diagrams for complex flows (auth, payment, deal analysis).
3. **Internal Links**: Use `[[File Name]]` for Obsidian-style links between documents.
4. **Synchronization**: Every time a new feature or major refactoring is completed, update the relevant `.md` file.

## Document Templates

### API Documentation Template
```markdown
# [[API Name]]

## Description
Summary of the API purpose.

## Endpoint
`POST /api/v1/...`

## Request (Zod)
[[Relevant DTO]]

## Response
Success/Error codes.
```
