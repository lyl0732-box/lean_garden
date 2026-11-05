# syntax=docker/dockerfile:1
FROM ubuntu:24.04 AS build
ARG NODE_VERSION=22.22.3
ARG LEAN_VERSION=4.34.0
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl git zstd xz-utils build-essential libgmp-dev && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /opt/node /opt/lean && \
    curl --fail --location --retry 4 https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz -o /tmp/node.tar.xz && \
    curl --fail --location --retry 4 https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt -o /tmp/node-checksums && \
    grep " node-v${NODE_VERSION}-linux-x64.tar.xz$" /tmp/node-checksums | sed 's@node-v.*-linux-x64.tar.xz@/tmp/node.tar.xz@' | sha256sum --check && \
    tar -xJf /tmp/node.tar.xz -C /opt/node --strip-components=1 && \
    curl --fail --location --retry 4 https://github.com/leanprover/lean4/releases/download/v${LEAN_VERSION}/lean-${LEAN_VERSION}-linux.tar.zst -o /tmp/lean.tar.zst && \
    tar --zstd -xf /tmp/lean.tar.zst -C /opt/lean --strip-components=1
ENV PATH="/opt/node/bin:/opt/lean/bin:${PATH}" MATHLIB_NO_CACHE_ON_UPDATE=1
WORKDIR /opt/garden
COPY lean/lakefile.toml lean/lake-manifest.json lean/lean-toolchain ./lean/
WORKDIR /opt/garden/lean
RUN --mount=type=cache,target=/root/.cache/mathlib lake exe cache get \
    Mathlib.Tactic Mathlib.Analysis.Calculus.MeanValue Mathlib.Analysis.SpecialFunctions.Integrals.Basic \
    Mathlib.Analysis.Calculus.Deriv.Pow Mathlib.Data.Int.ModEq Mathlib.Data.Int.GCD
WORKDIR /opt/garden
COPY . .
RUN cd lean && lake build Garden
RUN node scripts/verify-all.mjs
RUN cd lean && lake env node -e 'require("fs").writeFileSync("../deploy/lean-env.json",JSON.stringify({LEAN_PATH:process.env.LEAN_PATH,LEAN_SYSROOT:process.env.LEAN_SYSROOT}))'
RUN node deploy/prune-runtime.mjs /runtime

FROM ubuntu:24.04 AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libgmp10 libatomic1 libstdc++6 libgcc-s1 libzstd1 && rm -rf /var/lib/apt/lists/* && useradd -u 10001 -m garden
COPY --from=build /runtime/ /
WORKDIR /opt/garden
ENV PATH="/opt/node/bin:/opt/lean/bin:${PATH}" HOST=0.0.0.0 PORT=3210 GARDEN_LEAN_ENV=/opt/garden/deploy/lean-env.json GARDEN_DATA_DIR=/opt/garden/data NODE_ENV=production
RUN mkdir -p lean/.scratch data && chown -R garden:garden lean/.scratch data
# Verify the reduced runtime, not just the larger builder.
RUN node deploy/runtime-smoke.mjs
USER garden
EXPOSE 3210
HEALTHCHECK --start-period=90s --timeout=15s --interval=30s CMD ["/opt/node/bin/node","-e","fetch('http://127.0.0.1:3210/api/health').then(r=>r.json()).then(h=>process.exit(h.ready?0:1)).catch(()=>process.exit(1))"]
CMD ["/opt/node/bin/node","server/index.mjs"]
