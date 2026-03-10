#!/bin/bash
# Watches blog/ for new or changed .md and asset files, auto-commits and pushes.
# Usage: ./blog/watch-and-publish.sh

BLOG_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$BLOG_DIR")"

echo "Watching $BLOG_DIR for new blog posts and assets..."
echo "Press Ctrl+C to stop."

fswatch -0 --event Created --event Updated --event Renamed \
  --include '\.(md|svg|png|jpg|jpeg|gif|webp)$' --exclude '.*' \
  "$BLOG_DIR" "$BLOG_DIR/assets" | while read -d "" file; do

  filename="$(basename "$file")"
  relpath="${file#$REPO_DIR/}"

  # Only process numbered .md files or asset files
  if [[ "$file" == *"/assets/"* ]]; then
    echo ""
    echo "Detected asset: $filename"
  elif [[ "$filename" =~ ^[0-9].*\.md$ ]]; then
    echo ""
    echo "Detected post: $filename"
  else
    continue
  fi

  cd "$REPO_DIR"

  # Wait a moment for file writes to finish
  sleep 2

  # Stage all blog changes (post + any new assets it references)
  git add blog/[0-9]*.md blog/assets/ 2>/dev/null

  if git diff --cached --quiet; then
    echo "  No changes to commit."
    continue
  fi

  git commit -m "blog: add $filename"
  git push

  echo "  Pushed — GitHub Action will publish it live."
done
