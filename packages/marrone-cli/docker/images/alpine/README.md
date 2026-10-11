# Marrone CLI — Alpine

Alpine Linux variant of the Marrone CLI Docker image.

**Base image:** `node:22-alpine`

## Building

```bash
docker build -t marrone/cli:alpine ./images/alpine

# with specific Marrone CLI version
docker build \
  --build-arg MARRONE_VERSION=3.3.0 \
  -t marrone/cli:3.3.0-alpine \
  ./images/alpine
```

## Usage

```bash
# Run a collection
docker run -v $(pwd):/marrone marrone/cli:alpine run

# with pinned version
docker run -v $(pwd):/marrone marrone/cli:3.3.0-alpine run
```
