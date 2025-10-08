Yeah—that’s the disconnect.

Markdown is great for humans, terrible as an execution contract unless you strictly constrain it. If your slash commands are free-form .md, agents will sprinkle prose, half-code, and “suggestions” that your runner can misread. Result: drift and slop.

You don’t have to abandon Markdown—turn it into a declarative spec that compiles to a shell script, and make CI reject anything that isn’t valid.

Make Markdown executable by contract

1) Structure each command file

Require front-matter + code-fenced steps only. No free prose.

/.slash/build.md
```yaml
---
slash: build
image: ghcr.io/yourorg/ci-toolchain@sha256:...    # pinned digest
env:
  TZ: Europe/Zurich
  PYTHONHASHSEED: "0"
inputs:
  - "src/**"
  - "package.json"
  - "pnpm-lock.yaml"
outputs:
  - ".out/build/**"
policies:
  network: install-only         # or: "off" | "on"
  shell: "bash -euxo pipefail"
---
```yaml

```bash
# bash name=install
corepack enable
pnpm install --frozen-lockfile --prefer-offline

# bash name=build
pnpm run build
mkdir -p .out/build
[ -d dist ] && cp -r dist .out/build
```bash

## Rules:

	•	Only YAML front-matter + fenced ```bash blocks.
	•	No other text.
	•	Each block must have a unique name=.
	•	Everything else is a validation error.

2) Compile to a deterministic runner script

Add a tiny compiler (call it slashc) that:
	•	Parses front-matter; validates against a schema.
	•	Concatenates the bash blocks into /tmp/<slash>.sh with set -euxo pipefail.
	•	Executes inside the pinned container image with RO source / WO artifacts.
	•	Enforces policies (e.g., disable network after install step).

Your repo layout:

tools/
  slashc           # compiler+runner (bash or python)
  schemas/command.schema.json
.slash/
  build.md
  test.md

tools/slashc (behavior outline):
	•	Fail if:
	•	missing required keys (slash, image, inputs, outputs)
	•	any non-code Markdown present
	•	any code fence not bash
	•	Emit ./.out/logs/<slash>.log and exit non-zero on failure.

3) One command to run any slash

```bash
./tools/slashc run .slash/build.md
```bash

Under the hood (core mechanics you implement once):
	•	docker run --rm -v "$PWD:/src:ro" -v "$PWD/.out:/out" -w /src "$IMAGE" bash -lc '<compiled script>'
	•	After the “install” block, if policies.network == install-only, set iptables or env to block network (or just npm/pip --offline where possible).
	•	Verify declared outputs exist; otherwise fail (no silent “built somewhere else”).

4) CI enforces the contract

.github/workflows/ci.yml (thin):

```yaml
name: CI
on: [pull_request, push]
permissions: { contents: read }
defaults: { run: { shell: bash -euxo pipefail } }
env: { TZ: Europe/Zurich, PYTHONHASHSEED: "0" }

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate slash markdown
        run: |
          ./tools/slashc validate .slash/*.md
          # Reject if any markdown contains prose outside front-matter/code fences
  build:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run /build
        run: ./tools/slashc run .slash/build.md
      - uses: actions/upload-artifact@v4
        with: { name: build, path: .out/build }
  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run /test
        run: ./tools/slashc run .slash/test.md
      - uses: actions/upload-artifact@v4
        with: { name: coverage, path: .out/coverage }
```yaml

5) Guardrails (stop agent “creative writing”)
	•	CODEOWNERS for tools/ and .slash/ (agent can’t edit compiler or schema).
	•	PR policy: fail if any .slash/*.md contains:
	•	text lines outside front-matter and ```bash fences
	•	unpinned images or actions
	•	forbidden commands (curl | sh, sudo, editing .github/**)
	•	Lockfile-only installs (npm ci, pnpm --frozen-lockfile, pip --no-deps).

6) Why this fixes your issue
	•	Markdown stays your UX, but it’s no longer free-form.
	•	Every slash command becomes a machine-verifiable plan → compiled to a pure, idempotent script → executed in a clean room.
	•	Agents can propose Markdown, but CI rejects anything off-spec before it ever runs.