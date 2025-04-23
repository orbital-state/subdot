#!/bin/bash

set -e

# Output directory for dumps
DUMP_DIR="dump"
# Name of the archive
ARCHIVE_NAME="subdot_project_files.tar.gz"

# Define file extensions to archive
EXTENSIONS=("ts" "json" "toml" "md")

# Clean previous dumps
clean_dump() {
    echo "Cleaning previous dumps..."
    rm -rf "$DUMP_DIR"
}

# Create dump directory
create_dump_dir() {
    echo "Creating dump directory..."
    mkdir -p "$DUMP_DIR"
}

# Archive files with specified extensions
archive_files() {
    echo "Archiving files with extensions: ${EXTENSIONS[*]}..."
    # Build the find name criteria
    criteria=""
    for ext in "${EXTENSIONS[@]}"; do
        if [ -z "$criteria" ]; then
            criteria="-name '*.$ext'"
        else
            criteria="$criteria -o -name '*.$ext'"
        fi
    done

    # Ignore node_modules and .git directories and archive files that match criteria
    # echo "test criteria: $criteria"
    # find . -type d \( -name "node_modules" -o -name ".git" \) -prune -o \
    #      -type f \( $criteria \) -print0 | od -c
    # find . -type d \( -name "node_modules" -o -name ".git" \) -prune -o \
    #      -type f \( $criteria \) -print0 | \
    #      tar --null --files-from=- -czf "$DUMP_DIR/$ARCHIVE_NAME" --transform='s,^\.,subdot,'
    find . -type d \( -name "node_modules" -o -name ".git" \) -prune -o \
        -type f \( -name '*.ts' -o -name '*.json' -o -name '*.toml' -o -name '*.md' \) -print0 | \
        tar --null --files-from=- -czvf "$DUMP_DIR/$ARCHIVE_NAME" --transform='s,^\.,subdot,'
    echo "Archive created at $DUMP_DIR/$ARCHIVE_NAME"
}

# Main script
main() {
    clean_dump
    create_dump_dir
    archive_files
}

main