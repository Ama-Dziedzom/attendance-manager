$content = Get-Content "d:\attendance-manager\lib\excelExport.ts" -Raw

# Fix JSX attribute syntax - remove spaces around = signs
$content = $content -replace 'className\s*=\s*"', 'className="'
$content = $content -replace 'onClick\s*=\s*\{', 'onClick={'
$content = $content -replace 'disabled\s*=\s*\{', 'disabled={'
$content = $content -replace 'variant\s*=\s*"', 'variant="'
$content = $content -replace '<\s+Button', '<Button'
$content = $content -replace '<\s+button', '<button'
$content = $content -replace '\s+>', '>'

Set-Content "d:\attendance-manager\lib\excelExport.ts" -Value $content -NoNewline

Write-Host "Fixed JSX syntax in excelExport.ts"
