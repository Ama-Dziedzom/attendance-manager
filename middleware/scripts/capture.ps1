
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

# Allocate buffer (2048 bytes is standard for ZK templates)
$templateSize = 2048
$templateBuffer = New-Object byte[] $templateSize

# Allocate image buffer (Width * Height, usually < 100KB for SLK20R)
# Safe bet 200KB
$imgSize = 200 * 1024
$imgBuffer = New-Object byte[] $imgSize

$actualSize = 0

Write-Output "STATUS: Ready to capture. Place finger on sensor..."

# Simple polling loop for capture (timeout 10s)
$startTime = Get-Date
$captured = $false

while (($working -ne $false) -and ((Get-Date) - $startTime).TotalSeconds -lt 15) {
    $sizeRef = $templateSize
    
    # AcquireFingerprint(IntPtr devHandle, byte[] imgBuffer, byte[] templateBuffer, ref int size)
    # Note: We don't need the image for enrollment, just the template
    # Some older DLL versions might behave differently. 
    # Let's try the high level helper if available, otherwise raw.
    
    # Checking if "cap" helper is available or raw Acquire
    try {
        $ret = [libzkfpcsharp.zkfp2]::AcquireFingerprint($devHandle, $imgBuffer, $templateBuffer, [ref]$sizeRef)
        if ($ret -eq 0) {
            $captured = $true
            $actualSize = $sizeRef
            break
        }
    }
    catch {
        Write-Output "ERROR: Exception during capture: $_"
        break
    }
    
    Start-Sleep -Milliseconds 100
}

if ($captured) {
    # Convert active part of buffer to Base64
    if ($actualSize -gt 0) {
        # Create a sized array
        $finalBytes = New-Object byte[] $actualSize
        [Array]::Copy($templateBuffer, $finalBytes, $actualSize)
        $b64 = [Convert]::ToBase64String($finalBytes)
        
        Write-Output "SUCCESS: $b64"
    }
    else {
        Write-Output "ERROR: Captured size was 0"
    }
}
else {
    Write-Output "ERROR: Timeout or failed to capture."
}

[libzkfpcsharp.zkfp2]::CloseDevice($devHandle)
[libzkfpcsharp.zkfp2]::Terminate()
exit 0
