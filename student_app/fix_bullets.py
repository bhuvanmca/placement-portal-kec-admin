import re
from collections import defaultdict

file_lines = defaultdict(list)

with open('machine_errors.txt', 'r') as f:
    for line in f:
        if "const_eval_method_invocation" in line or "const_with_non_constant_argument" in line:
            parts = line.split('•')
            if len(parts) >= 3:
                location_part = parts[2].strip()
                file_info = location_part.split(':')
                if len(file_info) >= 2:
                    filepath = "/Users/venessa/Projects/placement-portal-kec-admin/student_app/" + file_info[0]
                    line_num = int(file_info[1])
                    file_lines[filepath].append(line_num)

for fp, lines_num in file_lines.items():
    try:
        with open(fp, 'r') as f:
            content_lines = f.readlines()
        
        for ln in sorted(list(set(lines_num)), reverse=True):
            target_idx = ln - 1
            for i in range(target_idx, max(-1, target_idx - 15), -1):
                if re.search(r'\bconst\s+', content_lines[i]):
                    content_lines[i] = re.sub(r'\bconst\s+', '', content_lines[i], count=1)
                    break

        with open(fp, 'w') as f:
            f.writelines(content_lines)
        print(f"Fixed const errors in {fp}")
    except Exception as e:
        print(f"Error processing {fp}: {e}")
