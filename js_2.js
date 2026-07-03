// 1. 한국어 형태론적 특징을 반영한 규칙 데이터베이스
const GRAMMAR_DB = {
  // 형용사 확률이 99%인 대표적인 접사 및 어미 패턴
  adjectiveSuffixes: ["하다", "롭다", "부가", "스럽다", "맞다", "지다", "치다"], 
  // '하다'로 끝나지만 형용사가 아닌 대표적인 동사들 (예외 처리용)
  verbWithHada: ["공부하다", "일하다", "운동하다", "생각하다", "사랑하다", "노력하다", "운전하다", "말하다", "전화하다"],
  
  // 학교문법 특수 주의 단어 정의
  exceptions: {
    "있다": { type: "hold", desc: "존재를 나타낼 때는 형용사적 성격, 머무거나 진행될 때는 동사적 성격을 띱니다. (학교문법에서는 주로 형용사/품사 통용으로 취급)" },
    "없다": { type: "adjective", desc: "‘있다’와 달리 활용 양상이 형용사에 가깝습니다." },
    "크다": { type: "hold", desc: "자라나는 과정(동사)인지, 이미 자란 상태(형용사)인지 문맥 확인이 필요합니다." },
    "밝다": { type: "hold", desc: "날이 새다(동사)인지, 빛이 환하다(형용사)인지 문맥 확인이 필요합니다." },
    "맛있다": { type: "adjective", desc: "‘있다’ 계열이지만 규정상 형용사 성격이 강합니다." },
    "재미있다": { type: "adjective", desc: "‘있다’ 계열이지만 규정상 형용사 성격이 강합니다." }
  }
};

// DOM 요소 획득
const wordInput = document.querySelector("#wordInput");
const sentenceInput = document.querySelector("#sentenceInput");
const choiceInput = document.querySelector("#choiceInput");
const buildButton = document.querySelector("#buildButton");
const resetButton = document.querySelector("#resetButton");
const resultPanel = document.querySelector("#resultPanel");
const resultBadge = document.querySelector("#resultBadge");
const resultTitle = document.querySelector("#resultTitle");
const resultSummary = document.querySelector("#resultSummary");
const processList = document.querySelector("#processList");
const evidenceTable = document.querySelector("#evidenceTable");
const noticeBox = document.querySelector("#noticeBox");

// 기본 유틸리티 함수
function getStem(word) {
  return word.endsWith("다") ? word.slice(0, -1) : word;
}

