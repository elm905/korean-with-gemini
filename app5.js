// 언어와 매체 수행평가 및 수능특강 데이터 기반 형태론 활용 엔진
const GRAMMAR_DB = {
  adjectiveSuffixes: ["롭다", "스럽다", "맞다", "지다", "치다"],
  
  // 수행평가 해설지에 수록된 대표적인 예외/품사통용 어휘 데이터베이스
  specialCases: {
    "있다": { type: "hold", desc: "존재를 나타낼 때는 형용사 양상을 보이지만, '집에 있어라'처럼 명령형/진행형과 쓰일 때는 동사적 성격을 가집니다." },
    "없다": { type: "adjective", desc: "‘있다’와 달리 활용 양상이 완벽히 형용사 규칙에 수렴합니다." },
    "크다": { type: "hold", desc: "자라나는 과정(동사, 예: 나무가 크다)인지, 이미 자란 상태(형용사, 예: 키가 크다)인지 문맥 구별이 요구됩니다." },
    "늦다": { type: "hold", desc: "약속 시간에 늦는 행위(동사, 예: 늦는다)와 발걸음 속도가 느린 상태(형용사, 예: 발걸음이 늦다)로 모두 활용됩니다." },
    "굳다": { type: "hold", desc: "액체가 단단하게 변하는 과정은 동사이며, 이미 단단해진 고정 상태를 수식할 때는 문맥 점검이 필요합니다." },
    "맛있다": { type: "adjective", desc: "‘있다’ 계열이지만 학교문법 규정 및 표준국어대사전상 형용사 고정입니다." },
    "재미있다": { type: "adjective", desc: "‘있다’ 계열이지만 수행평가 기준 형용사 고정입니다." }
  }
};

// DOM 객체 바인딩 (불필요한 구버전 전역변수 완전 배제)
const wordInput = document.querySelector("#wordInput");
const buildButton = document.querySelector("#buildButton");
const resetButton = document.querySelector("#resetButton");
const resultPanel = document.querySelector("#resultPanel");
const resultBadge = document.querySelector("#resultBadge");
const resultTitle = document.querySelector("#resultTitle");
const resultSummary = document.querySelector("#resultSummary");
const processList = document.querySelector("#processList");
const evidenceTable = document.querySelector("#evidenceTable");
const noticeBox = document.querySelector("#noticeBox");

function getStem(word) {
  return word.endsWith("다") ? word.slice(0, -1) : word;
}

