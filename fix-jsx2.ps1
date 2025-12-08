$content = Get-Content "d:\attendance-manager\lib\excelExport.ts" -Raw

# Fix remaining JSX issues - remove spaces inside curly braces for attributes
$content = $content -replace 'onClick=\{\s+', 'onClick={'
$content = $content -replace '\s+\}', '}'
$content = $content -replace 'disabled=\{\s+', 'disabled={'

Set-Content "d:\attendance-manager\lib\excelExport.ts" -Value $content -NoNewline

Write-Host "Applied final JSX fixes"
