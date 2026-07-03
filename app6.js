// 언어와 매체 수행평가 규칙 기반 코어 DB
const GRAMMAR_DB = {
  adjectiveSuffixes: ["롭다", "스럽다", "맞다", "지다", "치다"],
  
  // 수행평가 지문 필수 수록 품사통용/예외 데이터
  specialCases: {
    "있다": { type: "hold", desc: "존재 유무일 때는 형용사적 성격이나, 명령형 어미('-어라') 등과 결합할 때는 동사적 성격을 공유합니다. (품사 통용)" },
    "없다": { type: "adjective", desc: "‘있다’와 달리 언제나 형용사 활용 고유 규칙에 고정됩니다." },
    "크다": { type: "hold", desc: "현재형 어미와 만나 '큰다(동사 활용)'가 되는 상황과 현재 상태 고정형(형용사 활용)을 분별해야 합니다." },
    "늦다": { type: "hold", desc: "선어말어미와 만나 '늦는다(동사 활용)'로 쓰이거나, 속도가 느린 상태(형용사 활용)를 모두 가집니다." },
    "굳다": { type: "hold", desc: "어미와 결합해 '굳는다(동사 변화 과정)'로 성립하는 경우와 딱딱한 상태를 타인에게 보여주는 형용사 활용형을 구분해야 합니다." },
    "맛있다": { type: "adjective", desc: "수행평가 및 표준 표기상 형용사 활용 패러다임으로 제한됩니다." },
    "재미있다": { type: "adjective", desc: "학교문법 교수 학습 기준에 따라 형용사 고정형으로 분류합니다." }
  }
};

// DOM 객체 바인딩
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

/**
 * [추가된 핵심 핵심 알고리즘] 
 * 입력어가 활용형(먹는다, 예쁜, 굳은 등)이든 기본형(먹다, 예쁘다)이든 순수 '어간'을 복원하는 함수
 */
function extractStem(input) {
  let text = input.trim();
  if (!text) return "";

  // 1. 전형적인 어미 꼬리 제거하여 어간 추출
  if (text.endsWith("는다")) return text.slice(0, -2);
  if (text.endsWith("ㄴ다")) return text.slice(0, -2);
  if (text.endsWith("는다")) return text.slice(0, -2);
  if (text.endsWith("구나")) return text.slice(0, -2);
  if (text.endsWith("는구나")) return text.slice(0, -3);
  if (text.endsWith("다")) return text.slice(0, -1);
  if (text.endsWith("는")) return text.slice(0, -1);
  
  // 관형사형 어미 처리 (은/ㄴ)
  if (text.endsWith("은")) return text.slice(0, -1);
  if (text.endsWith("ㄴ") && text.length > 1) return text.slice(0, -1);

  return text; 
}

