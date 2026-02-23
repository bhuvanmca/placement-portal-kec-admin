import json
import re

with open("errors.json", "r") as f:
    problems = json.load(f)

file_lines = {}
for p in problems:
    if "Methods can't be invoked in constant expressions" in p["message"] or "Unused import: " in p["message"]:
        path = p["path"]
        if path not in file_lines:
            file_lines[path] = []
        file_lines[path].append(p["startLine"] - 1)

for path, lines in file_lines.items():
    with open(path, "r") as f:
        content = f.readlines()
    
    # Sort descending to avoid line shifts
    for l in sorted(list(set(lines)), reverse=True):
        if "Unused import: " in content[l] or "import '" in content[l]:
             content[l] = "" # Just wipe the unused import
             continue
             
        # Find const and remove it
        if "const " in content[l]:
            content[l] = re.sub(r'\bconst\s+', '', content[l], count=1)
        else:
            for offset in range(1, 15):
                prev_line = l - offset
                if prev_line >= 0 and "const " in content[prev_line]:
                    content[prev_line] = re.sub(r'\bconst\s+', '', content[prev_line], count=1)
                    break
                    
    with open(path, "w") as f:
        f.writelines(content)
    print(f"Fixed {path}")
