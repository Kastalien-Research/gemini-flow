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

# Function to commit changes
auto_commit() {
    local changed_file="$1"
    git add -A
    git commit -m "Auto-commit: $(date '+%Y-%m-%d %H:%M:%S') - ${changed_file}" --no-verify
}

# Watch for any file changes and auto-commit
fswatch -0 --exclude '\.git' --exclude 'node_modules' --exclude 'dist' "$PROJECT_DIR" | while read -d "" file; do
    relative_path="${file#$PROJECT_DIR/}"
    echo "Change detected: $relative_path"
    auto_commit "$relative_path"
done
