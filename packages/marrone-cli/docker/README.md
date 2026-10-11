# Marrone CLI Docker Images

Official Docker images for [Marrone CLI](https://www.marrone.com), enabling container-native API collection runs in CI/CD pipelines and local environments without requiring Node.js or npm on the host. See the [Marrone CLI docs](https://docs.marrone.com/bru-cli/overview) for CLI usage.

## Registries

```bash
docker pull marrone/cli:latest
docker pull ghcr.io/marrone/cli:latest
```

---

## Variants

| Variant | Base image | Details |
|---------|-----------|---------|
| **Alpine** (default) | `node:22-alpine` | [→ Alpine README](https://github.com/marrone/marrone/blob/main/packages/marrone-cli/docker/images/alpine/README.md) |
| **Debian** | `node:22-slim` | [→ Debian README](https://github.com/marrone/marrone/blob/main/packages/marrone-cli/docker/images/debian/README.md) |

### Quick choice

- **Use Alpine** unless you have a specific reason not to (90% of users)
- **Use Debian** if you hit SSL/glibc compatibility issues

---

## Tags

Every release publishes the following tags to **both** Docker Hub (`marrone/cli`) and GHCR (`ghcr.io/marrone/cli`).

### Alpine variant (default)

| Tag pattern | Example | Notes |
|-------------|---------|-------|
| `latest` | `marrone/cli:latest` | Newest release marked as latest. Only moves when the publish workflow is run with "Tag this version as latest" checked. |
| `latest-alpine` | `marrone/cli:latest-alpine` | Alias of `latest` — also alpine. |
| `alpine` | `marrone/cli:alpine` | Newest alpine, moves on every alpine publish. |
| `<version>` | `marrone/cli:3.3.0` | Exact version, immutable. |
| `<version>-alpine` | `marrone/cli:3.3.0-alpine` | Exact version, explicitly alpine. |
| `<major.minor>` | `marrone/cli:3.3` | Floats with patch releases (3.3.x). |
| `<major.minor>-alpine` | `marrone/cli:3.3-alpine` | Same, explicitly alpine. |
| `<major>` | `marrone/cli:3` | Floats with any 3.x.x release. |
| `<major>-alpine` | `marrone/cli:3-alpine` | Same, explicitly alpine. |

### Debian variant

| Tag pattern | Example | Notes |
|-------------|---------|-------|
| `latest-debian` | `marrone/cli:latest-debian` | Newest debian release marked as latest (gated by the same checkbox). |
| `debian` | `marrone/cli:debian` | Newest debian, moves on every debian publish. |
| `<version>-debian` | `marrone/cli:3.3.0-debian` | Exact version, debian. |
| `<major.minor>-debian` | `marrone/cli:3.3-debian` | Floats with debian patch releases. |
| `<major>-debian` | `marrone/cli:3-debian` | Floats with any 3.x.x debian release. |

The unsuffixed tags (`:latest`, `:3.3.0`, `:3.3`, `:3`, `:alpine`) always resolve to the alpine variant by convention.

---

## Step-by-step guide

### Step 1 — Pull the image

```bash
# latest (alpine by default — smallest, fastest to pull)
docker pull marrone/cli:latest

# specific version (recommended for production CI)
docker pull marrone/cli:3.3.0

# major.minor — gets patch updates automatically
docker pull marrone/cli:3.3

# debian variant
docker pull marrone/cli:debian
docker pull marrone/cli:3.3.0-debian
```

---

#### Check it works

```bash
docker run --rm marrone/cli --version
```

---

### Step 2 — Run your collection

> These examples assume you are running `docker` from your Marrone collection directory. Mount that directory to `/marrone` and pass `bru` arguments directly after the image name. If your collection lives elsewhere on disk, see the path-based examples further down.

> **Cross-platform note:** the examples below use `$(pwd)` which works in Bash / Zsh / Git Bash / WSL. On Windows native shells, substitute `$(pwd)` with `${PWD}` (PowerShell) or `%cd%` (CMD).

> **Adding `bru` options:** The examples below show docker-specific flags. For all `marrone run` options — recurse (`-r`), environments, variables, reporters, bail, and more — see the [Marrone CLI docs](https://docs.marrone.com/bru-cli/overview).

```bash
# run every request in the Marrone collection (current dir)
docker run -v $(pwd):/marrone marrone/cli run 

# run a specific subfolder (group of requests) within that collection
docker run -v $(pwd):/marrone marrone/cli run ./api-tests

# run a single .bru request file from that collection
docker run -v $(pwd):/marrone marrone/cli run ./api-tests/login.bru

# write a JUnit XML report (lands in the current directory because of the bind mount)
docker run -v $(pwd):/marrone marrone/cli run --reporter-junit results.xml
```

For Windows CMD users, swap `$(pwd)` with `%cd%`:

```cmd
docker run -v %cd%:/marrone marrone/cli run 
```

#### Running a collection that lives at a different path

If your collection is not in your current directory, point `docker` at its path (relative or absolute) instead of `$(pwd)`:

```bash
# run every request in a collection at an arbitrary path
docker run -v /path/to/your/collection:/marrone marrone/cli run

# run a single .bru file from a collection at an arbitrary path
docker run -v /path/to/your/collection:/marrone marrone/cli run ./auth/login.bru
```

> **Note on `--rm`:** Examples below include `--rm`. Docker keeps stopped containers around after they exit, which lets you `docker logs` or `docker inspect` them later for debugging. If you'd rather have Docker auto-delete the container as soon as `bru` finishes — useful for CI runs or to avoid `docker ps -a` filling up with stale entries — append `--rm` to any `docker run` (or `docker compose run`) command:

```bash
docker run --rm -v $(pwd):/marrone marrone/cli run
```

> It's purely a cleanup convenience; it doesn't affect the image, mounts, stdout output, or exit code.


## CI/CD integration

### GitHub Actions

```yaml
jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Marrone collection
        run: |
          docker run --rm \
            -v ${{ github.workspace }}:/marrone \
            marrone/cli:latest run --output results.xml --format junit

      - name: Publish Test Report
        uses: dorny/test-reporter@v3
        if: success() || failure()
        with:
          name: Marrone Test Results
          path: ${{github.workspace}}/results.xml
          reporter: java-junit
```

### GitLab CI

```yaml
api-tests:
  image: marrone/cli:latest
  script:
    - marrone run --output results.xml --format junit
  artifacts:
    reports:
      junit: results.xml
```

---

## Docker Compose

### Quick example

A minimal `docker-compose.yml` for running a Marrone collection alongside your project:

```yaml
services:
  marrone-cli:
    image: marrone/cli:latest
    container_name: marrone-cli-runner
    volumes:
      - /path/to/collection:/marrone
      - /path/to/reports:/reports
    command:
      run .
      -r
      --env ci
      --reporter-json /reports/results.json
      --reporter-junit /reports/results.xml
      --reporter-html /reports/results.html
```

Then run:

```bash
docker compose run marrone-cli
```

The `/path/to/reports:/reports` mount catches the JSON, JUnit XML, and HTML reports on the host — drop any `--reporter-*` flag to skip that format.

### Try it from this repo

A ready-to-run `docker-compose.yml` lives in this repo at [`packages/marrone-tests/docker-compose.yml`](https://github.com/marrone/marrone/blob/main/packages/marrone-tests/docker-compose.yml). It mounts the sibling `collection/` directory into the container, runs the `echo` folder against the `Prod` environment, and writes JSON, JUnit XML, and HTML reports into `packages/marrone-tests/reports/`:

```bash
cd packages/marrone-tests
docker compose run marrone-cli
```

This fires a small set of requests against public endpoints that demonstrate the CLI executing requests and assertions inside a container.

### Standalone demo

For a clone-and-run demo with a curated collection, see [`bruno-collections/marrone-cli-docker`](https://github.com/bruno-collections/marrone-cli-docker).

---

## Image details

All variants include:

- **Entrypoint:** `bru`
- **Working directory:** `/marrone`
- **User:** `node` (UID 1000, non-root)
- **Architectures:** `linux/amd64`, `linux/arm64`

