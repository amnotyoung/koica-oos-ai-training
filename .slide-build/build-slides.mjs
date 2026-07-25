import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sourcePath = path.join(root, "발표-슬라이드-내용.md");
const outputPath = path.join(root, "koica-oos-ai-data-training.html");
const source = fs.readFileSync(sourcePath, "utf8");

const escapeHtml = (value = "") =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function inlineMd(value = "") {
  return escapeHtml(value)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function tableHtml(lines) {
  const rows = lines.map((line) =>
    line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim())
  );
  const usable = rows.filter((row, index) => {
    if (index !== 1) return true;
    return !row.every((cell) => /^:?-{3,}:?$/.test(cell));
  });
  const [head, ...body] = usable;
  return `<div class="table-wrap"><table><thead><tr>${head
    .map((cell) => `<th>${inlineMd(cell)}</th>`)
    .join("")}</tr></thead><tbody>${body
    .map((row) => `<tr>${row.map((cell) => `<td>${inlineMd(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

function mdToHtml(markdown = "") {
  const lines = markdown.trim().split(/\r?\n/);
  const output = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      output.push(`<pre data-lang="${escapeHtml(lang)}"><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^\|.+\|$/.test(line.trim())) {
      const table = [];
      while (index < lines.length && /^\|.+\|$/.test(lines[index].trim())) {
        table.push(lines[index]);
        index += 1;
      }
      output.push(tableHtml(table));
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      output.push(`<blockquote>${quote.map(inlineMd).join("<br>")}</blockquote>`);
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^-\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^-\s+/, ""));
        index += 1;
      }
      output.push(`<ul class="ticks">${items.map((item) => `<li>${inlineMd(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      output.push(
        `<ol class="steps">${items
          .map((item) => `<li><span>${inlineMd(item)}</span></li>`)
          .join("")}</ol>`
      );
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("```") &&
      !/^\|.+\|$/.test(lines[index].trim()) &&
      !/^>\s?/.test(lines[index]) &&
      !/^-\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    output.push(`<p>${paragraph.map(inlineMd).join("<br>")}</p>`);
  }

  return output.join("\n");
}

function parseSlides(markdown) {
  const lines = markdown.split(/\r?\n/);
  const slides = [];
  let currentPart = "";
  let current = null;

  const finish = () => {
    if (!current) return;
    const sections = { screen: [], visual: [], notes: [], sources: [] };
    let active = "screen";
    for (const line of current.body) {
      const heading = line.match(/^###\s+(화면|시각\/시연|발표자 노트|출처)\s*$/);
      if (heading) {
        active = {
          화면: "screen",
          "시각/시연": "visual",
          "발표자 노트": "notes",
          출처: "sources",
        }[heading[1]];
        continue;
      }
      sections[active].push(line);
    }
    slides.push({
      ...current,
      part: currentPart,
      screen: sections.screen.join("\n").trim(),
      visual: sections.visual.join("\n").trim(),
      notes: sections.notes.join("\n").trim(),
      sources: sections.sources.join("\n").trim(),
    });
    current = null;
  };

  for (const line of lines) {
    const partMatch = line.match(/^#\s+(\d+부\..+)$/);
    if (partMatch) {
      finish();
      currentPart = partMatch[1];
      continue;
    }
    const slideMatch = line.match(/^##\s+Slide\s+(\d+)\s+—\s+(.+)$/);
    const appendixMatch = line.match(/^##\s+Appendix\s+(\d+)\s+—\s+(.+)$/);
    if (slideMatch || appendixMatch) {
      finish();
      if (slideMatch) {
        current = {
          kind: "slide",
          number: Number(slideMatch[1]),
          id: `slide-${slideMatch[1]}`,
          title: slideMatch[2],
          body: [],
        };
      } else {
        current = {
          kind: "appendix",
          number: Number(appendixMatch[1]),
          id: `appendix-${appendixMatch[1]}`,
          title: appendixMatch[2],
          body: [],
        };
      }
      continue;
    }
    if (current) current.body.push(line);
  }
  finish();
  return slides.filter((slide) => !(slide.kind === "appendix" && slide.number === 4));
}

const originalSlides = parseSlides(source);
const memeTransition = {
  kind: "meme",
  number: 33.5,
  id: "meme-skill-plugin",
  title: "Skill과 Plugin은 함께 완성됩니다",
  part: "5부. 반복을 스킬로, 공유를 플러그인으로",
  screen: "",
  visual: "",
  notes:
    "Skill은 Claude가 일하는 방법이고, Plugin은 그 능력을 설치하고 공유하는 단위입니다. 둘 중 하나를 고르는 관계가 아니라 결합하는 관계입니다.",
  sources:
    "- 사용자가 제공한 로컬 이미지\n- 내부 교육용 사용. 이미지 재사용 권리 미확인.",
};

const sectionBumpers = new Map([
  [5, ["02", "도구와 원천을 연결한다", "말 잘하는 AI를 근거를 확인하는 업무 도구로"]],
  [12, ["03", "파일을 AI가 읽는 형태로 바꾼다", "보이는 원본을 검산 가능한 텍스트로"]],
  [18, ["04", "쌓인 자료를 관계 있는 지식으로 만든다", "Brain dumping에서 LLM Wiki로"]],
  [25, ["05", "반복은 Skill로, 공유는 Plugin으로", "한 번 잘한 일을 동료도 재현하게"]],
  [34, ["06", "계획부터 웹앱 배포까지", "Opus로 계획하고 Sonnet으로 실행한다"]],
  [42, ["07", "GitHub에 축적하고 원격으로 확인한다", "변경을 기록하고, 자리를 비워도 상태를 본다"]],
  [49, ["08", "KOICA 동료의 실제 프로젝트", "작은 불편함이 도구와 공공자산으로 이어진다"]],
  [54, ["09", "트렌드를 따라가는 최소 습관", "하루 5분, 실제 사용 기록을 읽고 남긴다"]],
]);

const slides = [];
for (const slide of originalSlides) {
  if (slide.kind === "slide" && sectionBumpers.has(slide.number)) {
    const [sectionNumber, title, subtitle] = sectionBumpers.get(slide.number);
    slides.push({
      kind: "divider",
      number: Number(sectionNumber),
      id: `part-${sectionNumber}`,
      title,
      subtitle,
      part: slide.part,
      screen: "",
      visual: "",
      notes: `${slide.part}의 시작을 분명히 알리는 전환 슬라이드입니다.`,
      sources: "",
    });
  }
  slides.push(slide);
  if (slide.kind === "slide" && slide.number === 33) slides.push(memeTransition);
}

function semanticLayout(slide) {
  if (slide.kind === "divider") return "part-divider";
  if (slide.id === "slide-01") return "cover";
  if (slide.id === "slide-17") return "meme-sidecar";
  if (slide.id === "meme-skill-plugin") return "meme-handshake";
  if (["slide-06", "slide-07", "slide-08", "slide-09"].includes(slide.id)) return "tool-link statement";
  if (slide.id === "slide-35") return "model-plan";
  if (slide.id === "slide-46") return "loop-engineering";
  if (slide.id === "slide-47") return "remote-setup";
  if (["slide-50", "slide-51", "slide-52"].includes(slide.id)) return "project-links";
  if (slide.id === "slide-54") return "threads-slide";
  if (slide.screen.includes("|---")) return "table";
  if (slide.screen.includes("```")) return "code";
  if (slide.screen.trim().startsWith(">")) return "quote";
  if (/^-\s/m.test(slide.screen)) return "list";
  if (/^\d+\.\s/m.test(slide.screen)) return "steps";
  return "statement";
}

function specialContent(slide) {
  if (slide.kind === "divider") {
    return `
      <div class="divider-copy">
        <div class="divider-part">PART ${escapeHtml(slide.subtitle ? String(slide.number).padStart(2, "0") : "")}</div>
        <h2 class="title divider-title">${escapeHtml(slide.title)}</h2>
        <p>${escapeHtml(slide.subtitle || "")}</p>
        <div class="divider-rule"></div>
        <span class="divider-number">${String(slide.number).padStart(2, "0")}</span>
      </div>`;
  }

  if (slide.id === "slide-01") {
    return `
      <div class="cover-copy">
        <div class="eyebrow">KOICA 해외사무소 · AI & DATA</div>
        <h1>AI·데이터 활용,<br><span>해외사무소의 일을 다시 설계하다</span></h1>
        <p>Claude Code · MCP · LLM Wiki · Skills · Plugins · Web · GitHub</p>
        <div class="signal-line"><i></i><i></i><i></i><i></i><i></i><i></i></div>
      </div>`;
  }

  if (slide.id === "slide-02") {
    return `
      <div class="compare-lines">
        <div class="muted-path"><span>질문 한 번</span><b>→</b><span>답변 한 번</span><strong>업무 한 번</strong></div>
        <div class="active-path"><span>자료</span><b>→</b><span>근거</span><b>→</b><span>산출물</span><b>→</b><span>공유</span><b>→</b><span>개선</span><strong>업무가 이어지는 흐름</strong></div>
      </div>`;
  }

  if (slide.id === "slide-05") {
    return `
      <div class="connector-visual">
        <div class="connector-main">LLM <small>(Claude Code)</small></div>
        <div class="connector-bus"><span>MCP</span></div>
        <div class="connector-targets">
          <span>규정</span><span>법령</span><span>문서</span><span>회의</span><span>DB</span>
        </div>
      </div>
      <p class="big-conclusion">AI에게 <strong>손을 달아주는</strong> 공통 연결 단자</p>`;
  }

  if (slide.id === "slide-10") {
    return `
      <div class="pipeline">
        <div><small>01</small><strong>Tiro 회의</strong><span>말을 기록한다</span></div>
        <b>→</b>
        <div><small>02</small><strong>kordoc</strong><span>문서를 텍스트로</span></div>
        <b>→</b>
        <div><small>03</small><strong>규정 + 법령</strong><span>근거를 검증한다</span></div>
        <b>→</b>
        <div class="accent"><small>04</small><strong>산출물</strong><span>MD · CSV · 근거표</span></div>
      </div>`;
  }

  if (slide.id === "slide-13") {
    return `
      <div class="parse-flow">
        <div class="file-cloud"><span>HWP</span><span>HWPX</span><span>PDF</span><span>Office</span></div>
        <div class="parse-box">kordoc<small>HWP → MD 파싱</small></div>
        <div class="text-output">Markdown + 구조<small>사람이 검산할 수 있는 형태</small></div>
      </div>
      <p class="warning-line">파싱이 틀리면 답변도 자신 있게 틀릴 수 있습니다.</p>`;
  }

  if (slide.id === "slide-17") {
    return `
      <div class="meme-sidecar-grid">
        <div class="meme-setup">
          <div class="scatter-list"><span>다운로드 폴더</span><span>메신저 첨부파일</span><span>회의 메모</span><span>브라우저 북마크</span><span>내 머릿속의 연결</span></div>
          <p>쌓였지만 아직 <strong>지식은 아닙니다</strong></p>
        </div>
        <figure class="slide-meme" data-meme-role="reaction" data-meme-source="https://knowyourmeme.com/memes/confused-travolta/" data-meme-origin="searched">
          <img src="assets/memes/confused-travolta.jpg" alt="방 안을 둘러보며 찾는 대상을 발견하지 못한 듯한 남성">
          <figcaption>분명 저장했습니다.<br><strong>어디에 저장했는지만 빼고.</strong></figcaption>
          <small>Confused Travolta · rights unclear · internal only</small>
        </figure>
      </div>`;
  }

  if (slide.id === "slide-20") {
    return `
      <div class="relation-visual">
        <div class="relation-node">세네갈 농업사업</div>
        <div class="relation-link"><strong>비슷한 시행착오</strong><span>담당자 교체와 인수인계 실패</span></div>
        <div class="relation-node">우간다 청년고용사업</div>
      </div>
      <p class="big-conclusion">AI가 모르는 관련성을 <strong>사용자는 알고 있습니다.</strong></p>`;
  }

  if (slide.id === "slide-24") {
    return `
      <div class="cycle">
        <span>수집</span><b>→</b><span>정리</span><b>→</b><span>연결</span><b>→</b><span>질문</span><b>→</b><span>새 통찰</span><b>→</b><span>Lint</span>
      </div>
      <p class="big-conclusion">업무 중 생긴 질문과 수정이 다시 Wiki로 돌아올 때 지식이 쌓입니다.</p>`;
  }

  if (slide.id === "slide-25") {
    return `
      <div class="prompt-shrink">
        <div class="long-prompt">관련 페이지를 찾고 원문을 확인하고 근거를 붙이고 사용자 관계와 AI 관계를 구분하고…</div>
        <b>→</b>
        <div class="short-command">/wiki-answer</div>
      </div>
      <p class="big-conclusion">프롬프트를 반복하지 말고 <strong>일하는 절차를 저장합니다.</strong></p>`;
  }

  if (slide.id === "meme-skill-plugin") {
    return `
      <figure class="slide-meme handshake-meme" data-meme-role="analogy" data-meme-source="user-provided" data-meme-origin="user-provided">
        <div class="handshake-frame">
          <img src="assets/memes/skill-plugin-bulls.webp" alt="붉은 농구 유니폼을 입은 두 선수가 손을 맞대며 협력하는 그림">
          <span class="hand-label left">Skill<br><small>일하는 방법</small></span>
          <span class="hand-label right">Plugin<br><small>설치·공유 단위</small></span>
          <span class="hand-label center">동료도 같은 방식으로 일한다</span>
        </div>
        <figcaption>Skill은 방법, Plugin은 전달.</figcaption>
        <small>User-provided image · rights unverified · internal only</small>
      </figure>`;
  }

  if (slide.id === "slide-35") {
    return `
      <div class="model-role-grid">
        <div class="model-role plan">
          <span>PLAN</span><strong>Opus</strong>
          <ul><li>요구사항과 범위</li><li>구조와 위험</li><li>완료·검증 기준</li></ul>
        </div>
        <b>→</b>
        <div class="model-role execute">
          <span>BUILD</span><strong>Sonnet</strong>
          <ul><li>계획에 따른 구현</li><li>반복 수정과 테스트</li><li>결과와 변경점 기록</li></ul>
        </div>
      </div>
      <p class="big-conclusion">계획은 강한 추론에, 반복 실행은 속도와 비용 효율에 맡깁니다.</p>`;
  }

  if (slide.id === "slide-36") {
    return `
      <div class="layer-stack">
        <div><strong>프론트엔드</strong><span>사용자가 보고 누르는 화면</span></div>
        <div><strong>백엔드</strong><span>요청을 처리하는 로직</span></div>
        <div><strong>데이터베이스</strong><span>기억해야 할 정보</span></div>
      </div>`;
  }

  if (slide.id === "slide-39") {
    return `
      <div class="architecture">
        <div class="browser-box">브라우저<small>검색 · 질문 · 관계 추가</small></div>
        <b>↕</b>
        <div class="web-box">Cloudflare Pages<small>웹 화면과 앱 로직</small></div>
        <b>↕</b>
        <div class="db-box">Supabase<small>pages · relations · sources</small></div>
      </div>`;
  }

  if (slide.id === "slide-40") {
    return `
      <div class="pipeline deployment">
        <div><small>01</small><strong>완성 폴더</strong><span>빌드 결과 확인</span></div><b>→</b>
        <div><small>02</small><strong>Wrangler</strong><span>Direct Upload</span></div><b>→</b>
        <div class="accent"><small>03</small><strong>pages.dev</strong><span>브라우저 공유</span></div>
      </div>
      <pre class="deploy-command"><code>npx wrangler pages deploy &lt;폴더&gt;</code></pre>`;
  }

  if (slide.id === "slide-43") {
    return `
      <div class="split-def">
        <div><span>내 컴퓨터</span><strong>Git</strong><p>변경 이력 · 되돌리기 · 실험</p></div>
        <div><span>함께 쓰는 공간</span><strong>GitHub</strong><p>공유 · Issue · PR · Review · 배포</p></div>
      </div>`;
  }

  if (slide.id === "slide-46") {
    return `
      <div class="loop-layout">
        <div class="handoff-list">
          <span>자리를 비우기 전에</span>
          <strong>완료 조건</strong><strong>자동 검증</strong><strong>중단 조건</strong><strong>승인 지점</strong>
        </div>
        <div class="loop-ring">
          <span>목표</span><b>→</b><span>실행</span><b>→</b><span>검증</span><b>→</b><span>수정</span><b>↺</b>
        </div>
      </div>
      <p class="big-conclusion">승부는 오래 돌리는 시간이 아니라 <strong>검증 가능한 루프</strong>에서 납니다.</p>`;
  }

  if (["slide-50", "slide-51", "slide-52"].includes(slide.id)) {
    const projects = {
      "slide-50": [
        ["DevCoop KG", ["국가별 동향 Wiki", "기관·사업·주제 관계망", "LLM 질의"], "https://devcoop-trends-wiki.pages.dev/", "웹에서 열기"],
        ["ODA Map Lab", ["해외 위치 시각화", "좌표와 정보 검토", "사용자의 보정 제안"], "https://oda-map-lab.pages.dev/", "웹에서 열기"],
      ],
      "slide-51": [
        ["KOICA Regulation MCP", ["규정 검색", "조문 조회", "인용 검증"], "https://github.com/amnotyoung/koica-reg-mcp", "GitHub에서 열기"],
        ["DevEval Agents", ["평가 기준 적용", "근거 게이트", "사람의 최종 판단"], "https://github.com/amnotyoung/dev-eval-agents", "GitHub에서 열기"],
      ],
      "slide-52": [
        ["Aid World", ["개발협력 현장의 선택과 딜레마", "교육용 내러티브 게임"], "https://github.com/amnotyoung/idc-game", "GitHub에서 열기"],
        ["DevCoop Suite", ["Explore · Map · Verify · Evaluate · Learn", "독립 프로젝트를 하나의 탐색 체계로 연결"], "https://github.com/amnotyoung/github-devcoop-suite", "GitHub에서 열기"],
      ],
    }[slide.id];
    return `<div class="project-grid">${projects
      .map(
        ([name, bullets, url, label]) => `
          <div class="project-column">
            <strong>${escapeHtml(name)}</strong>
            <ul>${bullets.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            <a href="${url}" target="_blank" rel="noreferrer">${escapeHtml(label)} ↗</a>
          </div>`
      )
      .join("")}</div>`;
  }

  if (slide.id === "slide-54") {
    return `
      <div class="threads-grid">
        <div><strong>찾을 주제</strong><ul><li>Claude Code</li><li>MCP</li><li>Agent Skills · Plugins</li><li>AI 에이전트 사용 기록</li></ul></div>
        <div><strong>추천 계정</strong><ul class="account-list">
          <li><a href="https://www.threads.net/@choi.openai" target="_blank" rel="noreferrer">@choi.openai</a></li>
          <li><a href="https://www.threads.net/@chris_gomdori" target="_blank" rel="noreferrer">@chris_gomdori</a></li>
          <li><a href="https://www.threads.net/@amnotyoung.k" target="_blank" rel="noreferrer">@amnotyoung.k</a></li>
        </ul></div>
      </div>
      <p class="big-conclusion">원문 링크와 실패 기록이 있는 실제 사용기를 우선 읽습니다.</p>`;
  }

  if (slide.id === "slide-48") {
    return `
      <div class="ops-check">
        <div class="done"><span>✓</span><strong>구축 완료</strong></div>
        <div><span>—</span><strong>운영 담당</strong></div>
        <div><span>—</span><strong>업데이트</strong></div>
        <div><span>—</span><strong>문서</strong></div>
      </div>
      <p class="big-conclusion danger">결국 아무도 쓰지 않습니다.</p>`;
  }

  if (slide.id === "slide-56") {
    return `
      <div class="closing">
        <p>불편함을 <strong>텍스트</strong>로 바꾸고</p>
        <p>반복을 <strong>Skill</strong>로 묶고</p>
        <p>결과를 함께 쓰는 <strong>자산</strong>으로 축적합니다</p>
        <div class="closing-mark">오늘 하나의 폴더에서 시작하세요.</div>
      </div>`;
  }

  return mdToHtml(slide.screen);
}

function notesHtml(slide) {
  const notes = mdToHtml(slide.notes);
  const sources = slide.sources
    ? `<div class="note-sources"><h6>Sources</h6>${mdToHtml(slide.sources)}</div>`
    : "";
  return `<div class="note-copy">${notes || "<p>발표자 노트 없음</p>"}</div>${sources}`;
}

function slideHtml(slide, index) {
  const layout = semanticLayout(slide);
  const isDark = ["cover", "part-divider"].includes(layout);
  const titleLong = slide.title.length > 29 ? " long-title" : "";
  const part = slide.kind === "appendix" ? "Appendix" : slide.part || "AI·데이터 활용";
  const kicker = slide.kind === "appendix" ? `부록 ${String(slide.number).padStart(2, "0")}` : part.split(".")[0];
  const title =
    slide.id === "slide-01" || slide.kind === "divider"
      ? ""
      : `<h2 class="title${titleLong}">${inlineMd(slide.title)}</h2>`;
  const body = specialContent(slide);
  return `
    <section class="slide ${layout} ${isDark ? "dark" : ""}" id="${slide.id}" data-index="${index}" data-part="${escapeHtml(part)}">
      ${
        slide.id === "slide-01" || slide.kind === "divider"
          ? ""
          : `<header><div class="kicker"><span></span>${escapeHtml(kicker)}</div>${title}</header>`
      }
      <main class="slide-body">${body}</main>
      <footer>
        <span class="brand">KOICA 해외사무소 AI·데이터 활용</span>
        <span class="part-name">${escapeHtml(part.replace(/^\d+부\.\s*/, ""))}</span>
        <span class="slide-count">${String(index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}</span>
      </footer>
      <aside class="notes">${notesHtml(slide)}</aside>
    </section>`;
}

const renderedSlides = slides.map(slideHtml).join("\n");

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="KOICA 해외사무소 근무자를 위한 AI·데이터 활용 교육">
<link rel="icon" href="data:,">
<title>KOICA 해외사무소 AI·데이터 활용 교육</title>
<style>
  :root{
    --blue:#2563eb;--cyan:#06b6d4;--amber:#f59e0b;--navy:#081426;--navy2:#10223d;
    --ink:#10213a;--muted:#5b6b82;--faint:#91a0b5;--paper:#ffffff;--soft:#f3f7fc;--line:#dce5f0;
    --danger:#dc2626;--scale:1;
    --sans:Inter,Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;
    --mono:"SFMono-Regular",Consolas,"Liberation Mono",monospace;
  }
  *{box-sizing:border-box}
  html,body{width:100%;height:100%;margin:0}
  body{overflow:hidden;background:#050b14;color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased}
  .deck{position:fixed;inset:0;background:radial-gradient(circle at 50% 20%,#13233d 0,#050b14 68%)}
  .stage{position:absolute;left:50%;top:50%;width:1280px;height:720px;transform:translate(-50%,-50%) scale(var(--scale));transform-origin:center;border-radius:14px;overflow:hidden;box-shadow:0 36px 110px #000a;background:var(--paper)}
  .slide{position:absolute;inset:0;display:none;flex-direction:column;padding:54px 92px 62px;background:var(--paper)}
  .slide.active{display:flex;animation:enter .28s ease both}
  @keyframes enter{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
  .slide.dark{color:#eaf3ff;background:radial-gradient(circle at 80% 10%,#17335b 0,var(--navy2) 36%,var(--navy) 100%)}
  header{flex:none}
  .kicker{display:flex;align-items:center;gap:12px;color:var(--blue);font-weight:800;font-size:15px;letter-spacing:.08em;text-transform:uppercase}
  .kicker span{display:inline-block;width:30px;height:4px;border-radius:4px;background:linear-gradient(90deg,var(--blue),var(--cyan))}
  .title{margin:13px 0 0;font-size:48px;line-height:1.15;letter-spacing:-.035em;font-weight:850;color:var(--ink)}
  .title.long-title{font-size:40px;line-height:1.18;max-width:1160px}
  .dark .title{color:#fff}.dark .kicker{color:#8cc9ff}.dark .kicker span{background:linear-gradient(90deg,#8cc9ff,#4de2ff)}
  .slide-body{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;margin-top:24px}
  .slide-body>p{font-size:27px;line-height:1.48;margin:0 0 18px;color:var(--ink);font-weight:570;letter-spacing:-.018em}
  .slide-body>p:last-child{margin-bottom:0}
  .slide-body strong{font-weight:850;color:var(--blue)}
  .dark .slide-body>p{color:#d7e5f7}.dark .slide-body strong{color:#7edcff}
  footer{position:absolute;left:92px;right:92px;bottom:23px;display:grid;grid-template-columns:1fr auto auto;gap:22px;align-items:center;font-size:12px;font-weight:700;color:var(--faint)}
  footer::before{content:"";position:absolute;left:0;right:0;top:-12px;height:2px;background:linear-gradient(90deg,var(--blue) calc(var(--progress,0)*1%),var(--line) 0)}
  footer .part-name{color:var(--blue)}footer .slide-count{font-variant-numeric:tabular-nums;color:var(--muted)}
  .dark footer{color:#6f87a8}.dark footer::before{background:linear-gradient(90deg,#52c7ff calc(var(--progress,0)*1%),#243650 0)}.dark footer .part-name,.dark footer .slide-count{color:#9eb6d3}
  a{color:var(--blue);text-underline-offset:3px}
  code{font-family:var(--mono);font-size:.84em;background:#eaf0f8;padding:.12em .35em;border-radius:5px;color:#1e3a5f}
  pre{margin:0;background:#0c182a;color:#d9e9fb;border:1px solid #1c3453;border-radius:16px;padding:24px 28px;font-family:var(--mono);font-size:21px;line-height:1.55;white-space:pre-wrap;box-shadow:0 18px 44px #0d1b2a20}
  pre code{background:none;color:inherit;padding:0}
  blockquote{margin:0;border-left:6px solid var(--amber);background:#fff8e8;border-radius:0 16px 16px 0;padding:26px 32px;font-size:31px;line-height:1.48;font-weight:780;color:#763e0b}
  .ticks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:15px}
  .ticks li{position:relative;padding-left:34px;font-size:24px;line-height:1.42;color:#273a54;font-weight:560}
  .ticks li::before{content:"";position:absolute;left:0;top:.48em;width:16px;height:16px;border-radius:50%;background:var(--cyan);box-shadow:0 0 0 5px #dff7fb}
  ol.steps{list-style:none;counter-reset:item;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
  ol.steps li{counter-increment:item;display:grid;grid-template-columns:46px 1fr;align-items:center;gap:15px;font-size:22px;line-height:1.4;color:#263a54}
  ol.steps li::before{content:counter(item);width:42px;height:42px;border-radius:12px;background:var(--blue);color:#fff;display:grid;place-items:center;font-weight:850}
  .table-wrap{width:100%;max-height:430px;overflow:hidden;border:1px solid var(--line);border-radius:15px;box-shadow:0 14px 36px #1c335314}
  table{width:100%;border-collapse:collapse;background:#fff;table-layout:fixed}
  th{background:#eaf2ff;color:#1d4ed8;font-size:18px;text-align:left;padding:15px 18px;border-bottom:2px solid #c9dcfb;font-weight:850}
  td{font-size:17px;line-height:1.35;padding:14px 18px;border-bottom:1px solid var(--line);vertical-align:top;color:#31445d}
  tr:last-child td{border-bottom:none}
  td strong{color:var(--ink)!important}
  .section-open{background:linear-gradient(135deg,#f8fbff 0,#eef5ff 62%,#e9fbff 100%)}
  .section-open::after{content:"";position:absolute;width:420px;height:420px;border-radius:50%;right:-170px;bottom:-210px;background:radial-gradient(circle,#76dfff55 0,#2563eb0d 62%,transparent 64%)}
  .section-open .slide-body>p:first-child{font-size:34px;max-width:900px;line-height:1.4}
  .section-open .ticks{max-width:900px}
  .statement .slide-body{max-width:1050px}
  .statement .slide-body>p{font-size:31px;line-height:1.48}
  .list .slide-body{max-width:1050px}
  .quote .slide-body{max-width:1080px;gap:30px}
  .quote .slide-body>p{margin-top:0}
  .code .slide-body{gap:18px}
  .cover{padding:0;background:radial-gradient(circle at 72% 22%,#1f4c82 0,#10294b 34%,#071426 72%)}
  .cover::before{content:"";position:absolute;inset:0;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:46px 46px;mask-image:linear-gradient(to right,transparent,#000 35%,#000)}
  .cover-copy{position:relative;height:100%;padding:92px 86px;display:flex;flex-direction:column;justify-content:center}
  .cover-copy .eyebrow{font-size:16px;letter-spacing:.16em;color:#7edcff;font-weight:850;margin-bottom:24px}
  .cover-copy h1{font-size:68px;line-height:1.08;letter-spacing:-.05em;margin:0;color:#fff;font-weight:900}
  .cover-copy h1 span{color:#8bd7ff}
  .cover-copy p{font-size:22px;color:#abc1dd;margin:25px 0 0;font-weight:620}
  .signal-line{display:flex;align-items:center;gap:18px;margin-top:48px;width:520px}
  .signal-line::before{content:"";height:2px;background:#34557c;flex:1}
  .signal-line i{width:14px;height:14px;border-radius:50%;background:#52c7ff;box-shadow:0 0 0 5px #52c7ff1c}
  .signal-line i:nth-last-child(-n+2){background:var(--amber);box-shadow:0 0 0 5px #f59e0b20}
  .part-divider{padding:0;background:radial-gradient(circle at 78% 24%,#234f86 0,#102846 36%,#071426 75%);overflow:hidden}
  .part-divider::before{content:"";position:absolute;inset:0;background-image:linear-gradient(#ffffff09 1px,transparent 1px),linear-gradient(90deg,#ffffff09 1px,transparent 1px);background-size:52px 52px;mask-image:linear-gradient(90deg,#000,transparent 80%)}
  .part-divider .slide-body{margin:0;position:absolute;inset:0;padding:112px 106px;justify-content:center}
  .divider-copy{position:relative;z-index:2;max-width:900px}
  .divider-part{color:#72d9ff;font-size:17px;letter-spacing:.19em;font-weight:900;margin-bottom:26px}
  .divider-title{font-size:58px!important;line-height:1.12!important;letter-spacing:-.045em!important;color:#fff!important;margin:0!important;max-width:900px}
  .divider-copy>p{font-size:25px!important;color:#b9cbe2!important;margin:24px 0 0!important;font-weight:620!important}
  .divider-rule{width:290px;height:4px;border-radius:5px;margin-top:38px;background:linear-gradient(90deg,#42c9ff,#f59e0b)}
  .divider-number{position:absolute;right:-260px;top:-90px;font-size:300px;line-height:1;color:#ffffff0b;font-weight:950;letter-spacing:-.08em}
  .part-divider footer{display:none}
  .compare-lines{display:flex;flex-direction:column;gap:28px}
  .compare-lines>div{display:flex;align-items:center;gap:15px;padding:25px 28px;border-radius:16px;font-size:22px}
  .muted-path{background:#f3f5f8;color:#718097}.active-path{background:linear-gradient(90deg,#edf4ff,#e8fbff);color:#173a66;border:1px solid #c6e8f6}
  .compare-lines strong{margin-left:auto;font-size:25px}
  .compare-lines b{color:var(--cyan)}
  .connector-visual{display:flex;align-items:center;justify-content:center;gap:0;margin-bottom:30px}
  .connector-main{font-size:28px;font-weight:850;background:var(--navy2);color:#fff;border-radius:16px;padding:28px 38px}
  .connector-main small{display:block;margin-top:6px;font-size:14px;color:#afc7e5}
  .connector-bus{width:170px;height:4px;background:linear-gradient(90deg,var(--blue),var(--cyan));position:relative}
  .connector-bus span{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;border:2px solid var(--cyan);color:#087a8c;border-radius:999px;padding:8px 16px;font-weight:850}
  .connector-targets{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:350px}
  .connector-targets span{background:#edf6ff;border:1px solid #cce2fa;border-radius:10px;padding:11px;text-align:center;font-size:18px;font-weight:750;color:#245080}
  .tool-link .slide-body>p:last-child{font-size:18px;margin-top:26px}
  .tool-link .slide-body>p:last-child a{display:inline-block;padding:10px 14px;border:1px solid #bcd7f8;border-radius:10px;background:#edf5ff;font-weight:800;text-decoration:none}
  .big-conclusion{text-align:center!important;font-size:28px!important;color:#30445f!important}
  .big-conclusion.danger{color:var(--danger)!important;font-size:34px!important;font-weight:850!important}
  .pipeline{display:flex;align-items:stretch;gap:12px}
  .pipeline>div{flex:1;border:1px solid var(--line);border-radius:15px;padding:22px;background:#f8fbff;display:flex;flex-direction:column;gap:7px}
  .pipeline>div.accent{background:linear-gradient(160deg,#eaf2ff,#e5fbff);border-color:#91d9ec}
  .pipeline>b{display:grid;place-items:center;color:var(--cyan);font-size:30px}
  .pipeline small{color:var(--blue);font-weight:850}.pipeline strong{font-size:22px;color:var(--ink)!important}.pipeline span{font-size:16px;color:var(--muted)}
  .parse-flow{display:grid;grid-template-columns:1.2fr .6fr 1.2fr;align-items:center;gap:35px}
  .file-cloud{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .file-cloud span{background:#f1f5fa;border:1px solid var(--line);padding:20px;border-radius:13px;font:800 20px var(--mono);text-align:center}
  .parse-box,.text-output{padding:28px;border-radius:17px;text-align:center;font-size:28px;font-weight:850}
  .parse-box{background:var(--blue);color:#fff}.text-output{background:#e7fbff;color:#0f6474;border:1px solid #a3e7f2}
  .parse-box small,.text-output small{display:block;font-size:14px;margin-top:8px;font-weight:650;opacity:.8}
  .warning-line{text-align:center!important;margin-top:28px!important;color:#9a3412!important;font-size:23px!important}
  .meme-sidecar-grid{display:grid;grid-template-columns:1fr 1fr;gap:44px;align-items:center}
  .scatter-list{display:flex;flex-wrap:wrap;gap:10px}
  .scatter-list span{padding:12px 16px;border-radius:10px;background:#eef3f9;color:#44566d;font-size:18px;font-weight:700;transform:rotate(-1deg)}
  .scatter-list span:nth-child(even){transform:rotate(1.4deg);background:#edf9fb}
  .meme-setup p{font-size:29px;line-height:1.4;color:var(--ink);margin:26px 0 0}
  .slide-meme{margin:0;position:relative}
  .meme-sidecar-grid .slide-meme{background:#fff;border:1px solid var(--line);border-radius:17px;padding:12px 12px 16px;box-shadow:0 18px 44px #0b1f3725}
  .meme-sidecar-grid .slide-meme img{display:block;width:100%;border-radius:11px}
  .meme-sidecar-grid figcaption{font-size:22px;line-height:1.35;margin:13px 5px 0;color:#263a54}
  .meme-sidecar-grid figcaption strong{color:var(--blue)}
  .slide-meme>small{display:block;margin-top:7px;color:var(--faint);font-size:10px;font-weight:650}
  .relation-visual{display:grid;grid-template-columns:1fr 1.3fr 1fr;align-items:center;gap:20px}
  .relation-node{border:2px solid #bed7f7;background:#eef5ff;color:#1e4a7c;border-radius:16px;padding:28px;text-align:center;font-size:24px;font-weight:850}
  .relation-link{position:relative;text-align:center;color:#0e7490}
  .relation-link::before,.relation-link::after{content:"";position:absolute;top:28px;width:33%;height:3px;background:var(--cyan)}
  .relation-link::before{left:0}.relation-link::after{right:0}
  .relation-link strong{display:block;font-size:18px}.relation-link span{display:block;margin-top:12px;color:var(--muted);font-size:15px}
  .cycle{display:flex;align-items:center;justify-content:center;gap:13px}
  .cycle span{background:#eef5ff;color:#245080;border:1px solid #c8dcf7;border-radius:999px;padding:16px 22px;font-size:20px;font-weight:800}
  .cycle b{color:var(--cyan);font-size:25px}
  .prompt-shrink{display:grid;grid-template-columns:1.7fr 70px 1fr;align-items:center;gap:20px}
  .long-prompt{border:1px solid var(--line);background:#f4f7fb;border-radius:14px;padding:23px;font-family:var(--mono);font-size:16px;line-height:1.5;color:#5c6b7e}
  .prompt-shrink>b{text-align:center;color:var(--cyan);font-size:30px}
  .short-command{border-radius:15px;padding:28px;background:var(--navy2);color:#7edcff;font:850 30px var(--mono);text-align:center;box-shadow:0 18px 42px #0a19302a}
  .meme-handshake{background:linear-gradient(145deg,#f8fbff,#edf6ff)}
  .meme-handshake .slide-body{margin-top:4px}
  .handshake-meme{text-align:center}
  .handshake-frame{position:relative;width:620px;margin:0 auto;border-radius:18px;overflow:hidden;box-shadow:0 22px 54px #09182d36;border:1px solid #b9c9da;background:#fff}
  .handshake-frame img{display:block;width:100%}
  .hand-label{position:absolute;z-index:2;color:#fff;font-size:23px;font-weight:900;line-height:1.05;background:#071426dc;border-radius:10px;padding:9px 12px;box-shadow:0 6px 18px #0003}
  .hand-label small{font-size:12px;color:#dce8f5}.hand-label.left{left:22px;bottom:34px}.hand-label.right{right:22px;bottom:34px}.hand-label.center{left:50%;top:18px;transform:translateX(-50%);width:max-content;color:#fff3c4;font-size:20px}
  .handshake-meme figcaption{font-size:22px;font-weight:850;color:var(--ink);margin-top:8px}.handshake-meme>small{margin-top:3px}
  .model-role-grid{display:grid;grid-template-columns:1fr 70px 1fr;align-items:center;gap:18px}
  .model-role-grid>b{font-size:38px;color:var(--cyan);text-align:center}
  .model-role{padding:25px 30px;border-radius:18px;background:#f3f7fc;border:1px solid var(--line)}
  .model-role.plan{border-left:7px solid var(--blue)}.model-role.execute{border-left:7px solid var(--amber)}
  .model-role>span{display:block;font-size:13px;letter-spacing:.14em;font-weight:900;color:var(--muted)}
  .model-role>strong{display:block;margin:7px 0 13px;font-size:37px;color:var(--ink)!important}
  .model-role ul{margin:0;padding-left:21px;color:#344962;font-size:18px;line-height:1.55}
  .layer-stack{display:flex;flex-direction:column;gap:12px;width:850px;margin:0 auto}
  .layer-stack>div{display:grid;grid-template-columns:240px 1fr;align-items:center;border-radius:14px;padding:20px 26px;background:#f2f6fb;border-left:8px solid var(--blue)}
  .layer-stack>div:nth-child(2){margin-left:70px;border-left-color:var(--cyan)}.layer-stack>div:nth-child(3){margin-left:140px;border-left-color:var(--amber)}
  .layer-stack strong{font-size:24px;color:var(--ink)!important}.layer-stack span{font-size:19px;color:var(--muted)}
  .architecture{display:flex;align-items:center;justify-content:center;gap:22px}
  .architecture>div{width:260px;border-radius:17px;padding:28px;text-align:center;font-size:25px;font-weight:850}
  .architecture>div small{display:block;font-size:14px;line-height:1.4;margin-top:8px;font-weight:650}
  .browser-box{background:#eef5ff;color:#1d4e89;border:1px solid #bfd8f7}.web-box{background:var(--blue);color:#fff}.db-box{background:#e9fbf4;color:#116149;border:1px solid #a7e3cf}
  .architecture>b{font-size:27px;color:var(--cyan)}
  .deployment{max-width:920px;margin:0 auto}.deployment>div{padding:28px}
  .deploy-command{width:720px;margin:24px auto 0;font-size:20px;padding:17px 24px;text-align:center}
  .split-def{display:grid;grid-template-columns:1fr 1fr;gap:26px}
  .split-def>div{padding:32px;border-radius:18px;background:#f2f6fb;border:1px solid var(--line)}
  .split-def>div:last-child{background:linear-gradient(145deg,#eaf2ff,#e6fbff);border-color:#b7dded}
  .split-def span{display:block;color:var(--muted);font-size:15px;font-weight:750}.split-def strong{display:block;font-size:42px;margin:12px 0;color:var(--ink)!important}.split-def p{font-size:19px;color:#3d5069}
  .loop-layout{display:grid;grid-template-columns:.72fr 1.28fr;gap:34px;align-items:center}
  .handoff-list{display:flex;flex-direction:column;gap:9px;padding:24px 27px;border-left:7px solid var(--amber);background:#fff8e9;border-radius:0 16px 16px 0}
  .handoff-list span{font-size:15px;color:#8a5a16;font-weight:800}.handoff-list strong{font-size:21px;color:#263a54!important}
  .loop-ring{display:flex;align-items:center;justify-content:center;gap:8px;padding:34px 20px;border-radius:999px;background:linear-gradient(135deg,#eaf2ff,#e5fbff);border:2px solid #a7dceb}
  .loop-ring span{background:#fff;border:1px solid #c9ddf2;border-radius:999px;padding:15px 18px;color:#1d4e89;font-size:18px;font-weight:850}
  .loop-ring b{font-size:25px;color:var(--cyan)}
  .remote-setup ol.steps{gap:8px}
  .remote-setup ol.steps li{font-size:20px;line-height:1.32}
  .remote-setup ol.steps li::before{width:38px;height:38px}
  .remote-setup .slide-body>p:last-child{margin-top:10px;font-size:17px}
  .ops-check{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
  .ops-check>div{height:165px;border:2px dashed #cbd5e1;border-radius:16px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:12px;background:#f8fafc;color:#7b8797}
  .ops-check>div.done{border-style:solid;border-color:#83d2bc;background:#e9fbf4;color:#137052}
  .ops-check span{font-size:35px;font-weight:900}.ops-check strong{font-size:20px;color:inherit!important}
  .project-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}
  .project-column{padding:29px 31px;border-radius:18px;background:#f4f8fc;border:1px solid var(--line);border-top:6px solid var(--blue)}
  .project-column:nth-child(2){border-top-color:var(--cyan)}
  .project-column>strong{font-size:27px;color:var(--ink)!important}
  .project-column ul{margin:18px 0 22px;padding-left:22px;color:#334963;font-size:18px;line-height:1.55}
  .project-column a{display:inline-block;padding:10px 14px;border-radius:9px;background:#e6efff;color:#1d4ed8;font-size:16px;font-weight:850;text-decoration:none}
  .threads-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:34px}
  .threads-grid>div{padding:27px 30px;border-radius:18px;background:#f4f8fc;border:1px solid var(--line)}
  .threads-grid>div:last-child{background:#edf8fb;border-color:#b9e5ee}
  .threads-grid strong{font-size:25px;color:var(--ink)!important}
  .threads-grid ul{margin:18px 0 0;padding-left:22px;color:#344962;font-size:18px;line-height:1.65}
  .account-list a{font-family:var(--mono);font-weight:850;text-decoration:none}
  .closing{display:flex;flex-direction:column;gap:18px}
  .closing p{font-size:37px!important;color:#263a54!important;margin:0!important}
  .closing p strong{color:var(--blue)!important}
  .closing-mark{margin-top:20px;padding:20px 24px;border-left:6px solid var(--amber);background:#fff8e6;color:#7b430a;font-size:23px;font-weight:800}
  #appendix-03 pre{font-size:16px;line-height:1.38;padding:18px 22px}
  aside.notes{display:none}
  .notes-panel{position:fixed;z-index:50;left:0;right:0;bottom:0;max-height:44vh;overflow:auto;background:#071221f5;color:#dce8f7;border-top:3px solid var(--cyan);padding:20px 30px;font-size:15px;line-height:1.6;display:none;backdrop-filter:blur(5px)}
  .notes-panel.show{display:block}.notes-panel p{margin:0 0 8px}.notes-panel ul{margin:7px 0 0;padding-left:22px}.notes-panel a{color:#78d9ff}.note-sources{margin-top:13px;padding-top:12px;border-top:1px solid #28415f}.note-sources h6{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#78d9ff;margin:0 0 8px}
  .controls{position:fixed;right:16px;top:13px;z-index:40;display:flex;gap:8px;color:#8ea5c2;font-size:12px;align-items:center}
  .controls kbd{border:1px solid #334b69;background:#172940;color:#dbe8f7;border-radius:6px;padding:3px 7px;font:700 11px var(--sans)}
  .overview{position:fixed;inset:0;z-index:60;display:none;background:#050b14ed;padding:28px;overflow:auto}
  .overview.show{display:grid;grid-template-columns:repeat(4,minmax(220px,1fr));gap:14px}
  .overview button{appearance:none;text-align:left;border:1px solid #2b415d;background:#0d1b2d;color:#dce8f7;border-radius:12px;padding:14px;min-height:110px;cursor:pointer;font:700 14px/1.4 var(--sans)}
  .overview button:hover{border-color:#52c7ff;background:#132842}.overview button small{display:block;color:#6f8bae;margin-bottom:7px}
  .slide:not(.active){display:none}
  @media(max-width:900px){.controls{display:none}}
  @media print{
    @page{size:1280px 720px;margin:0}
    body{overflow:visible;background:#fff}.deck{position:static;background:#fff}.stage{position:static;transform:none!important;width:1280px;height:auto;box-shadow:none;border-radius:0}
    .slide{display:flex!important;position:relative;width:1280px;height:720px;page-break-after:always;break-after:page}
    .controls,.notes-panel,.overview{display:none!important}
  }
</style>
</head>
<body>
<div class="controls"><span>이동 <kbd>←</kbd><kbd>→</kbd></span><span>노트 <kbd>N</kbd></span><span>목록 <kbd>O</kbd></span><span>전체화면 <kbd>F</kbd></span></div>
<div class="deck"><div class="stage" id="stage">${renderedSlides}</div></div>
<div class="notes-panel" id="notesPanel" aria-live="polite"></div>
<div class="overview" id="overview" aria-label="슬라이드 목록"></div>
<script>
  const slides=[...document.querySelectorAll('.slide')];
  const stage=document.getElementById('stage');
  const notesPanel=document.getElementById('notesPanel');
  const overview=document.getElementById('overview');
  let current=Math.max(0,Math.min(slides.length-1,Number(location.hash.replace('#',''))-1||0));
  function fit(){
    const scale=Math.min(innerWidth/1280,innerHeight/720);
    document.documentElement.style.setProperty('--scale',scale);
  }
  function show(index,{updateHash=true}={}){
    current=Math.max(0,Math.min(slides.length-1,index));
    slides.forEach((slide,i)=>{
      slide.classList.toggle('active',i===current);
      slide.style.setProperty('--progress',((i+1)/slides.length*100).toFixed(2));
    });
    if(updateHash) history.replaceState(null,'','#'+(current+1));
    const note=slides[current].querySelector('aside.notes');
    notesPanel.innerHTML=note?note.innerHTML:'';
    const currentTitle=slides[current].querySelector('.title')?.textContent?.trim()||'KOICA AI·데이터 활용';
    document.title=(current+1)+'/'+slides.length+' · '+currentTitle;
  }
  function toggleNotes(){notesPanel.classList.toggle('show')}
  function toggleOverview(){
    overview.classList.toggle('show');
    if(!overview.childElementCount){
      slides.forEach((slide,i)=>{
        const button=document.createElement('button');
        button.innerHTML='<small>'+(i+1)+' / '+slides.length+'</small>'+(slide.querySelector('.title')?.textContent?.trim()||'표지');
        button.addEventListener('click',()=>{overview.classList.remove('show');show(i)});
        overview.appendChild(button);
      });
    }
  }
  addEventListener('keydown',(event)=>{
    if(event.key==='ArrowRight'||event.key==='PageDown'||event.key===' '){event.preventDefault();show(current+1)}
    if(event.key==='ArrowLeft'||event.key==='PageUp'){event.preventDefault();show(current-1)}
    if(event.key.toLowerCase()==='n')toggleNotes();
    if(event.key.toLowerCase()==='o')toggleOverview();
    if(event.key.toLowerCase()==='f')document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
    if(event.key==='Home')show(0);
    if(event.key==='End')show(slides.length-1);
    if(event.key==='Escape'){notesPanel.classList.remove('show');overview.classList.remove('show')}
  });
  addEventListener('resize',fit);
  addEventListener('hashchange',()=>show(Number(location.hash.replace('#',''))-1,{updateHash:false}));
  fit();show(current);
</script>
</body>
</html>`;

const normalizedHtml = html.replace(/[ \t]+$/gm, "");
fs.writeFileSync(outputPath, normalizedHtml);
console.log(`Wrote ${outputPath}`);
console.log(`Slides: ${slides.length}`);
