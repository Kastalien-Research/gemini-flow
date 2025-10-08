#!/usr/bin/env bash

# Git Cleanup Script - Remove files that should be gitignored
# This removes files from git tracking but keeps them on disk

set -e

echo "🧹 Git Cleanup - Removing improperly tracked files"
echo "=================================================="
echo ""

# Backup current state
BACKUP_BRANCH="backup-before-cleanup-$(date +%s)"
echo "📦 Creating backup branch: $BACKUP_BRANCH"
git branch "$BACKUP_BRANCH" 2>/dev/null || true

echo ""
echo "🔍 Finding files to remove from git..."
echo ""

# Files and patterns to remove from git
PATTERNS=(
    # MCP test/export directories
    ".mcpjam-*/"
    ".mcpjam-*"
    
    # Roo config
    ".roomodes"
    
    # Report and summary files (should be in docs/archive if needed)
    "*_REPORT.md"
    "*_SUMMARY.md"
    "*_COMPLETION*.md"
    "HIVE_MIND_HANDOFF_REPORT.md"
    
    # Claude files (except in docs/migration/legacy-archive)
    "CLAUDE.md"
    ".claude/"
    
    # Specs directory (planning docs)
    "specs/"
    
    # Database files
    "*.db"
    "*.db-wal"
    "*.db-shm"
    "*.sqlite"
    "*.sqlite3"
    
    # Logs
    "*.log"
    
    # Temp directories
    "*-test/"
    "temp-*/"
    "test-temp/"
    
    # Credentials
    "*.key"
    "*.pem"
    "*credentials*.json"
    "auth_token.json"
    
    # Coverage and reports
    "coverage/"
    "reports/temp/"
    
    # Hive mind data
    ".hive-mind/"
    ".swarm/"
    ".benchmarks/"
    ".roo/"
)

# Count files to be removed
TOTAL_FILES=0

echo "Files to be removed from git tracking:"
echo "--------------------------------------"

for pattern in "${PATTERNS[@]}"; do
    # Find files matching pattern
    FILES=$(git ls-files | grep -E "^${pattern//\*/.*}$|/${pattern//\*/.*}$|${pattern//\*/.*}" 2>/dev/null || true)
    
    if [ -n "$FILES" ]; then
        COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
        TOTAL_FILES=$((TOTAL_FILES + COUNT))
        echo "  $pattern: $COUNT files"
    fi
done

echo ""
echo "📊 Total files to remove: $TOTAL_FILES"
echo ""

if [ "$TOTAL_FILES" -eq 0 ]; then
    echo "✅ No files to remove. Repository is clean!"
    exit 0
fi

# Ask for confirmation
read -p "⚠️  Remove these $TOTAL_FILES files from git? (keeps files on disk) [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo ""
echo "🗑️  Removing files from git (keeping on disk)..."
echo ""

# Remove files from git but keep on disk
for pattern in "${PATTERNS[@]}"; do
    FILES=$(git ls-files | grep -E "^${pattern//\*/.*}$|/${pattern//\*/.*}$|${pattern//\*/.*}" 2>/dev/null || true)
    
    if [ -n "$FILES" ]; then
        echo "$FILES" | while IFS= read -r file; do
            if [ -n "$file" ]; then
                echo "  Removing: $file"
                git rm --cached "$file" 2>/dev/null || true
            fi
        done
    fi
done

echo ""
echo "📝 Committing changes..."
git add .gitignore
git commit -m "chore: remove improperly tracked files from git

- Remove .mcpjam-* test/export directories
- Remove *_REPORT.md and *_SUMMARY.md files
- Remove .roomodes config
- Remove CLAUDE.md (use WARP.md instead)
- Remove database files (*.db, *.sqlite)
- Remove temporary directories
- Remove credentials and keys
- Files remain on disk but are now gitignored

Backup branch: $BACKUP_BRANCH
"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 Summary:"
echo "  - Removed $TOTAL_FILES files from git tracking"
echo "  - Files still exist on disk"
echo "  - Backup branch created: $BACKUP_BRANCH"
echo ""
echo "💡 Next steps:"
echo "  1. Review changes: git status"
echo "  2. If satisfied: git push origin main"
echo "  3. If not: git reset --hard $BACKUP_BRANCH"
echo ""
echo "⚠️  Note: To remove from git history completely, use:"
echo "     git filter-repo or BFG Repo-Cleaner"
echo ""
