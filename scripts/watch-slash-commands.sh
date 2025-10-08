#!/bin/bash
# Watch .slash/*.md files and validate on change

echo "👀 Watching .slash/*.md for changes..."
echo "Press Ctrl+C to stop"

# Use fswatch if available, otherwise fall back to polling
if command -v fswatch &> /dev/null; then
  fswatch -o .slash/*.md | while read; do
    echo ""
    echo "🔍 Change detected, validating..."
    python3 tools/slashc.py validate .slash/*.md
    if [ $? -eq 0 ]; then
      echo "✅ Validation passed"
    else
      echo "❌ Validation failed - fix errors before committing"
    fi
  done
else
  echo "⚠️  fswatch not found, install with: brew install fswatch"
  echo "Using basic polling instead..."

  while true; do
    if find .slash -name "*.md" -mtime -10s 2>/dev/null | grep -q .; then
      echo ""
      echo "🔍 Change detected, validating..."
      python3 tools/slashc.py validate .slash/*.md
      if [ $? -eq 0 ]; then
        echo "✅ Validation passed"
      else
        echo "❌ Validation failed - fix errors before committing"
      fi
    fi
    sleep 2
  done
fi
