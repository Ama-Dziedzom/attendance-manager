import re

# Read the file
with open(r'd:\attendance-manager\lib\excelExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix specific JSX syntax issues
# Fix: className= "..." -> className="..."
content = re.sub(r'className\s*=\s*"', 'className="', content)

# Fix: onClick={ ... } -> onClick={...} (but preserve spaces inside the braces)
content = re.sub(r'onClick\s*=\s*\{\s*', 'onClick={', content)

# Fix: disabled = { ... } -> disabled={...}
content = re.sub(r'disabled\s*=\s*\{\s*', 'disabled={', content)

# Fix: variant = "..." -> variant="..."
content = re.sub(r'variant\s*=\s*"', 'variant="', content)

# Fix: < Button -> <Button
content = re.sub(r'<\s+Button', '<Button', content)

# Fix: < button -> <button  
content = re.sub(r'<\s+button', '<button', content)

# Fix: " > -> ">
content = re.sub(r'"\s+>', '">', content)

# Write the file back
with open(r'd:\attendance-manager\lib\excelExport.ts', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

print("Fixed JSX syntax errors")
