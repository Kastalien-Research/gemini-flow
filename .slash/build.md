---
slash: build
image: node:20-alpine@sha256:2d5e8a8a51bc341fd5f2eed6d91455c3a3d147e91a14298fc564b5dc519c1666
env:
  TZ: Europe/Zurich
  NODE_ENV: production
inputs:
  - package.json
  - package-lock.json
  - src/**
  - tsconfig.json
outputs:
  - .out/build/dist
policies:
  network: install-only
  shell: "bash -euxo pipefail"
---
```bash name=install
corepack enable
npm ci --prefer-offline
```
```bash name=build
npm run build:cli
mkdir -p .out/build
cp -r dist .out/build/dist
cp package.json .out/build/
```
