// 1. 한국어 형태론적 특징을 반영한 규칙 데이터베이스
const GRAMMAR_DB = {
  adjectiveSuffixes: ["하다", "롭다", "스럽다", "맞다", "지다", "치다"], 
  verbWithHada: ["공부하다", "일하다", "운동하다", "생각하다", "사랑하다", "노력하다", "운전하다", "말하다", "전화하다", "행하다"],
  
  exceptions: {
    "있다": { type: "hold", desc: "존재를 나타낼 때는 형용사적 성격, 머무거나 진행될 때는 동사적 성격을 띱니다. (학교문법 품사 통용 논란)" },
    "없다": { type: "adjective", desc: "‘있다’와 달리 활용 양상이 완벽히 형용사에 수렴합니다." },
    "크다": { type: "hold", desc: "체격이나 수량이 자라는 과정(동사)인지, 이미 커 있는 상태(형용사)인지 문맥 구분이 필수적입니다." },
    "밝다": { type: "hold", desc: "새벽이 새어오다(동사)인지, 빛이 환하다(형용사)인지 문맥 확인이 필요합니다." },
    "맛있다": { type: "adjective", desc: "‘있다’ 계열이지만 표준 국어대사전 및 학교문법 규정상 형용사입니다." },
    "재미있다": { type: "adjective", desc: "‘있다’ 계열이지만 표준 규정상 형용사로 분류됩니다." }
  }
};

// DOM 요소 획득 (불필요한 요소 변수 제거)
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
 * 정밀 핵심 알고리즘: 형태소 오류 방어선 추가
 */
function evaluateWord(word) {
  // [핵심 방어 코드] '다'로 끝나지 않는 단어는 사전 차단 (ex: '기본' 입력 대응)
  if (!word.endsWith("다") || word.length < 2) {
    return {
      result: "hold",
      verbScore: 0,
      adjScore: 0,
      process: [{ title: "기본형 검사 오류", label: "용언 형태 아님", reason: "한국어의 동사와 형용사는 기본형이 반드시 ‘~다’로 끝나야 합니다. 명사나 다른 품사는 판별할 수 없습니다." }],
      notice: "올바른 용언의 기본형(예: 먹다, 예쁘다, 공부하다)을 입력해 주세요."
    };
  }

  const stem = getStem(word);
  let verbScore = 0;
  let adjScore = 0;
  const process = [];

  // 1단계: 지정 예외사례 사전 체크
  if (GRAMMAR_DB.exceptions[word]) {
    const ex = GRAMMAR_DB.exceptions[word];
    return {
      result: ex.type,
      verbScore: ex.type === "verb" ? 3 : 0,
      adjScore: ex.type === "adjective" ? 3 : 0,
      process: [{ title: "특수 필수 어휘", label: "주의 사례 지정어", reason: ex.desc }],
      notice: ex.desc
    };
  }

  // 2단계: 형태론적 어미/접사 패턴 필터링
  let patternMatched = false;
  const isVerbHada = GRAMMAR_DB.verbWithHada.some(v => word.endsWith(v));
  
  if (isVerbHada) {
    verbScore += 3;
    process.push({ title: "접사 형태 분석", label: "동사성 ‘-하다’", reason: "행위나 동작성을 띤 명사에 결합하는 ‘-하다’는 동사를 만듭니다." });
    patternMatched = true;
  } else {
    for (const suffix of GRAMMAR_DB.adjectiveSuffixes) {
      if (word.endsWith(suffix)) {
        adjScore += 3;
        process.push({ title: "접사 형태 분석", label: `형용사성 ‘-${suffix}’`, reason: `‘-${suffix}’ 구조를 가지는 용언은 성질이나 상태를 묘사하는 형용사입니다.` });
        patternMatched = true;
        break;
      }
    }
  }

  // 3단계: 학교문법 결합 표준 규칙 테스트 가중치 산정
  const plainPresent = `${stem}${hasFinalConsonant(stem) ? "는다" : "ㄴ다"}`;
  
  // 패턴이 매칭되지 않은 순수 어휘 유형 분류 보정
  if (!patternMatched) {
    // 억지로 점수를 올리지 않고 학교문법 가이드라인 설명 배치
    process.push({
      title: "현재 평서형 변형 적용",
      label: `‘${plainPresent}’`,
      reason: "동사라면 활용형이 자연스러우며, 형용사는 ‘-ㄴ다/-는다’를 취해 현재형을 만들 수 없습니다."
    });
  } else {
    process.push({
      title: "문법적 수용성 확인",
      label: "규칙성 매칭 완료",
      reason: "단어 구조 접사 분석이 완료되어 활용 테스트 생략 가능 수준입니다."
    });
  }

  // 최종 결과 처리
  let result = "hold";
  if (verbScore > adjScore) result = "verb";
  if (adjScore > verbScore) result = "adjective";

  return {
    result,
    verbScore,
    adjScore,
    process,
    notice: result === "hold" 
      ? "규칙 분석 엔진에서 명확한 단서를 얻지 못했습니다. 현재시제 어미(-ㄴ다)나 명령형(-어라)을 대입하여 자연스러운지 직접 확인해 보세요."
      : `분석 완료: ‘${word}’는 학교문법 규칙에 의해 ${result === "verb" ? "동사" : "형용사"}로 분류하는 것이 타당합니다.`
  };
}

function analyze() {
  const word = wordInput.value.trim().replace(/\s+/g, "");
  if (!word) {
    wordInput.focus();
    return;
  }

  const analysis = evaluateWord(word);
  renderResult(word, analysis);
}

function renderResult(word, analysis) {
  const labels = { verb: "동사", adjective: "형용사", hold: "판정 유보" };

  resultBadge.className = `result-badge ${analysis.result}`;
  resultBadge.textContent = labels[analysis.result];
  resultTitle.textContent = `결론: ${labels[analysis.result]}`;
  
  if (analysis.result === "hold") {
    resultSummary.textContent = `‘${word}’는 품사를 특정하기 어렵거나 용언 조건에 부합하지 않습니다.`;
  } else {
    resultSummary.textContent = `‘${word}’ 규칙 분석 스코어 기준 ${labels[analysis.result]} 판단이 우세합니다.`;
  }

  processList.innerHTML = analysis.process
    .map(p => `<li>${p.title}: <strong>${p.label}</strong><br><small style="color: var(--muted);">${p.reason}</small></li>`)
    .join("");

  evidenceTable.innerHTML = `
    <tr>
      <td>동사</td>
      <td>${analysis.verbScore}점</td>
      <td>동작, 행위 중심 접사 및 규칙 수용성</td>
    </tr>
    <tr>
      <td>형용사</td>
      <td>${analysis.adjScore}점</td>
      <td>상태, 성질 파악 접사 분포율</td>
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

wordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") analyze();
});

document.querySelectorAll("[data-example]").forEach((button) => {
  button.addEventListener("click", () => {
    wordInput.value = button.dataset.example;
    analyze();
  });
});