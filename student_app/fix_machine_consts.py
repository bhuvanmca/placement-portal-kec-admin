import sys
import re
from collections import defaultdict

file_lines = defaultdict(list)

try:
    with open("machine_errors.txt", "r") as f:
        for line in f:
            if "const_eval_method_invocation" in line or "const_with_non_constant_argument" in line or "const_initialized_with_non_constant_value" in line:
                parts = line.strip().split("|")
                if len(parts) >= 6:
                    path = parts[3]
                    line_num = int(parts[4])
                    file_lines[path].append(line_num - 1)
except Exception as e:
    print("Error reading machine_errors.txt:", e)
    sys.exit(1)

for path, lines in file_lines.items():
    try:
        with open(path, "r") as f:
            content = f.readlines()
        
        for l in sorted(list(set(lines)), reverse=True):
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
        print(f"Fixed const errors in {path}")
    except Exception as e:
        print(f"Error fixing {path}: {e}")
