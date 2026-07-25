# KOICA 해외사무소 AI·데이터 활용 교육

KOICA 해외사무소 근무자를 대상으로 한 AI·데이터 활용 교육 자료입니다. Claude Code를 기본 환경으로 삼되 ChatGPT의 Codex에서도 적용할 수 있는 파일 중심 업무, MCP, LLM Wiki, Skill·Plugin, 웹앱 구축, GitHub, 원격 확인과 개인 프로젝트 사례를 다룹니다.

> 이 저장소의 문서와 코드는 공개하지만, 내부 업무 화면이 담긴 시연 영상과 권리가 확인되지 않은 밈·도식 원본은 공개 저장소에 포함하지 않습니다. 강의자 로컬 폴더에 자산이 있으면 실제 영상·이미지를 표시하고, 공개본에서는 같은 메시지의 대체 화면을 자동으로 표시합니다.

## 주요 파일

| 경로 | 설명 |
|---|---|
| `발표-슬라이드-내용.md` | 발표 내용과 발표자 노트의 원본 |
| `koica-oos-ai-data-training.html` | 브라우저에서 바로 실행하는 66장 발표 자료 |
| `밈-삽입-계획.md` | 밈 선정·드롭 사유와 출처·권리 경고 |
| `meme-plan.json` | 스킬 감사에 사용하는 기계 판독형 밈 배치 계획 |
| `.slide-build/build-slides.mjs` | Markdown 원본에서 HTML을 생성하는 빌드 스크립트 |
| `.slide-build/playwright-audit.js` | 브라우저 렌더링 검수 스크립트 |
| `assets/memes/` | 강의자 로컬 전용 밈 원본. 공개 저장소에서는 제외 |
| `assets/diagrams/` | 강의자 로컬 전용 참고 도식. 공개 저장소에서는 제외 |
| `assets/video/` | 내부 시연 원본·최적화 MP4·포스터. 공개 저장소에서는 제외 |
| `scripts/check-public-assets.sh` | 내부 자산이 Git에 추적되는지 검사하는 공개 전 점검 |

## 빌드

Node.js만 있으면 별도 패키지 설치 없이 최종 HTML을 다시 생성할 수 있습니다.

```bash
node .slide-build/build-slides.mjs
```

생성된 `koica-oos-ai-data-training.html`을 브라우저로 열거나 로컬 서버에서 실행합니다.

강의자 로컬 폴더에 영상·도식·밈 파일이 없더라도 슬라이드는 깨지지 않습니다. 해당 영역에는 공개용 텍스트 대체 화면이 나타납니다.

macOS·Linux:

```bash
python3 -m http.server 8000
```

Windows PowerShell:

```powershell
py -m http.server 8000
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
- `artifacts/`, `assets/video/`, `assets/diagrams/`와 로컬 전용 밈 파일은 공개 Git 저장소에서 제외합니다.
- 내부 규정·법령·사업 정보는 최신 공식 원문을 다시 확인합니다.
- 외부 배포본에서는 `밈-삽입-계획.md`의 사용 범위와 공개 대체 정책을 반드시 검토합니다.

공개 전에는 다음 검사를 실행합니다.

```bash
bash scripts/check-public-assets.sh
```
