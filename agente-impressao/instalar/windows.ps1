# Instala o agente de impressao do Almox como tarefa do Windows que liga com o PC
# e volta sozinha se cair. Rode no PowerShell como administrador, na pasta agente-impressao:
#   powershell -ExecutionPolicy Bypass -File instalar\windows.ps1
# Para remover:
#   powershell -ExecutionPolicy Bypass -File instalar\windows.ps1 -Remover

param([switch]$Remover)

$ErrorActionPreference = 'Stop'
$nomeTarefa = 'Almox - Agente de impressao'
$pasta = Split-Path -Parent $PSScriptRoot

if ($Remover) {
  Unregister-ScheduledTask -TaskName $nomeTarefa -Confirm:$false
  Write-Host 'Agente removido.'
  exit 0
}

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { throw 'Node.js nao encontrado. Instale o Node 24 LTS (nodejs.org) e rode de novo.' }
$versao = [version]((& $node --version).TrimStart('v'))
if ($versao -lt [version]'22.18.0') { throw "Node $versao esta desatualizado. Instale o Node 24 LTS." }
if (-not (Test-Path (Join-Path $pasta '.env'))) {
  throw 'Falta o arquivo .env. Copie .env.example para .env e cole a configuracao da tela Impressora.'
}

New-Item -ItemType Directory -Force (Join-Path $pasta 'logs') | Out-Null
$comando = "/c `"`"$node`" src\agente.ts >> logs\agente.log 2>&1`""
$acao = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $comando -WorkingDirectory $pasta
$gatilho = New-ScheduledTaskTrigger -AtStartup
$ajustes = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$conta = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $nomeTarefa -Action $acao -Trigger $gatilho -Settings $ajustes `
  -Principal $conta -Force | Out-Null
Start-ScheduledTask -TaskName $nomeTarefa

Write-Host "Agente instalado e ligado. Log: $pasta\logs\agente.log"
Write-Host 'Confira na tela Impressora do app: deve aparecer "Agente online".'
