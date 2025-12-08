# Read file content
$content = Get-Content "d:\attendance-manager\lib\excelExport.ts" -Raw

# Fix JSX syntax - be very precise
$content = $content -replace 'className\s*=\s*"', 'className="'
$content = $content -replace 'onClick\s*=\s*\{\s*', 'onClick={'
$content = $content -replace 'disabled\s*=\s*\{\s*', 'disabled={'  
$content = $content -replace 'variant\s*=\s*"', 'variant="'
$content = $content -replace '<\s+Button', '<Button'
$content = $content -replace '<\s+button', '<button'
$content = $content -replace '"\s+>', '">'

# Save with original line endings
$content | Set-Content "d:\attendance-manager\lib\excelExport.ts" -NoNewline

Write-Host "JSX syntax fixed successfully"
