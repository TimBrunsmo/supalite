#!/bin/bash

# Test script for create-supalite in Docker
# This simulates a fresh Linux environment

set -e

echo "🚀 supalite Docker Test Environment"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "packages/create-supalite/package.json" ]; then
    echo "❌ Error: Run this script from the repository root"
    exit 1
fi

# Step 1: Build the package
echo "📦 Step 1: Building the package..."
cd packages/create-supalite
pnpm build
cd ../..

# Step 2: Create tarball
echo "📦 Step 2: Creating tarball..."
cd packages/create-supalite
npm pack
TARBALL=$(ls create-supalite-*.tgz | head -n 1)
echo "✅ Created: $TARBALL"
cd ../..

# Step 3: Build Docker image
echo "🐳 Step 3: Building Docker test environment..."
docker build -f Dockerfile.test -t supalite-test .

# Step 4: Run tests
echo ""
echo "🧪 Step 4: Starting test environment..."
echo ""
echo "===================================="
echo "You are now in a fresh Ubuntu container!"
echo "===================================="
echo ""
echo "📦 The package tarball is mounted at: /test-package/$TARBALL"
echo ""
echo "To test the CLI, run:"
echo "  npx /test-package/$TARBALL test-app"
echo ""
echo "Or for manual testing:"
echo "  npm install -g /test-package/$TARBALL"
echo "  create-supalite test-app"
echo ""
echo "Environment info:"
echo "  OS: $(docker run --rm supalite-test cat /etc/os-release | grep PRETTY_NAME)"
echo "  Node: $(docker run --rm supalite-test node --version)"
echo "  npm: $(docker run --rm supalite-test npm --version)"
echo "  Supabase CLI: Not installed (fresh environment)"
if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "  Supabase Token: Provided (automatic setup will work)"
else
    echo "  Supabase Token: Not provided (use manual setup)"
    echo ""
    echo "💡 Tip: Set SUPABASE_ACCESS_TOKEN to test automatic setup:"
    echo "   export SUPABASE_ACCESS_TOKEN=sbp_xxx..."
    echo "   ./test-docker.sh"
fi
echo ""
echo "Press Ctrl+D or type 'exit' to leave the container"
echo "===================================="
echo ""

# Build docker run command with optional access token
DOCKER_CMD="docker run -it --rm \
    -v \"$(pwd)/packages/create-supalite:/test-package:ro\" \
    -w /home/testuser"

# Add access token if provided
if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    DOCKER_CMD="$DOCKER_CMD -e SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN"
fi

DOCKER_CMD="$DOCKER_CMD supalite-test"

# Run Docker container
eval $DOCKER_CMD

echo ""
echo "✅ Test environment exited"
