#!/bin/bash
set -e

echo "🚀 Uruchamianie OrderFlow (produkcja)..."

# Sprawdź czy frontend jest zbudowany
if [ ! -d "frontend/dist" ]; then
  echo "❌ Brak zbudowanego frontendu!"
  echo "   Uruchom najpierw: ./build.sh"
  exit 1
fi

# Sprawdź czy .env istnieje
if [ ! -f "backend/.env" ]; then
  echo "⚠️  Brak pliku .env, kopiuję .env.example..."
  cp backend/.env.example backend/.env
  echo "   UWAGA: Zmień JWT_ACCESS_SECRET i JWT_REFRESH_SECRET przed wdrożeniem!"
fi

# Uruchom serwer
cd backend
NODE_ENV=production node server.js
