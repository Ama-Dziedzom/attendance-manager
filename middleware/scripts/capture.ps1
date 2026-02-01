
# ZKTeco SLK20R Capture Script
# Uses libzkfpcsharp.dll to capture a fingerprint template

$dllPath = "C:\Windows\System32\libzkfpcsharp.dll"

try {
    # Load the assembly
    [Reflection.Assembly]::LoadFile($dllPath) | Out-Null
}
catch {
    Write-Output "ERROR: Could not load libzkfpcsharp.dll from $dllPath"
    exit 1
}

# Define the zkfp class alias if needed, usually it's libzkfpcsharp.zkfp
# Note: The namespace typically defaults to libzkfpcsharp

$ret = [libzkfpcsharp.zkfp2]::Init()
if ($ret -ne 0) {
    Write-Output "ERROR: Failed to initialize SDK. Ret=$ret"
    exit 1
}

$deviceCount = [libzkfpcsharp.zkfp2]::GetDeviceCount()
if ($deviceCount -eq 0) {
    Write-Output "ERROR: No devices connected."
    [libzkfpcsharp.zkfp2]::Terminate()
    exit 1
}

$devHandle = [libzkfpcsharp.zkfp2]::OpenDevice(0)
if ($devHandle -eq 0) {
    Write-Output "ERROR: Failed to open device 0."
    [libzkfpcsharp.zkfp2]::Terminate()
    exit 1
}


# Allocate image buffer (Width * Height, usually < 100KB for SLK20R)
# Safe bet 200KB
$imgSize = 200 * 1024
$imgBuffer = New-Object byte[] $imgSize


Write-Output "STATUS: Ready to capture. Place finger on sensor..."

# --- SilkID High-Res Mode (1232 bytes) ---
# Many MB460 devices require the 1232-byte template (SilkID v2.1)
# We try potential parameters to force the larger template size
$paramsToTry = @(1101, 1102, 1103)
foreach ($p in $paramsToTry) {
    try {
        Write-Debug "Attempting to set parameter $p for SilkID mode..."
        [libzkfpcsharp.zkfp2]::SetParameters($devHandle, $p, [byte[]](1, 0, 0, 0), 4) | Out-Null
        Write-Debug "Parameter $p set successfully (or ignored if not supported)."
    }
    catch {
        Write-Debug "Setting parameter $p failed: $($_.Exception.Message)"
    }
}
    
# Verify current template size setting if possible
[byte[]]$val = New-Object byte[] 4
$vLen = 4
if ([libzkfpcsharp.zkfp2]::GetParameters($devHandle, 1102, $val, [ref]$vLen) -eq 0) {
    $currentMode = [System.BitConverter]::ToInt32($val, 0)
    Write-Debug "Current SilkID Mode (Param 1102): $currentMode"
}
else {
    Write-Debug "Could not retrieve parameter 1102 (SilkID Mode)."
}

# --- 3. Enrollment Loop (3 Presses) ---
$template1 = $null
$template2 = $null
$template3 = $null

$dbHandle = [libzkfpcsharp.zkfp2]::DBInit()
if ($dbHandle -eq 0) {
    Write-Output "ERROR: Failed to initialize Fingerprint DB."
    [libzkfpcsharp.zkfp2]::CloseDevice($devHandle)
    [libzkfpcsharp.zkfp2]::Terminate()
    exit 1
}

for ($i = 1; $i -le 3; $i++) {
    Write-Host "STATUS: Place finger on sensor ($i/3)..."
    
    # Wait for finger
    $timeout = 0
    $buf = New-Object byte[] 2048
    $size = 2048
    $res = -8
    while ($res -ne 0) {
        $size = 2048 # Reset size for each acquisition attempt
        $res = [libzkfpcsharp.zkfp2]::AcquireFingerprint($devHandle, $imgBuffer, $buf, [ref]$size)
        if ($res -ne 0) {
            Start-Sleep -Milliseconds 100
            $timeout++
            if ($timeout -gt 300) {
                # 30 seconds
                Write-Host "ERROR: Timeout waiting for finger"
                [libzkfpcsharp.zkfp2]::DBFree($dbHandle)
                [libzkfpcsharp.zkfp2]::CloseDevice($devHandle)
                [libzkfpcsharp.zkfp2]::Terminate()
                exit 1
            }
        }
    }

    # Success capture
    if ($size -lt 100) {
        Write-Host "STATUS: Capture too small ($size bytes), try again..."
        $i-- # Retry this index
        Start-Sleep -Milliseconds 500
        continue
    }

    $tempBytes = $buf[0..($size - 1)]
    Write-Host "STATUS: Capture $i/3 success ($size bytes). Lift finger..."
    
    if ($i -eq 1) { $template1 = $tempBytes }
    if ($i -eq 2) { $template2 = $tempBytes }
    if ($i -eq 3) { $template3 = $tempBytes }

    # Wait for finger lift
    $liftTimeout = 0
    while ($res -eq 0) {
        $dummySize = 2048
        $res = [libzkfpcsharp.zkfp2]::AcquireFingerprint($devHandle, $imgBuffer, $buf, [ref]$dummySize)
        if ($res -eq 0) {
            Start-Sleep -Milliseconds 100
            $liftTimeout++
            if ($liftTimeout -gt 50) { break } 
        }
    }
    Start-Sleep -Milliseconds 800 # Pause for sensor to clear
}

Write-Host "STATUS: Merging templates..."

# --- 4. Merge Templates (Registration) ---
if ($null -eq $template1 -or $null -eq $template2 -or $null -eq $template3) {
    Write-Host "ERROR: One or more captures missing."
    [libzkfpcsharp.zkfp2]::DBFree($dbHandle)
    [libzkfpcsharp.zkfp2]::CloseDevice($devHandle)
    [libzkfpcsharp.zkfp2]::Terminate()
    exit 1
}

$regTemp = New-Object byte[] 2048
$regSize = 2048
$mergeRes = [libzkfpcsharp.zkfp2]::DBMerge($dbHandle, $template1, $template2, $template3, $regTemp, [ref]$regSize)

if ($mergeRes -eq 0) {
    # Success!
    $finalBytes = $regTemp[0..($regSize - 1)]
    $base64 = [Convert]::ToBase64String($finalBytes)
    Write-Host "SUCCESS: $base64"
}
else {
    Write-Host "ERROR: Merge failed (Code: $mergeRes). Fingerprints may not match or quality is too low."
}

[libzkfpcsharp.zkfp2]::DBFree($dbHandle)
[libzkfpcsharp.zkfp2]::CloseDevice($devHandle)
[libzkfpcsharp.zkfp2]::Terminate()
exit 0
