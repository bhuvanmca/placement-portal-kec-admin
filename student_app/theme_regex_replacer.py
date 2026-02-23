import os
import glob
import re

directories = ["screens", "widgets"]
base_dir = "/Users/venessa/Projects/placement-portal-kec-admin/student_app/lib/"

for d in directories:
    for filepath in glob.glob(f"{base_dir}{d}/**/*.dart", recursive=True):
        if "app_button.dart" in filepath or "theme_provider.dart" in filepath:
            continue
            
        with open(filepath, 'r') as f:
            content = f.read()

        new_content = content
        
        # 1. TextStyle Colors.white -> Inverse
        # We find TextStyle(..., color: Colors.white, ...)
        def textstyle_replacer(match):
            return match.group(0).replace("Colors.white", "(Theme.of(context).brightness == Brightness.dark ? Colors.black : Colors.white)")
            
        new_content = re.sub(r'TextStyle\s*\([^)]*color:\s*Colors\.white\b', textstyle_replacer, new_content)
        
        # 2. Background Colors.white -> ScaffoldBackground
        new_content = re.sub(r'backgroundColor:\s*Colors\.white\b', r'backgroundColor: Theme.of(context).scaffoldBackgroundColor', new_content)
        
        # 3. Remaining Colors.white -> CardColor
        new_content = re.sub(r'color:\s*Colors\.white\b', r'color: Theme.of(context).cardColor', new_content)
        new_content = re.sub(r'fillColor:\s*Colors\.white\b', r'fillColor: Theme.of(context).cardColor', new_content)
        
        # 4. backgroundColor FAFAFA
        new_content = re.sub(r'backgroundColor:\s*const\s*Color\(\s*0xFFFAFAFA\s*\)', r'backgroundColor: Theme.of(context).scaffoldBackgroundColor', new_content)
        new_content = re.sub(r'backgroundColor:\s*Color\(\s*0xFFFAFAFA\s*\)', r'backgroundColor: Theme.of(context).scaffoldBackgroundColor', new_content)
        
        # 5. Black variations -> TextTheme Lookups
        new_content = re.sub(r'color:\s*Colors\.black87\b', r'color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black87)', new_content)
        new_content = re.sub(r'color:\s*Colors\.black54\b', r'color: (Theme.of(context).textTheme.bodySmall?.color ?? Colors.black54)', new_content)
        
        # 6. Grey manipulations
        new_content = re.sub(r'color:\s*Colors\.grey\[200\]', r'color: (Theme.of(context).brightness == Brightness.dark ? Colors.grey[800] : Colors.grey[200])', new_content)
        new_content = re.sub(r'color:\s*Colors\.grey\.shade200', r'color: (Theme.of(context).brightness == Brightness.dark ? Colors.grey.shade800 : Colors.grey.shade200)', new_content)

        if new_content != content:
            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