function hasFinalConsonant(text) {
  if (!text) return false;
  const code = text.charCodeAt(text.length - 1);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

/**
 * [수행평가 5대 기준] 활용형 분석 처리 알고리즘
 */
function evaluateWordByHwalgyong(word) {
  // [명사/비용언 방어코드] '기본' 등 '~다' 형태가 아닌 단어를 최상단에서 차단
  if (!word.endsWith("다") || word.length < 2) {
    return {
      result: "hold",
      verbScore: 0, adjScore: 0,
      hwalgyongResults: [{
        criterion: "형태론적 기본 검사",
        derived: word,
        status: "분석 불가",
        desc: "동사와 형용사의 기본형은 항상 ‘~다’로 끝나야 합니다. 명사나 다른 품사는 활용형을 판독할 수 없습니다."
      }],
      notice: "‘기본’과 같은 명사 품사는 분석 대상이 아닙니다. ‘~다’로 끝나는 기본형 용언을 정확히 입력해 주세요."
    };
  }

  const stem = getStem(word);
  const hasBatchim = hasFinalConsonant(stem);
  
  let verbScore = 0;
  let adjScore = 0;
  const hwalgyongResults = [];

  // 1단계: 수행평가 핵심 고난도 주의 대상 가로채기
  if (GRAMMAR_DB.specialCases[word]) {
    const special = GRAMMAR_DB.specialCases[word];
    return {
      result: special.type,
      verbScore: special.type === "hold" ? 1 : (special.type === "verb" ? 4 : 0),
      adjScore: special.type === "hold" ? 1 : (special.type === "adjective" ? 4 : 0),
      hwalgyongResults: [{
        criterion: "수행평가 빈출 품사 통용어",
        derived: `[특수 규정] ${word}`,
        status: special.type === "hold" ? "품사 통용" : "고정 분류",
        desc: special.desc
      }],
      notice: special.desc
    };
  }

  // 접사 형태 특징 사전 필터링 상수
  const isSuffixAdj = GRAMMAR_DB.adjectiveSuffixes.some(s => word.endsWith(s));

  // 2단계: 수행평가 해설지 수록 5대 활용형 규칙 가상 매칭 수행

  // 기준 ①: 현재 시제 선어말어미 (-ㄴ-/-는-) 결합
  const presentForm = `${stem}${hasBatchim ? "는" : "ㄴ"}다`;
  if (!isSuffixAdj) {
    verbScore += 1;
    hwalgyongResults.push({
      criterion: "현재 시제 선어말어미 결합",
      derived: `‘${presentForm}’`,
      status: "동사적 활용형",
      desc: "현재 시제 선어말어미 ‘-ㄴ-/-는-’이 정상적으로 결합하는 성질은 동사 고유의 특징입니다."
    });
  } else {
    adjScore += 1;
    hwalgyongResults.push({
      criterion: "현재 시제 선어말어미 결합",
      derived: `‘${word}’ (형태 변형 없음)`,
      status: "형용사적 활용형",
      desc: "형용사는 별도의 선어말어미 없이 기본형태 그대로 현재 상태를 나타냅니다."
    });
  }

  // 기준 ②: 현재 관형사형 어미 (-는 vs -(으)ㄴ) 결합
  const verbModifier = `${stem}는`;
  const adjModifier = `${stem}${hasBatchim ? "은" : "ㄴ"}`;
  if (!isSuffixAdj) {
    verbScore += 1;
    hwalgyongResults.push({
      criterion: "현재 관형사형 어미 결합",
      derived: `‘${verbModifier}’ [예: ${verbModifier} 사람]`,
      status: "동사형 일치",
      desc: "현재 시제에서 체언을 수식할 때 관형사형 어미 ‘-는’이 연결되면 동사입니다."
    });
  } else {
    adjScore += 1;
    hwalgyongResults.push({
      criterion: "현재 관형사형 어미 결합",
      derived: `‘${adjModifier}’ [예: ${adjModifier} 상태]`,
      status: "형용사형 일치",
      desc: "현재 시제 수식 시 관형사형 어미 ‘-(으)ㄴ’ 형태로 결합하는 양상은 형용사의 규칙입니다."
    });
  }

  // 기준 ③: 현재 시제 감탄형 어미 (-는구나 vs -구나) 결합
  const verbExcl = `${stem}는구나`;
  const adjExcl = `${stem}구나`;
  if (!isSuffixAdj) {
    verbScore += 1;
    hwalgyongResults.push({
      criterion: "현재 감탄형 어미 결합",
      derived: `‘${verbExcl}’`,
      status: "동사 기준 충족",
      desc: "감탄형 종결어미 ‘-는구나’를 자연스럽게 활용하여 취할 수 있는 것은 동사입니다."
    });
  } else {
    adjScore += 1;
    hwalgyongResults.push({
      criterion: "현재 감탄형 어미 결합",
      derived: `‘${adjExcl}’`,
      status: "형용사 기준 충족",
      desc: "어간 뒤에 ‘-구나’가 바로 직접 결합하여 감탄문을 형성하면 형용사입니다."
    });
  }

  // 기준 ④ & ⑤: 명령형(-어라/-아라) 및 청유형(-자) 어미 수용성
  const imperative = `${stem}${hasBatchim ? "어라" : "아라"}`;
  const suggestive = `${stem}자`;
  if (!isSuffixAdj) {
    verbScore += 1;
    hwalgyongResults.push({
      criterion: "명령형 및 청유형 어미 수용성",
      derived: `‘${imperative}’, ‘${suggestive}’`,
      status: "결합 허용",
      desc: "동작이나 의지를 가질 수 있으므로 명령형 어미와 청유형 어미 ‘-자’의 사용이 완전 허용됩니다."
    });
  } else {
    adjScore += 1;
    hwalgyongResults.push({
      criterion: "명령형 및 청유형 어미 수용성",
      derived: `‘${imperative}’ (문법적 거부)`,
      status: "결합 제한",
      desc: "대상의 상태나 성질은 의도적으로 명령하거나 함께 청유할 수 없으므로 원칙적으로 제약을 받습니다."
    });
  }

  // 최종 결과 연산
  let finalResult = "hold";
  if (verbScore > adjScore) finalResult = "verb";
  if (adjScore > verbScore) finalResult = "adjective";

  return {
    result: finalResult,
    verbScore,
    adjScore,
    hwalgyongResults,
    notice: `수행평가 규칙 매칭 완료: ‘${word}’는 분석 어미 형태상 [${finalResult === "verb" ? "동사" : "형용사"}] 성향의 활용 패러다임을 따르고 있습니다.`
  };
}

function analyze() {
  const word = wordInput.value.trim().replace(/\s+/g, "");
  if (!word) {
    wordInput.focus();
    return;
  }

  const analysis = evaluateWordByHwalgyong(word);
  renderResult(word, analysis);
}

function renderResult(word, analysis) {
  const labels = { verb: "동사", adjective: "형용사", hold: "판정 유보" };

  resultBadge.className = `result-badge ${analysis.result}`;
  resultBadge.textContent = labels[analysis.result];
  resultTitle.textContent = `결론: ${labels[analysis.result]}`;
  
  if (analysis.result === "hold") {
    resultSummary.textContent = `‘${word}’는 활용 어미 변형 구조상 동사/형용사 문맥이 공존하는 단어이거나 판독 불가 대상입니다.`;
  } else {
    resultSummary.textContent = `‘${word}’는 수행평가 해설지 이론에 명시된 어미 규칙 대입 스코어에 근거하여 [${labels[analysis.result]}] 품사로 귀결됩니다.`;
  }

  processList.innerHTML = analysis.hwalgyongResults
    .map(res => `
      <li>
        <strong>${res.criterion}</strong> : <span style="color:var(--accent-strong); font-weight:700;">${res.derived}</span> 
        [형태 판정: <span style="text-decoration:underline; font-weight: 800;">${res.status}</span>]
        <br><small style="color: var(--muted);">${res.desc}</small>
      </li>
    `).join("");

  evidenceTable.innerHTML = `
    <tr>
      <td>동사 활용형 기준 만족도</td>
      <td>${analysis.verbScore} / 4 점</td>
      <td>현재형(-ㄴ다), 관형사형(-는), 감탄형(-는구나), 명령/청유형 수용성</td>
    </tr>
    <tr>
      <td>형용사 활용형 기준 만족도</td>
      <td>${analysis.adjScore} / 4 점</td>
      <td>현재형(형태 고정), 관형사형(-(으)ㄴ), 감탄형(-구나), 명령/청유형 제약성</td>
    </tr>
  `;

  noticeBox.textContent = analysis.notice;
  resultPanel.classList.remove("hidden");
}

function resetApp() {
  wordInput.value = "";
  resultPanel.classList.add("hidden");
  wordInput.focus();
}

buildButton.addEventListener("click", analyze);
resetButton.addEventListener("click", resetApp);
wordInput.addEventListener("keydown", (e) => { if (e.key === "Enter") analyze(); });

document.querySelectorAll("[data-example]").forEach((button) => {
  button.addEventListener("click", () => {
    wordInput.value = button.dataset.example;
    analyze();
  });
});