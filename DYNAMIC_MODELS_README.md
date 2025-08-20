# Dynamic Model Loading

The Price Manager and Model Portfolios pages now automatically detect all CSV files in the `src/data/models/` directory.

## How it works

1. The JavaScript code loads the list of available models from `src/data/models/models.json`
2. This JSON file contains an array of all CSV filenames in the models directory
3. When you add or remove CSV files, you need to update the models.json file

## Adding new model files

1. Place your new CSV files in `src/data/models/`
2. Run the update script to regenerate models.json:
   ```bash
   python3 update-models.py
   ```
3. Your new models will automatically be available in the web app

## File naming

- CSV files can have any name with spaces, underscores, or hyphens
- They will be automatically detected regardless of the filename format
- Make sure your CSV files have the proper headers (Symbol, Name, Price, Weight/Allocation)

## Automatic detection

Both the Price Manager and Model Portfolios pages will now:
- Load all available CSV files automatically
- No need to edit JavaScript code when adding new models
- Provide better error messages for missing or corrupted files
- Show exactly how many models were loaded

## Fallback behavior

If `models.json` is missing or cannot be loaded, the system falls back to a default list of known model files to ensure the app continues working.