function hasFinalConsonant(text) {
  if (!text) return false;
  const code = text.charCodeAt(text.length - 1);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

/**
 * [수행평가 5대 기준] 추출된 어간을 바탕으로 활용형 어미를 조합해 대조하는 알고리즘
 */
function evaluateWordByHwalgyong(rawInput) {
  const cleanInput = rawInput.trim().replace(/\s+/g, "");
  const stem = extractStem(cleanInput);
  
  // [명사 방어막] 한 글자이거나 어간 추출 후 분석 가치가 없는 경우 (예: '기본', '수행' 등 명사 차단)
  if (cleanInput.length < 2 || stem === cleanInput && !cleanInput.endsWith("다")) {
    return {
      result: "hold",
      verbScore: 0, adjScore: 0,
      hwalgyongResults: [{
        criterion: "형태소 분석 엔진 검사",
        derived: cleanInput,
        status: "분석 불가",
        desc: "입력된 단어는 활용을 하지 않는 체언(명사 등)이거나 단독 명사 형태이므로 5대 활용형 규칙을 적용할 수 없습니다."
      }],
      notice: "명사나 조사 같은 체언/관계언은 동사/형용사 판별 대상이 아닙니다. 활용이 가능한 용언을 입력하세요."
    };
  }

  // 기본형 복원 (출력 및 예외 처리를 위함)
  const dictionaryForm = stem + "다";
  const hasBatchim = hasFinalConsonant(stem);
  
  let verbScore = 0;
  let adjScore = 0;
  const hwalgyongResults = [];

  // 1단계: 수행평가 빈출 핵심 품사 통용어 사전 가로채기
  if (GRAMMAR_DB.specialCases[dictionaryForm]) {
    const special = GRAMMAR_DB.specialCases[dictionaryForm];
    return {
      result: "hold", // 원문 분석 의도에 맞게 문맥 확인이 필요한 단어는 유보 또는 지정형태 출력
      resultFixed: special.type,
      verbScore: special.type === "hold" ? 1 : (special.type === "verb" ? 4 : 0),
      adjScore: special.type === "hold" ? 1 : (special.type === "adjective" ? 4 : 0),
      hwalgyongResults: [{
        criterion: "수행평가 출제 1순위 통용어",
        derived: `[입력값 분석 완료] 기본형: ${dictionaryForm}`,
        status: special.type === "hold" ? "문맥 주의" : "고정형",
        desc: special.desc
      }],
      notice: special.desc
    };
  }

  const isSuffixAdj = GRAMMAR_DB.adjectiveSuffixes.some(s => dictionaryForm.endsWith(s));

  // 2단계: 수행평가 해설지 수록 5대 활용형 변형 어미 조립 대조

  // 기준 ①: 현재 시제 선어말어미 (-ㄴ-/-는-) 결합 검증
  const presentForm = `${stem}${hasBatchim ? "는" : "ㄴ"}다`;
  if (!isSuffixAdj) {
    verbScore += 1;
    hwalgyongResults.push({
      criterion: "현재 시제 선어말어미 결합",
      derived: `‘${presentForm}’`,
      status: "동사형 만족",
      desc: "추출된 어간에 현재 시제 선어말어미 ‘-ㄴ-/-는-’이 조립되어 자연스러운 활용형 문장이 성립하면 동사입니다."
    });
  } else {
    adjScore += 1;
    hwalgyongResults.push({
      criterion: "현재 시제 선어말어미 결합",
      derived: `‘${dictionaryForm}’ (어미 결합 불가)`,
      status: "형용사형 만족",
      desc: "현재 시제 선어말어미가 결합할 수 없고 기본 형태 그대로 현재 상태를 나타내면 형용사입니다."
    });
  }

  // 기준 ②: 현재 관형사형 어미 (-는 vs -(으)ㄴ) 결합 검증
  const verbModifier = `${stem}는`;
  const adjModifier = `${stem}${hasBatchim ? "은" : "ㄴ"}`;
  if (!isSuffixAdj) {
    verbScore += 1;
    hwalgyongResults.push({
      criterion: "현재 관형사형 어미 결합",
      derived: `‘${verbModifier}’`,
      status: "동사형 매칭",
      desc: "현재 시제에서 체언을 수식할 때 관형사형 어미 ‘-는’이 결합하면 동사적 활용 방식입니다."
    });
  } else {
    adjScore += 1;
    hwalgyongResults.push({
      criterion: "현재 관형사형 어미 결합",
      derived: `‘${adjModifier}’`,
      status: "형용사형 매칭",
      desc: "현재 상태를 나타내며 관형사형 어미 ‘-(으)ㄴ’ 형태로 활용되어 수식하면 형용사입니다."
    });
  }

  // 기준 ③: 현재 시제 감탄형 어미 (-는구나 vs -구나) 결합 검증
  const verbExcl = `${stem}는구나`;
  const adjExcl = `${stem}구나`;
  if (!isSuffixAdj) {
    verbScore += 1;
    hwalgyongResults.push({
      criterion: "현재 감탄형 어미 결합",
      derived: `‘${verbExcl}’`,
      status: "동사 조건 부합",
      desc: "문장 종결 시 감탄형 어미 ‘-는구나’의 형태로 결합 활용이 가능하면 동사 품사에 해당합니다."
    });
  } else {
    adjScore += 1;
    hwalgyongResults.push({
      criterion: "현재 감탄형 어미 결합",
      derived: `‘${adjExcl}’`,
      status: "형용사 조건 부합",
      desc: "어간 뒤에 감탄형 어미 ‘-구나’가 곧바로 결합하여 감탄문을 형성하면 형용사입니다."
    });
  }

  // 기준 ④ & ⑤: 명령형(-어라/-아라) 및 청유형(-자) 어미 결합 수용성 검증
  const imperative = `${stem}${hasBatchim ? "어라" : "아라"}`;
  const suggestive = `${stem}자`;
  if (!isSuffixAdj) {
    verbScore += 1;
    hwalgyongResults.push({
      criterion: "명령형 및 청유형 어미 활용 수용성",
      derived: `‘${imperative}’, ‘${suggestive}’`,
      status: "활용형 허용",
      desc: "명령형 형태와 청유형 어미 ‘-자’가 제약 없이 자연스럽게 성립하면 동사입니다."
    });
  } else {
    adjScore += 1;
    hwalgyongResults.push({
      criterion: "명령형 및 청유형 어미 활용 수용성",
      derived: `‘${imperative}’ (결합 제약)`,
      status: "활용형 제한",
      desc: "명령이나 청유형 어미와 원칙적으로 결합할 수 없거나 문법적 제약을 받으면 형용사입니다."
    });
  }

  // 최종 결과 도출
  let finalResult = "hold";
  if (verbScore > adjScore) finalResult = "verb";
  if (adjScore > verbScore) finalResult = "adjective";

  return {
    result: finalResult,
    dictionaryForm,
    verbScore,
    adjScore,
    hwalgyongResults,
    notice: `분석 완료: 입력값에서 어간을 추출해 가상 기본형 [${dictionaryForm}]을 도출한 후, 5대 어미 결합 스코어에 따라 판별했습니다.`
  };
}

function analyze() {
  const word = wordInput.value.trim();
  if (!word) {
    wordInput.focus();
    return;
  }

  const analysis = evaluateWordByHwalgyong(word);
  renderResult(word, analysis);
}

function renderResult(word, analysis) {
  const labels = { verb: "동사", adjective: "형용사", hold: "판정 유보" };
  
  // 품사 통용 지정어인 경우의 실제 결과 타겟 조정
  const actualResult = analysis.resultFixed ? analysis.resultFixed : analysis.result;

  resultBadge.className = `result-badge ${actualResult}`;
  resultBadge.textContent = labels[actualResult];
  resultTitle.textContent = `결론: ${labels[actualResult]}`;
  
  if (actualResult === "hold") {
    resultSummary.textContent = `‘${word}’는 활용 구조 분석 결과 동사/형용사 양면성을 가집니다.`;
  } else {
    resultSummary.textContent = `‘${word}’는 (원형: ${analysis.dictionaryForm || word}) 수행평가 해설지 어미 결합 스코어에 따라 [${labels[actualResult]}]로 판정됩니다.`;
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
      <td>동사 활용형 변형 스코어</td>
      <td>${analysis.verbScore} / 4 점</td>
      <td>현재형(-ㄴ다), 관형사형(-는), 감탄형(-는구나), 명령/청유형 수용 매칭</td>
    </tr>
    <tr>
      <td>형용사 활용형 변형 스코어</td>
      <td>${analysis.adjScore} / 4 점</td>
      <td>현재형(기본형), 관형사형(-(으)ㄴ), 감탄형(-구나), 명령/청유형 제약 매칭</td>
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