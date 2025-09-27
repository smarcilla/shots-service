# shots-service

Starter para microservicio TypeScript con calidad en local y CI.

## Requisitos

- Node >= 20.10
- (Opcional) GitHub CLI `gh` para crear el repo desde terminal.

## Setup

```bash
npm ci || npm install
npm run prepare
npx husky add .husky/pre-commit "npx lint-staged"
git add .
git commit -m "chore: initial scaffold (ts, eslint, prettier, ci, tests)"
```
