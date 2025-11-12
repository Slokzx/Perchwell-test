# Perchwell Frontend Take-Home · File Explorer Refactor

Thank you for taking the time to work on this exercise. We expect candidates to spend **~90 minutes** on the core requirements. 

**Don't worry if you run out of time; leave notes on what you would tackle next.**

## What’s in the starter?

- Next.js (App Router) with TypeScript.
- A basic file explorer under `app/components/FileExplorer.tsx`.
- A file tree generation script. This scaffolds real folders and files in a `tmp` directory.
- A REST endpoint at `/api/file-tree` that returns a large, nested tree with file metadata.
- Very light UI so that you can focus on React, state, and data modelling.

The existing explorer renders the API data but has intentional shortcomings to diagnose and improve.

## Frontend Core Tasks

### 1. Stabilize the explorer
- The starter intentionally ships with **two** bugs that impact how the explorer renders and responds to user input. Identify and fix them.

### 2. Improve the explorer
- Support keyboard type-ahead so that typing a file or folder name focuses the closest match (Finder/VS Code style—e.g. typing `.giti` should select `.gitignore`).
- Make the resulting selection obvious (focus state, auto-scroll, etc.) without relying on a visible search field.
- Display the total number of files contained within the selected folder. This can be displayed anywhere you choose.

### BONUS
- Make the tree keyboard navigable using arrow keys.
- Model the API response with precise TypeScript types—replace the placeholder union in the starter with something safer.
- Include a written note about how you might make the layout resilient so that the explorer still feels responsive with large amounts of data (10,000+ nodes).

## Backend Task

### File watcher
- Implement a way to watch for file changes and deliver the updates to the frontend in real-time.
- Your solution and the complexity you choose is up to you. Please add comments about the decisions you made and why.

## Evaluation criteria

We are specifically looking for:
- Comfort with TypeScript, discriminated unions, and deriving types from data.
- Thoughtful React state management and a solid grasp of render lifecycles.
- Sensible component boundaries and data-flow architecture.
- Accessibility considerations for interactive controls.
- Code clarity, naming, and documentation of trade-offs.

> If you run out of time, include a short write-up in your README or submission email that explains what you prioritised, what you would do next, and why.

## Getting started

### Local development

```bash
npm install
npm run dev
# Visit http://localhost:3000
```

### Docker (optional)

```bash
docker compose up --build
# Visit http://localhost:3000
```

## Submission

Please send us either:
- A GitHub repository link, **or**
- A zip file containing the project.

Include any setup instructions that differ from the above, plus a short note about decisions, trade-offs, and future work.
