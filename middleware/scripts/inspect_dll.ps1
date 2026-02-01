
# Inspect libzkfpcsharp.dll contents
$dllPath = "C:\Windows\System32\libzkfpcsharp.dll"
try {
    [Reflection.Assembly]::LoadFile($dllPath) | Out-Null
}
catch {
    Write-Output "ERROR: Could not load DLL"
    exit 1
}

Write-Output "--- Types in Assembly ---"
$assembly = [AppDomain]::CurrentDomain.GetAssemblies() | Where-Object { $_.Location -eq $dllPath }
$assembly.GetTypes() | ForEach-Object {
    Write-Output "Type: $($_.FullName)"
    Write-Output "  Static Methods:"
    $_.GetMethods([System.Reflection.BindingFlags]"Public,Static") | ForEach-Object {
        $params = $_.GetParameters() | ForEach-Object { "$($_.ParameterType.Name) $($_.Name)" }
        $paramStr = $params -join ", "
        Write-Output "    $($_.Name)($paramStr)"
    }
}
