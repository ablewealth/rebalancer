#!/bin/bash

# Script to regenerate models.json with all CSV files in the models directory
# Run this whenever you add or remove CSV files from the models folder

cd "$(dirname "$0")"
MODELS_DIR="src/data/models"

if [ ! -d "$MODELS_DIR" ]; then
    echo "Error: Models directory not found at $MODELS_DIR"
    exit 1
fi

echo "Scanning for CSV files in $MODELS_DIR..."

# Find all CSV files and create JSON array
JSON_FILE="$MODELS_DIR/models.json"

echo "[" > "$JSON_FILE"

# Get list of CSV files
CSV_FILES=($(find "$MODELS_DIR" -name "*.csv" -type f -printf '%f\n' 2>/dev/null || find "$MODELS_DIR" -name "*.csv" -type f -exec basename {} \;))

# Add each file to JSON array
for i in "${!CSV_FILES[@]}"; do
    if [ $i -eq $((${#CSV_FILES[@]} - 1)) ]; then
        # Last item - no comma
        echo "  \"${CSV_FILES[$i]}\"" >> "$JSON_FILE"
    else
        # Not last item - add comma
        echo "  \"${CSV_FILES[$i]}\"," >> "$JSON_FILE"
    fi
done

echo "]" >> "$JSON_FILE"

echo "Generated $JSON_FILE with ${#CSV_FILES[@]} CSV files:"
cat "$JSON_FILE"

echo ""
echo "Models.json has been updated! Your web app will now automatically detect all CSV files."
