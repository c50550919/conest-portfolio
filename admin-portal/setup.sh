#!/bin/bash

# CoNest Admin Portal - Quick Setup Script
# This script sets up the admin portal for local development

set -e

echo "🚀 CoNest Admin Portal - Quick Setup"
echo "===================================="
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Setup environment file
echo "⚙️  Setting up environment..."
if [ ! -f .env.development ]; then
    cat > .env.development <<EOF
REACT_APP_API_URL=http://localhost:3001
EOF
    echo "✅ Created .env.development"
else
    echo "ℹ️  .env.development already exists"
fi
echo ""

# Check if backend is running
echo "🔍 Checking backend connection..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "⚠️  Backend is not running at http://localhost:3001"
    echo "   Please start the backend first:"
    echo "   cd ../backend && npm run dev"
fi
echo ""

# Done
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Ensure backend is running: cd ../backend && npm run dev"
echo "   2. Start admin portal: npm start"
echo "   3. Open browser: http://localhost:3000"
echo "   4. Login with admin email from backend ADMIN_EMAILS"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Feature guide and development"
echo "   - DEPLOYMENT.md - Production deployment guide"
echo ""
echo "🔐 Admin Access:"
echo "   Make sure your email is in backend/.env:"
echo "   ADMIN_EMAILS=admin@conest.com,yourname@conest.com"
echo ""
