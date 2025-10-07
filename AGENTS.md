# Repository Guidelines

## Environment & Tooling

Target Node.js 20.10+ to match the engine constraint; use `npm ci` for reproducible installs. Run `npm run prepare` once to enable Husky pre-commit hooks that trigger lint-staged checks. Logs are emitted through the `src/lib/logging` facade, which wraps `pino`; prefer the provided helpers over direct console output.

## Project Structure & Module Organization

`src/index.ts` boots the service and wires dependencies. Shared utilities live under `src/lib`, with logging adapters in `src/lib/logging`. Simulation flows reside in `src/sim`, while domain types sit in `src/types`. Built artifacts are emitted to `dist/`; sample payloads for local runs are kept in `data/`. Tests live together in `test/` using the `.test.ts` suffix.

## Build, Test, and Development Commands

- `npm run dev`: watch-mode start of `src/index.ts` via tsx.
- `npm run dev:sim`: runs the simulator against `data/atletico-vs-madrid.json` with a stable seed.
- `npm run typecheck`: strict TypeScript checks without emitting JS.
- `npm run build`: produce production-ready JS into `dist/`.
- `npm run lint` / `npm run lint:fix`: enforce ESLint rules and sort imports.
- `npm run format` / `npm run format:fix`: validate or apply Prettier formatting.
- `npm test`: execute the Vitest suite once; append `-- --watch` when iterating locally.

## Coding Style & Naming Conventions

Prettier enforces 2-space indentation, 100-character lines, double quotes, and trailing commas. TypeScript files are module-scoped (`"type": "module"`). Prefer `camelCase` for functions and variables, `PascalCase` for types and classes, and suffix helpers with their intent (`LoggerAdapter`, `SimulatorConfig`). Import order is governed by `eslint-plugin-simple-import-sort`; run the lint fixes if CI flags ordering issues. Avoid `console.log`; rely on the logger facade for structured output.

## Testing Guidelines

Tests use Vitest and live in `test/*.test.ts`. Mirror production filenames where possible (e.g., `simulator.test.ts` covers `src/sim`). Aim to cover logging edge cases with spies and deterministic seeds. When writing new tests, use `describe` blocks for feature areas and prefix asynchronous specs with `async` to satisfy the `no-misused-promises` rule. Always run `npm test` and `npm run typecheck` before opening a PR.

## Commit & Pull Request Guidelines

Follow the existing Conventional Commit style: `<type>(<scope>): summary` with imperative phrasing (e.g., `feat(logging): add file adapter`). Reference any GitHub issues in the body. Pull requests should outline motivation, summarize changes, list test commands executed, and attach simulator output or screenshots when behavior changes. Ensure lint, format, build, and tests pass in CI; note any deviations explicitly in the PR description.

## Pre-push Checklist

Run `npm run format` and `npm run lint` locally before pushing any branch to guarantee code style and lint rules are satisfied.
