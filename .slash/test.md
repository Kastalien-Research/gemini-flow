---
slash: test
image: node:20-alpine@sha256:2d5e8a8a51bc341fd5f2eed6d91455c3a3d147e91a14298fc564b5dc519c1666
env:
  TZ: Europe/Zurich
  NODE_ENV: test
inputs:
  - package.json
  - package-lock.json
  - src/**
  - tests/**
  - vitest.config.ts
outputs:
  - .out/coverage
policies:
  network: install-only
  shell: "bash -euxo pipefail"
---
```bash name=install
corepack enable
npm ci --prefer-offline
```
```bash name=test
npm run test:coverage
mkdir -p .out/coverage
cp -r coverage .out/coverage/
```
