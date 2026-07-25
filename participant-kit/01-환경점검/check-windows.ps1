$ErrorActionPreference = "Stop"
$Missing = $false

function Test-RequiredCommand {
    param(
        [string]$Label,
        [string]$CommandName
    )

    $Command = Get-Command $CommandName -ErrorAction SilentlyContinue
    if ($null -eq $Command) {
        Write-Host ("MISS {0,-12} {1} 명령을 찾지 못했습니다." -f $Label, $CommandName)
        $script:Missing = $true
        return
    }

    $Version = (& $CommandName --version 2>$null | Select-Object -First 1)
    Write-Host ("OK   {0,-12} {1}" -f $Label, $Version)
}

Write-Host "KOICA AI·데이터 교육 환경점검 — Windows"
$Build = [Environment]::OSVersion.Version.Build
Write-Host ("OS   Windows build {0}" -f $Build)

Test-RequiredCommand -Label "Git" -CommandName "git"
Test-RequiredCommand -Label "Node.js" -CommandName "node"
Test-RequiredCommand -Label "npm" -CommandName "npm"

if (Get-Command "claude" -ErrorAction SilentlyContinue) {
    $Version = (& claude --version 2>$null | Select-Object -First 1)
    Write-Host ("OK   {0,-12} {1}" -f "Claude Code", $Version)
}
elseif (Get-Command "codex" -ErrorAction SilentlyContinue) {
    $Version = (& codex --version 2>$null | Select-Object -First 1)
    Write-Host ("OK   {0,-12} {1}" -f "Codex CLI", $Version)
}
else {
    Write-Host "WARN AI 도구 명령을 찾지 못했습니다. ChatGPT 데스크톱 앱을 사용할 경우 앱에서 프로젝트 폴더 열기를 확인하세요."
}

if (Test-Path ".\프로젝트\raw-data") {
    Write-Host "OK   실습 프로젝트 폴더를 찾았습니다."
}
else {
    Write-Host "MISS 프로젝트\raw-data 폴더가 없습니다. ZIP을 다시 압축 해제하세요."
    $Missing = $true
}

if ($Build -lt 22000) {
    Write-Host "INFO Windows 10에서는 선택 과정인 Cloudflare Wrangler 실습을 생략하거나 시연만 봅니다."
}

if ($Missing) {
    Write-Host "ACTION MISS 항목을 설치한 뒤 다시 실행하세요."
    exit 1
}

Write-Host "READY 필수 환경점검을 통과했습니다."
exit 0
