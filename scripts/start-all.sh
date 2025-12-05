#!/bin/bash
# A simple cross-platform script to run backend, frontend and ml-services concurrently
# Requires: concurrently installed globally or `npm run dev:all:concurrent` script

ROOT_DIR=$(dirname "$0")/..
cd $ROOT_DIR
echo "Starting backend, ml-services, and frontend in one window using concurrently"
npx concurrently "cd backend && npm run dev" "cd ml-services && python -m uvicorn app.main:app --reload --port 8000" "cd frontend && npm run dev"
