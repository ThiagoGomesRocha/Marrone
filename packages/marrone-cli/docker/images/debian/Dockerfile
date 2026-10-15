FROM node:22-slim

LABEL maintainer="Marrone <support@marrone.com>"

ARG MARRONE_VERSION
ENV MARRONE_VERSION=${MARRONE_VERSION}

LABEL org.opencontainers.image.source="https://github.com/ThiagoGomesRocha/Marrone"
LABEL org.opencontainers.image.description="Marrone CLI - Open source IDE for exploring and testing APIs"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="Marrone CLI"
LABEL org.opencontainers.image.version="${MARRONE_VERSION}"
LABEL org.opencontainers.image.url="https://github.com/ThiagoGomesRocha/Marrone"
LABEL org.opencontainers.image.documentation="https://github.com/ThiagoGomesRocha/Marrone/wiki"

ENV LC_ALL="en_US.UTF-8" \
    LANG="en_US.UTF-8" \
    LANGUAGE="en_US.UTF-8"

# If MARRONE_VERSION is provided, validate it is a valid semver before installing
RUN if [ -n "$MARRONE_VERSION" ]; then \
        if ! echo "$MARRONE_VERSION" | grep -qE "^[0-9]+\.[0-9]+\.[0-9]+$"; then \
            echo "\033[0;31mA valid semver Marrone version is required in the MARRONE_VERSION build-arg (e.g. 1.16.0)\033[0m"; \
            exit 1; \
        fi; \
    fi && \
    npm install -g @marrone/cli${MARRONE_VERSION:+@${MARRONE_VERSION}}

WORKDIR /marrone

USER node

ENTRYPOINT ["marrone"]
CMD []
