# KOICA 해외사무소 AI·데이터 활용 교육

KOICA 해외사무소 근무자를 대상으로 한 AI·데이터 활용 교육 자료입니다. Claude Code를 기본 환경으로 삼되 ChatGPT의 Codex에서도 적용할 수 있는 파일 중심 업무, MCP, LLM Wiki, Skill·Plugin, 웹앱 구축, GitHub, 원격 확인과 개인 프로젝트 사례를 다룹니다.

> 이 저장소는 내부 교육용입니다. 권리가 확인되지 않은 밈 파생 이미지가 포함되어 있으므로 비공개로 관리하며, 외부 공개·녹화·재배포 전에는 해당 이미지를 제거하거나 권리가 확인된 자산으로 교체해야 합니다.

## 주요 파일

| 경로 | 설명 |
|---|---|
| `발표-슬라이드-내용.md` | 발표 내용과 발표자 노트의 원본 |
| `koica-oos-ai-data-training.html` | 브라우저에서 바로 실행하는 68장 발표 자료 |
| `밈-삽입-계획.md` | 밈 선정·드롭 사유와 출처·권리 경고 |
| `.slide-build/build-slides.mjs` | Markdown 원본에서 HTML을 생성하는 빌드 스크립트 |
| `.slide-build/playwright-audit.js` | 브라우저 렌더링 검수 스크립트 |
| `assets/memes/` | 발표에서 사용하는 로컬 이미지와 사용자 제공 원본 |

## 빌드

Node.js만 있으면 별도 패키지 설치 없이 최종 HTML을 다시 생성할 수 있습니다.

```bash
node .slide-build/build-slides.mjs
```

생성된 `koica-oos-ai-data-training.html`을 브라우저로 열거나 로컬 서버에서 실행합니다.

```bash
python3 -m http.server 8000
```

## 발표 조작

- `←`·`→`, `Page Up`·`Page Down`: 슬라이드 이동
- `Home`·`End`: 처음·마지막 슬라이드
- `N`: 발표자 노트
- `O`: 전체 슬라이드 목록
- `F`: 전체 화면
- `Esc`: 노트·목록 닫기

## 관리 원칙

- 발표 내용은 Markdown에서 수정하고 빌드 결과인 HTML도 함께 커밋합니다.
- `output/`의 렌더링 캡처와 `.playwright-cli/` 로그는 로컬 검수 산출물이므로 Git에서 제외합니다.
- 내부 규정·법령·사업 정보는 최신 공식 원문을 다시 확인합니다.
- 외부 배포본에서는 `밈-삽입-계획.md`의 권리 경고를 반드시 검토합니다.
