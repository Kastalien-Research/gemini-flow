#!/bin/bash
# Auto-commit file watcher - commits every file change automatically
# This prevents work from being lost due to uncommitted deletions

PROJECT_DIR="${1:-$(pwd)}"
cd "$PROJECT_DIR" || exit 1

echo "Starting auto-commit watcher for: $PROJECT_DIR"
echo "Every file change will be automatically committed"

# Install fswatch if not present
if ! command -v fswatch &> /dev/null; then
    echo "Installing fswatch..."
    brew install fswatch
fi

# Function to commit changes with validation
auto_commit() {
    local changed_file="$1"

    # Stage changes
    git add -A

    # If .slash/ files changed, validate BEFORE committing
    if echo "$changed_file" | grep -q "^\.slash/"; then
        echo "🔍 Validating slash command: $changed_file"

        if ! python3 tools/slashc.py validate .slash/*.md; then
            echo "❌ Validation failed - commit blocked"
            git reset HEAD  # Unstage
            return 1
        fi

        echo "✅ Validation passed"
    fi

    # Commit with hooks enabled (removed --no-verify)
    git commit -m "Auto-commit: $(date '+%Y-%m-%d %H:%M:%S') - ${changed_file}"
}

# Watch for any file changes and auto-commit
fswatch -0 --exclude '\.git' --exclude 'node_modules' --exclude 'dist' "$PROJECT_DIR" | while read -d "" file; do
    relative_path="${file#$PROJECT_DIR/}"
    echo "Change detected: $relative_path"
    auto_commit "$relative_path"
done
