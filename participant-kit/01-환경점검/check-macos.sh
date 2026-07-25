#!/bin/sh
set -u

missing=0

check_required() {
  label=$1
  command_name=$2
  if command -v "$command_name" >/dev/null 2>&1; then
    version=$("$command_name" --version 2>/dev/null | head -n 1)
    printf 'OK   %-12s %s\n' "$label" "$version"
  else
    printf 'MISS %-12s %s 명령을 찾지 못했습니다.\n' "$label" "$command_name"
    missing=1
  fi
}

printf '%s\n' 'KOICA AI·데이터 교육 환경점검 — macOS'
printf 'OS   %s\n' "$(sw_vers -productVersion 2>/dev/null || uname -r)"

check_required "Git" git
check_required "Node.js" node
check_required "npm" npm

if command -v claude >/dev/null 2>&1; then
  printf 'OK   %-12s %s\n' "Claude Code" "$(claude --version 2>/dev/null | head -n 1)"
elif command -v codex >/dev/null 2>&1; then
  printf 'OK   %-12s %s\n' "Codex CLI" "$(codex --version 2>/dev/null | head -n 1)"
else
  printf '%s\n' 'WARN AI 도구 명령을 찾지 못했습니다. ChatGPT 데스크톱 앱을 사용할 경우 앱에서 프로젝트 폴더 열기를 확인하세요.'
fi

if [ -d "프로젝트/raw-data" ]; then
  printf '%s\n' 'OK   실습 프로젝트 폴더를 찾았습니다.'
else
  printf '%s\n' 'MISS 프로젝트/raw-data 폴더가 없습니다. ZIP을 다시 압축 해제하세요.'
  missing=1
fi

if [ "$missing" -eq 0 ]; then
  printf '%s\n' 'READY 필수 환경점검을 통과했습니다.'
else
  printf '%s\n' 'ACTION MISS 항목을 설치한 뒤 다시 실행하세요.'
fi

exit "$missing"
