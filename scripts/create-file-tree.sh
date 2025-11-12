#!/bin/sh
set -eu

if [ $# -lt 1 ]; then
  echo "Usage: $0 <output-directory>" >&2
  exit 1
fi

OUTPUT_DIR="$1"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

comment_for() {
  filename="$1"
  case "$filename" in
    *.ts|*.tsx|*.js|*.jsx|*.json)
      printf '// %s\n' "$filename"
      ;;
    *.css|*.scss|*.sass)
      printf '/* %s */\n' "$filename"
      ;;
    *.md|*.html|*.svg)
      printf '<!-- %s -->\n' "$filename"
      ;;
    *)
      printf '# %s\n' "$filename"
      ;;
  esac
}

create_file() {
  relative_path="$1"
  directory=$(dirname "$relative_path")

  if [ "$directory" != "." ]; then
    mkdir -p "$OUTPUT_DIR/$directory"
  fi

  filename=$(basename "$relative_path")

  comment_for "$filename" > "$OUTPUT_DIR/$relative_path"
}

create_empty_dir() {
  relative_path="$1"
  mkdir -p "$OUTPUT_DIR/$relative_path"
}

while IFS= read -r folder; do
  [ -n "$folder" ] || continue
  create_empty_dir "$folder"
done <<'EOF'
tmp/cache
tmp/artifacts
logs
EOF

while IFS= read -r file; do
  [ -n "$file" ] || continue
  create_file "$file"
done <<'EOF'
README.md
src/components/FileExplorer.tsx
src/components/Sidebar.tsx
src/hooks/useFiles.ts
src/state/store.ts
src/utils/format.ts
tests/file-explorer.spec.ts
config/.eslintrc.json
config/jest.config.ts
public/index.html
public/assets/logo.svg
scripts/setup.sh
docs/architecture.md
docs/decisions/0001-record.md
EOF

printf '%s\n' "$OUTPUT_DIR"
