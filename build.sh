#!/bin/bash
set -e

echo "🔨 Budowanie OrderFlow..."

# 1. Backend dependencies
echo "📦 Instalacja zależności backendu..."
cd backend
npm install --production=false
cd ..

# 2. Frontend build
echo "⚛️  Budowanie frontendu (React + Vite)..."
cd frontend
npm install
npm run build
cd ..

echo "✅ Build zakończony!"
echo ""
echo "Aby uruchomić w trybie produkcyjnym:"
echo "  cd backend"
echo "  NODE_ENV=production node server.js"
echo ""
echo "Aplikacja będzie dostępna na http://localhost:5000"
