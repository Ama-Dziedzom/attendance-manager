# Read file content
$content = Get-Content "d:\attendance-manager\lib\excelExport.ts" -Raw

# Fix trailing spaces before closing braces
$content = $content -replace '\s+\}', '}'

# Save with original line endings
$content | Set-Content "d:\attendance-manager\lib\excelExport.ts" -NoNewline

Write-Host "Removed trailing spaces before closing braces"
