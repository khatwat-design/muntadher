$ErrorActionPreference = 'SilentlyContinue'
$port = 5173

# Stop any process using the dev server port
$line = netstat -ano | Select-String ":$port" | Select-Object -First 1
if ($line) {
    $parts = $line -split '\s+'
    $procId = $parts[-1]
    if ($procId) {
        taskkill /PID $procId /F | Out-Null
    }
}

# Start Vite dev server
Start-Process -FilePath "npm" -ArgumentList "run","dev" -WorkingDirectory $PSScriptRoot