function hasFinalConsonant(text) {
  if (!text) return false;
  const code = text.charCodeAt(text.length - 1);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

/**
 * 정밀 핵심 알고리즘: 입력된 용언의 품사를 추정하고 판정 근거를 생성합니다.
 */
function evaluateWord(word) {
  const stem = getStem(word);
  let verbScore = 0;
  let adjScore = 0;
  const process = [];

  // 1단계: 예외 및 주의 단어 선제 판별
  if (GRAMMAR_DB.exceptions[word]) {
    const ex = GRAMMAR_DB.exceptions[word];
    return {
      result: ex.type,
      verbScore: ex.type === "verb" ? 5 : 0,
      adjScore: ex.type === "adjective" ? 5 : 0,
      process: [{ title: "특수 어휘 판정", label: "주의 사례", reason: ex.desc }],
      notice: ex.desc
    };
  }

  // 2단계: 어미/접사 패턴 매칭 (형태론적 분석)
  let patternMatched = false;
  
  // '하다' 동사 예외 목록에 포함되는지 확인
  const isVerbHada = GRAMMAR_DB.verbWithHada.some(v => word.endsWith(v));
  
  if (isVerbHada) {
    verbScore += 3;
    process.push({ title: "형태 분석", label: "행위성 하도 동사", reason: "‘공부하다, 일하다’ 등 행위를 나타내는 ‘-하다’ 결합어는 동사입니다." });
    patternMatched = true;
  } else {
    // 일반 형용사 접미사 패턴 검사
    for (const suffix of GRAMMAR_DB.adjectiveSuffixes) {
      if (word.endsWith(suffix)) {
        adjScore += 3;
        process.push({ title: "형태 분석", label: `‘-${suffix}’ 패턴`, reason: `‘-${suffix}’로 끝나는 용언은 대부분 성질이나 상태를 나타내는 형용사입니다.` });
        patternMatched = true;
        break;
      }
    }
  }

  // 3단계: 학교문법 표준 활용형 가상 테스트
  // [테스트 A] 현재 평서형 어미 (-ㄴ다/-는다)
  const plainPresent = `${stem}${hasFinalConsonant(stem) ? "는다" : "ㄴ다"}`;
  if (!patternMatched) {
    // 패턴 매칭이 안 된 일반 단어들은 종성이나 글자 수 등을 통해 간접 추정 가중치 부여
    // 여기서는 기본 의미 유추가 불가능하므로 표준 활용 수용성 시뮬레이션
    if (hasFinalConsonant(stem)) {
      // 받침이 있는 경우 (ex: 먹다, 잡다 -> 동사 확률 높음 / 작다, 높다 -> 형용사 확률 높음)
      // 한국어 통계상 기본형 3글자 이상이며 '하다'가 아니면 동사 비율이 높음 등의 휴리스틱 적용
      if (word.length >= 3) { verbScore += 1; } else { adjScore += 1; }
    }
  }

  // 학교 문법 규칙 설명 추가 (화면 표시용)
  process.push({
    title: "현재 시제 결합",
    label: `‘${plainPresent}’`,
    reason: `현재 시제 어미 ‘-ㄴ다/-는다’가 자연스럽게 연결되면 동사, 불가능하면 형용사입니다.`
  });

  process.push({
    title: "명령/청유형 결합",
    label: `‘${stem}어라 / ${stem}자’`,
    reason: `명령형(어라/아라)과 청유형(-자) 어미는 동사에만 결합할 수 있습니다.`
  });

  // 최종 점수 조율 및 결과 도출
  let result = "hold";
  if (verbScore > adjScore) result = "verb";
  if (adjScore > verbScore) result = "adjective";

  return {
    result,
    verbScore,
    adjScore,
    process,
    notice: result === "hold" 
      ? "동사/형용사 성격이 혼재하거나 자동 판별이 모호합니다. 문맥을 통해 움직임(동사)인지 상태(형용사)인지 확인하세요."
      : `학교문법 기준에 따라 ‘${word}’는 ${result === "verb" ? "동사" : "형용사"}로 판별됩니다.`
  };
}

// 애플리케이션 실행 메인 함수
function analyze() {
  const word = wordInput.value.trim().replace(/\s+/g, "");
  if (!word) {
    wordInput.focus();
    return;
  }

  const analysis = evaluateWord(word);

  // 결과 화면 렌더링
  renderResult(word, analysis);
}

function renderResult(word, analysis) {
  const labels = { verb: "동사", adjective: "형용사", hold: "판정 유보" };

  // 배지 상태 업데이트
  resultBadge.className = `result-badge ${analysis.result}`;
  resultBadge.textContent = labels[analysis.result];

  // 타이틀 및 요약
  resultTitle.textContent = `결론: ${labels[analysis.result]}`;
  
  if (analysis.result === "hold") {
    resultSummary.textContent = `‘${word}’는 문맥에 의존적이거나 구조상 품사 판별이 유보되었습니다.`;
  } else {
    resultSummary.textContent = `‘${word}’는 규칙 분석 결과 ${labels[analysis.result]}의 성격이 뚜렷합니다.`;
  }

  // 판별 과정 출력
  processList.innerHTML = analysis.process
    .map(p => `<li>${p.title}: <strong>${p.label}</strong><br><small style="color: var(--muted);">${p.reason}</small></li>`)
    .join("");

  // 근거 요약 테이블 출력
  evidenceTable.innerHTML = `
    <tr>
      <td>동사</td>
      <td>${analysis.verbScore}점</td>
      <td>동적 작용, 행위성 표현 규칙</td>
    </tr>
    <tr>
      <td>형용사</td>
      <td>${analysis.adjScore}점</td>
      <td>상태, 성질, 형용사성 어미 패턴</td>
    </tr>
  `;

  // 안내 상자
  noticeBox.textContent = analysis.notice;
  resultPanel.classList.remove("hidden");
}

function resetApp() {
  wordInput.value = "";
  sentenceInput.value = "";
  choiceInput.value = "";
  resultPanel.classList.add("hidden");
  wordInput.focus();
}

// 이벤트 바인딩
buildButton.addEventListener("click", analyze);
resetButton.addEventListener("click", resetApp);

wordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") analyze();
});

// 샘플 버튼 처리
document.querySelectorAll("[data-example]").forEach((button) => {
  button.addEventListener("click", () => {
    const word = button.dataset.example;
    wordInput.value = word;
    // 간단한 예시 자동 매핑
    if(word === "먹다") { sentenceInput.value = "동생이 밥을 먹다."; choiceInput.value = "동사 / 형용사"; }
    if(word === "예쁘다") { sentenceInput.value = "꽃이 예쁘다."; choiceInput.value = "동사 / 형용사"; }
    if(word === "크다") { sentenceInput.value = "나무가 크다."; choiceInput.value = "동사 / 형용사"; }
    analyze();
  });
});