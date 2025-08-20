#!/usr/bin/env python3

import os
import json
import glob

def update_models_json():
    """Generate models.json with all CSV files in the models directory"""
    
    # Get the script directory and models path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(script_dir, "src", "data", "models")
    
    if not os.path.exists(models_dir):
        print(f"Error: Models directory not found at {models_dir}")
        return False
    
    print(f"Scanning for CSV files in {models_dir}...")
    
    # Find all CSV files
    csv_pattern = os.path.join(models_dir, "*.csv")
    csv_files = []
    
    for filepath in glob.glob(csv_pattern):
        filename = os.path.basename(filepath)
        if filename != "models.json":  # Don't include the JSON file itself
            csv_files.append(filename)
    
    # Sort the files
    csv_files.sort()
    
    # Create the JSON file
    json_file = os.path.join(models_dir, "models.json")
    
    with open(json_file, 'w') as f:
        json.dump(csv_files, f, indent=2)
    
    print(f"Generated {json_file} with {len(csv_files)} CSV files:")
    for filename in csv_files:
        print(f"  - {filename}")
    
    print("\nModels.json has been updated! Your web app will now automatically detect all CSV files.")
    return True

if __name__ == "__main__":
    update_models_json()
