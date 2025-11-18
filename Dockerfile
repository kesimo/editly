FROM node:22-bookworm AS build

# Install dependencies for building canvas/gl
RUN apt-get update -y

RUN apt-get -y install \
    build-essential \
    libcairo2-dev \
    libgif-dev \
    libgl1-mesa-dev \
    libglew-dev \
    libglu1-mesa-dev \
    libjpeg-dev \
    libpango1.0-dev \
    librsvg2-dev \
    libxi-dev \
    pkg-config \
    python-is-python3

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm install --no-fund --no-audit

# Add app source
COPY . .

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --omit=dev

# Purge build dependencies
RUN apt-get --purge autoremove -y \
    build-essential \
    libcairo2-dev \
    libgif-dev \
    libgl1-mesa-dev \
    libglew-dev \
    libglu1-mesa-dev \
    libjpeg-dev \
    libpango1.0-dev \
    librsvg2-dev \
    libxi-dev \
    pkg-config \
    python-is-python3

# Remove Apt cache
RUN rm -rf /var/lib/apt/lists/* /var/cache/apt/*

# Final stage for app image
FROM node:22-bookworm

# Install runtime dependencies
RUN apt-get update -y \
  && apt-get -y install ffmpeg dumb-init xvfb libcairo2 libpango1.0 libgif7 librsvg2-2 \
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/*

WORKDIR /app
COPY --from=build /app /app

# Create directories for temp processing
RUN mkdir -p temp output

# Set permissions
RUN chmod -R 777 temp output

# Ensure `editly` binary available in container
RUN npm link

# Set Node.js memory limits (8GB)
ENV NODE_OPTIONS="--max-old-space-size=8192"

# Use dumb-init and xvfb for proper handling of headless rendering
# Increased screen size and memory for better canvas handling
ENTRYPOINT ["/usr/bin/dumb-init", "--", "xvfb-run", "--auto-servernum", "--server-args", "-screen 0 1024x768x24 -ac +extension GLX +render -noreset"]
CMD [ "editly" ]
