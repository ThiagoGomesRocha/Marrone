# Marrone CLI — Debian

Debian slim variant of the Marrone CLI Docker image.

**Base image:** `node:22-slim`

## Building

```bash
docker build -t marrone/cli:debian ./images/debian

# with specific Marrone CLI version
docker build \
  --build-arg MARRONE_VERSION=3.3.0 \
  -t marrone/cli:3.3.0-debian \
  ./images/debian
```

## Usage

```bash
# Run a collection
docker run -v $(pwd):/marrone marrone/cli:debian run 

# with pinned version
docker run -v $(pwd):/marrone marrone/cli:3.3.0-debian run 
```
