#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

blocked_patterns=(
  '^artifacts/'
  '^assets/video/'
  '^assets/diagrams/'
  '^assets/memes/bike-fall\.jpg$'
  '^assets/memes/skill-plugin-bulls\.webp$'
  '^assets/memes/confused-travolta\.jpg$'
  '^assets/memes/Z-SeduIo6bSvhtV7ZZGZPTvCtmbGscj1t_tR5e8EiGpHGAzq-2GVl9pAFD-qRzTx1TsXd09rhHrn6hRIjK1GTA\.webp$'
  '(^|/)\.env($|\.)'
  '\.mov$'
)

tracked="$(git ls-files)"
failed=0

for pattern in "${blocked_patterns[@]}"; do
  matches="$(printf '%s\n' "$tracked" | grep -E "$pattern" || true)"
  if [[ -n "$matches" ]]; then
    printf '공개 저장소 금지 경로가 Git에 추적되고 있습니다: %s\n' "$pattern" >&2
    printf '%s\n' "$matches" >&2
    failed=1
  fi
done

if [[ "$failed" -ne 0 ]]; then
  printf '위 파일을 Git 추적에서 제외한 뒤 다시 검사하세요.\n' >&2
  exit 1
fi

printf '공개 자산 검사 통과: 내부 전용 경로가 Git에 추적되지 않습니다.\n'
