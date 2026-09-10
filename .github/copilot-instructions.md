# Copilot instructions

Project context Copilot should apply to every session in this repository.

## Stack

- Framework: Astro (static output).
- Language: TypeScript.
- Styling: plain CSS in the base layout.

## Conventions

- Keep components small and focused.
- Prefer semantic HTML and accessible markup.
- Do not close, or add closing keywords for, the exercise walkthrough issue (issue #1) in any pull request. The exercise's GitHub Actions workflows manage that issue. When you open a pull request for app work, link only the specific app work-item issue you are implementing.

## Persistence and hydration rules

- Bookmarks are persisted in the browser via `localStorage`. There is no backend or server-side storage.
- Any code that touches `localStorage` (or other browser-only APIs) must run inside a component hydrated with `client:load`. Never call browser APIs in server-rendered/build-time code paths, since Astro's static build has no `window`/`localStorage`.
