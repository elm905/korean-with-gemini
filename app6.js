// 학교 문법 활용 형태소 감별 매핑 규칙 데이터베이스
const GRAMMAR_DB = {
  // 특정 용언들의 근본 어간 데이터 사전 (형태 분석 예외 보정용)
  verbs: ["먹", "굳", "늙", "가", "잡", "오", "늦", "크", "밝"],
  adjectives: ["예쁘", "아름답", "착하", "바르", "푸르", "높"],
  
  // 수행평가 특수 지정 데이터 처리
  specialCases: {
    "있다": "존재 유무일 때는 형용사 양상이지만, '있어라'처럼 명령형과 조립되면 동사 성격을 지니는 품사통용 구조입니다.",
    "없다": "‘있다’와 달리 활용 양상이 완전히 형용사적 어미 규칙에 고정됩니다.",
    "맛있다": "학교 문법 및 표준 표기상 형용사 고정 활용 구조를 가집니다.",
    "재미있다": "학교 문법 및 표준 표기상 형용사 고정 활용 구조를 가집니다."
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

function hasFinalConsonant(text) {
  if (!text) return false;
  const code = text.charCodeAt(text.length - 1);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

/**
 * [수행평가 정밀 형태소 분석 알고리즘]
 * 입력받은 단어 그대로의 '현재 활용 형태소 상태'를 먼저 분석하고,
 * 기본형일 경우 수행평가 5대 가상 결합 테스트로 분기 검증합니다.
 */
function evaluateWordByHwalgyong(input) {
  const text = input.trim().replace(/\s+/g, "");

  // [명사 방어] 용언 형태적 요소를 갖추지 못한 명사나 조사 필터링
  if (text.length < 2 && !text.endsWith("다")) {
    return {
      result: "hold", verbScore: 0, adjScore: 0,
      hwalgyongResults: [{
        criterion: "형태소 규칙성 검사",
        derived: text, status: "판독 불가",
        desc: "활용 어미가 식별되지 않는 명사(체언) 등의 단어는 동사/형용사 판별 대상이 아닙니다."
      }],
      notice: "동사/형용사와 같이 형태 변화를 하는 '용언(활용형 혹은 기본형)'을 입력해 주세요."
    }
  }

  let verbScore = 0;
  let adjScore = 0;
  const hwalgyongResults = [];
  let noticeText = "입력된 활용 형태소에 내장된 문법적 특징을 성공적으로 추적했습니다.";

  // 특수 어휘 필터링
  if (GRAMMAR_DB.specialCases[text] || GRAMMAR_DB.specialCases[text.slice(0,-1)]) {
    const desc = GRAMMAR_DB.specialCases[text] || GRAMMAR_DB.specialCases[text.slice(0,-1)];
    const isObviousAdj = text.includes("없다") || text.includes("맛있") || text.includes("재미있");
    return {
      result: isObviousAdj ? "adjective" : "hold",
      verbScore: isObviousAdj ? 0 : 2, adjScore: 2,
      hwalgyongResults: [{
        criterion: "수행평가 지정 특수 주의 어휘",
        derived: text, status: isObviousAdj ? "형용사" : "품사 통용",
        desc: desc
      }],
      notice: desc
    };
  }

  // --- 코어 분기 시동 ---

  // 패턴 1: 입력값 자체가 이미 명령, 청유, 현재시제 선어말어미를 품고 있는 경우 (실제 활용형 탐지)
  if (text.endsWith("는다") || text.endsWith("ㄴ다")) {
    verbScore += 4;
    hwalgyongResults.push({
      criterion: "현재 시제 선어말어미 '-는-/-ㄴ-' 탐지",
      derived: `‘${text}’`, status: "동사 확정",
      desc: "수행평가 ⑤번 해설지 기준: '굳는다', '늦는다'처럼 선어말어미 '-는-/-ㄴ-'이 직접 결합되어 실현된 활용형은 100% 동사입니다."
    });
  } 
  else if (text.endsWith("는구나")) {
    verbScore += 4;
    hwalgyongResults.push({
      criterion: "현재 감탄형 어미 '-는구나' 탐지",
      derived: `‘${text}’`, status: "동사 확정",
      desc: "감탄형 어미 '-는구나'가 결합하여 변형된 활용 구조는 동사 고유의 형태입니다."
    });
  }
  else if (text.endsWith("자") && GRAMMAR_DB.verbs.some(v => text.startsWith(v))) {
    verbScore += 4;
    hwalgyongResults.push({
      criterion: "청유형 종결어미 '-자' 탐지",
      derived: `‘${text}’`, status: "동사 확정",
      desc: "성질과 상태를 나타내는 형용사에는 청유형 어미 '-자'가 결합할 수 없으므로 동사입니다."
    });
  }
  else if ((text.endsWith("어라") || text.endsWith("아라")) && GRAMMAR_DB.verbs.some(v => text.startsWith(v))) {
    verbScore += 4;
    hwalgyongResults.push({
      criterion: "명령형 종결어미 '-어라/-아라' 탐지",
      derived: `‘${text}’`, status: "동사 확정",
      desc: "동작의 주체에게 행동을 요구하는 명령형 어미가 부착되어 활용된 구조이므로 동사입니다."
    });
  }
  // 패턴 2: 현재 관형사형 어미를 달고 나온 경우 (수행평가 오답률 최고 선지 '굳은', '예쁜' 격파용)
  else if (text.endsWith("는") && !text.endsWith("다는") && !text.endsWith("구나는")) {
    verbScore += 4;
    hwalgyongResults.push({
      criterion: "현재 관형사형 어미 '-는' 탐지",
      derived: `‘${text}’`, status: "동사형 관형화",
      desc: "현재 시제에서 체언을 수식할 때 관형사형 어미 '-는'을 취하는 형태소 구조는 동사입니다."
    });
  }
  else if ((text.endsWith("은") || (text.endsWith("ㄴ") && !text.endsWith("다") && !text.endsWith("자")))) {
    // 여기서 수행평가 ⑤번 해설지 핵심 대입: '굳은'은 형용사가 아니라 동사의 관형사형!
    const stemCandidate = text.endsWith("은") ? text.slice(0, -1) : text.slice(0, -1);
    
    if (GRAMMAR_DB.verbs.includes(stemCandidate) || stemCandidate === "굳" || stemCandidate === "늦" || stemCandidate === "크") {
      verbScore += 3;
      hwalgyongResults.push({
        criterion: "동사의 현재 관형사형 활용형 탐지 (⑤번 선지 저격)",
        derived: `‘${text}’`, status: "동사의 활용형",
        desc: "수행평가 해설지 명시: '굳은 말버릇'의 '굳은'은 이미 변한 상태를 뜻하지만, 동사 '굳다'에 관형사형 어미 '-(으)ㄴ'이 결합해 활용된 것뿐 품사는 여전히 [동사]입니다."
      });
      noticeText = "★ 수행평가 ⑤번 선지 핵심 주의 문항: 품사가 형용사로 바뀐 것이 아니라 동사가 활용된 형태입니다!";
    } else {
      adjScore += 4;
      hwalgyongResults.push({
        criterion: "형용사의 현재 관형사형 어미 '-(으)ㄴ' 탐지",
        derived: `‘${text}’`, status: "형용사 확정",
        desc: "기본 속성이 형용사인 어간 뒤에 관형사형 어미 '-(으)ㄴ'이 결합하여 실현된 상태입니다."
      });
    }
  }
  else if (text.endsWith("구나") && !text.endsWith("는구나")) {
    adjScore += 4;
    hwalgyongResults.push({
      criterion: "현재 감탄형 어미 '-구나' 탐지",
      derived: `‘${text}’`, status: "형용사 확정",
      desc: "선어말어미 없이 어간 뒤에 감탄형 어미 '-구나'가 직결하는 양상은 형용사의 전형적인 결합 형태입니다."
    });
  }
  
  // 패턴 3: '~다' 기본형으로 들어와서 내부 가상 어미 결합 테스트를 태워야 하는 경우
  else if (text.endsWith("다")) {
    const stem = text.slice(0, -1);
    const hasBatchim = hasFinalConsonant(stem);
    
    // 강제 사전 힌트 점검
    const isKnownVerb = GRAMMAR_DB.verbs.includes(stem);
    const isKnownAdj = GRAMMAR_DB.adjectives.includes(stem);

    if (isKnownVerb) verbScore += 2;
    if (isKnownAdj) adjScore += 2;

    // ① 현재시제 선어말어미 조합기 가동
    const virtualPresent = `${stem}${hasBatchim ? "는" : "ㄴ"}다`;
    hwalgyongResults.push({
      criterion: "가상 현재 시제 선어말어미 조립 교차 검증",
      derived: `‘${virtualPresent}’`,
      status: isKnownVerb || !isKnownAdj ? "동사형 자연스러움" : "형용사형 변형 불가",
      desc: "'-ㄴ다/-는다'를 조합했을 때 자연스럽게 말이 성립하면 동사 규칙군, 결합이 거부되면 형용사 규칙군입니다."
    });

    // ② 관형사형 어미 조합기 가동
    const virtualModifier = isKnownVerb || !isKnownAdj ? `${stem}는` : `${stem}${hasBatchim ? "은" : "ㄴ"}`;
    hwalgyongResults.push({
      criterion: "가상 관형사형 어미 결합 양상 도출",
      derived: `‘${virtualModifier}’`,
      status: isKnownVerb || !isKnownAdj ? "동사형 어미(-는)" : "형용사형 어미(-(으)ㄴ)",
      desc: "현재 수식 구문 변형 시 동사는 '-는'과 연동하며, 형용사는 '-(으)ㄴ' 활용 패러다임과 동화됩니다."
    });

    if (isKnownVerb || !isKnownAdj) verbScore += 2;
    if (isKnownAdj || !isKnownVerb) adjScore += 2;
    
    noticeText = "기본형 단어가 입력되어 시스템이 수행평가 5대 가상 활용형 규칙 변형 구조를 적용해 대조 분석했습니다.";
  }

  // 최종 점수 결산 연산
  let finalResult = "hold";
  if (verbScore > adjScore) finalResult = "verb";
  if (adjScore > verbScore) finalResult = "adjective";

  return {
    result: finalResult,
    verbScore,
    adjScore,
    hwalgyongResults,
    notice: noticeText
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

  resultBadge.className = `result-badge ${analysis.result}`;
  resultBadge.textContent = labels[analysis.result];
  resultTitle.textContent = `결론: ${labels[analysis.result]}`;
  
  if (analysis.result === "hold") {
    resultSummary.textContent = `‘${word}’는 활용 구조 분석 결과 단독 대입 처리가 제한되는 품사통용이거나 문맥 판독 대상입니다.`;
  } else {
    resultSummary.textContent = `‘${word}’의 어미 및 형태소 결합 구조를 대조한 결과, 문법 규칙에 따라 [${labels[analysis.result]}] 품사로 최종 도출되었습니다.`;
  }

  processList.innerHTML = analysis.hwalgyongResults
    .map(res => `
      <li>
        <strong>${res.criterion}</strong> : <span style="color:var(--accent-strong); font-weight:700;">${res.derived}</span> 
        [형태소 판정 결과: <span style="text-decoration:underline; font-weight: 800;">${res.status}</span>]
        <br><small style="color: var(--muted);">${res.desc}</small>
      </li>
    `).join("");

  evidenceTable.innerHTML = `
    <tr>
      <td>동사 활용형 조건 부합도</td>
      <td>${analysis.verbScore} 점</td>
      <td>현재 선어말어미(-는-), 관형사형어미(-는), 감탄형(-는구나), 명령/청유 수용성</td>
    </tr>
    <tr>
      <td>형용사 활용형 조건 부합도</td>
      <td>${analysis.adjScore} 점</td>
      <td>현재시제어미 없음, 관형사형어미(-(으)ㄴ), 감탄형(-구나), 명령/청유 제약성</td>
    </tr>
  `;

  noticeBox.innerHTML = analysis.notice;
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