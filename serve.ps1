# Simple static file server for Inside Leads rebuild
# Usage: powershell -NoProfile -File serve.ps1 [-Port 3000]
param([int]$Port = 3000)

$Root = $PSScriptRoot
$Prefix = "http://localhost:$Port/"

$MimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
    '.ttf'  = 'font/ttf'
}

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add($Prefix)
$Listener.Start()

Write-Output "Serving $Root"
Write-Output "Local: http://localhost:$Port"

try {
    while ($Listener.IsListening) {
        $Context  = $Listener.GetContext()
        $Request  = $Context.Request
        $Response = $Context.Response

        $RawPath = $Request.Url.LocalPath
        if ($RawPath -eq '/' -or $RawPath -eq '') { $RawPath = '/index.html' }

        $FilePath = Join-Path $Root $RawPath.TrimStart('/')

        if (Test-Path $FilePath -PathType Leaf) {
            $Ext  = [System.IO.Path]::GetExtension($FilePath).ToLower()
            $Mime = if ($MimeTypes.ContainsKey($Ext)) { $MimeTypes[$Ext] } else { 'application/octet-stream' }
            $Bytes = [System.IO.File]::ReadAllBytes($FilePath)
            $Response.ContentType   = $Mime
            $Response.ContentLength64 = $Bytes.Length
            $Response.StatusCode    = 200
            $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
        } else {
            $Body  = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $RawPath")
            $Response.ContentType   = 'text/plain'
            $Response.ContentLength64 = $Body.Length
            $Response.StatusCode    = 404
            $Response.OutputStream.Write($Body, 0, $Body.Length)
        }

        $Response.OutputStream.Close()
    }
} finally {
    $Listener.Stop()
}
