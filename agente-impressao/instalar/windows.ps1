# Instala o agente de impressao do Almox como tarefa do Windows que liga com o PC
# e volta sozinha se cair. Copie a pasta para um lugar fixo (ex.: C:\Program Files\Almox\agente-impressao)
# e rode no PowerShell como administrador, dentro dela:
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

# Roda como LOCAL SERVICE (sem privilegio de administrador). A pasta fica gravavel so
# por Administradores/SYSTEM: ninguem troca o codigo do agente; o servico so le o
# codigo e o .env e escreve em logs\. Outros usuarios nao leem o .env (token).
# SIDs em vez de nomes: funciona no Windows em portugues.
$servicoLocal = (New-Object System.Security.Principal.SecurityIdentifier 'S-1-5-19').Translate(
  [System.Security.Principal.NTAccount]).Value
$logs = Join-Path $pasta 'logs'
New-Item -ItemType Directory -Force $logs | Out-Null
& icacls $pasta /inheritance:r /grant:r '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-18:(OI)(CI)F' '*S-1-5-19:(OI)(CI)RX' /T /Q | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel ajustar as permissoes da pasta.' }
& icacls $logs /grant '*S-1-5-19:(OI)(CI)M' /Q | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel liberar a pasta de logs.' }

# O agente ja grava logs\agente-AAAA-MM-DD.log (14 dias). A saida da tela vai fora; so os erros
# da execucao atual ficam em logs\agente-falha.log (sobrescrito a cada inicio: nao cresce).
$comando = "/c `"`"$node`" src\agente.ts > NUL 2> logs\agente-falha.log`""
$acao = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $comando -WorkingDirectory $pasta
$gatilho = New-ScheduledTaskTrigger -AtStartup
$ajustes = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$conta = New-ScheduledTaskPrincipal -UserId $servicoLocal -LogonType ServiceAccount -RunLevel Limited

Register-ScheduledTask -TaskName $nomeTarefa -Action $acao -Trigger $gatilho -Settings $ajustes `
  -Principal $conta -Force | Out-Null
Start-ScheduledTask -TaskName $nomeTarefa

Write-Host "Agente instalado e ligado. Log: $pasta\logs\agente-AAAA-MM-DD.log"
Write-Host 'Confira na tela Impressora do app: deve aparecer "Agente online".'
