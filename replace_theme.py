import os
import glob
import re

directories = ["screens", "widgets"]
base_dir = "/Users/venessa/Projects/placement-portal-kec-admin/student_app/lib/"

replacements = {
    "AppConstants.backgroundColor": "Theme.of(context).scaffoldBackgroundColor",
    "AppConstants.surfaceColor": "Theme.of(context).cardColor",
    "AppConstants.borderColor": "Theme.of(context).dividerColor",
    "AppConstants.textPrimary": "(Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black)",
    "AppConstants.textSecondary": "(Theme.of(context).textTheme.bodyMedium?.color ?? Colors.grey)",
    "AppConstants.primaryColor": "Theme.of(context).colorScheme.primary",
}

for d in directories:
    for filepath in glob.glob(f"{base_dir}{d}/**/*.dart", recursive=True):
        with open(filepath, 'r') as f:
            content = f.read()

        new_content = content
        for k, v in replacements.items():
            new_content = new_content.replace(k, v)
            
        if new_content != content:
            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
