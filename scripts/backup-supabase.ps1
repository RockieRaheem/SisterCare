param(
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($env:SUPABASE_DB_URL)) {
  throw "Set SUPABASE_DB_URL to the Supabase Session Pooler connection string before running this script."
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmssZ")
$backupDirectory = Join-Path $resolvedOutput "sistercare-$timestamp"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

function Invoke-SupabaseDump {
  param([string[]]$Arguments, [string]$Label)
  & npx.cmd supabase@latest db dump --db-url $env:SUPABASE_DB_URL @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Label backup failed with exit code $LASTEXITCODE."
  }
}

$rolesFile = Join-Path $backupDirectory "roles.sql"
$schemaFile = Join-Path $backupDirectory "schema.sql"
$dataFile = Join-Path $backupDirectory "data.sql"
Invoke-SupabaseDump -Label "Roles" -Arguments @("--file", $rolesFile, "--role-only")
Invoke-SupabaseDump -Label "Schema" -Arguments @("--file", $schemaFile)
Invoke-SupabaseDump -Label "Data" -Arguments @("--file", $dataFile, "--data-only", "--use-copy", "-x", "storage.buckets_vectors", "-x", "storage.vector_indexes")

$files = @($rolesFile, $schemaFile, $dataFile)
foreach ($file in $files) {
  if (-not (Test-Path -LiteralPath $file) -or (Get-Item -LiteralPath $file).Length -eq 0) {
    throw "Backup validation failed because $file is missing or empty."
  }
}

$manifest = @{
  createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  files = $files | ForEach-Object {
    $item = Get-Item -LiteralPath $_
    $hash = Get-FileHash -LiteralPath $_ -Algorithm SHA256
    @{ name = $item.Name; bytes = $item.Length; sha256 = $hash.Hash }
  }
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $backupDirectory "manifest.json") -Encoding UTF8

Write-Output "Backup completed and checksummed: $backupDirectory"
Write-Warning "This backup contains private data. Encrypt it, store it off-site, restrict access, and never commit it to Git."
