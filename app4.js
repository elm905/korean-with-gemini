// 1. 한국어 형태론적 특징을 반영한 규칙 데이터베이스
const GRAMMAR_DB = {
  adjectiveSuffixes: ["하다", "롭다", "스럽다", "맞다", "지다", "치다"], 
  verbWithHada: ["공부하다", "일하다", "운동하다", "생각하다", "사랑하다", "노력하다", "운전하다", "말하다", "전화하다", "행하다"],
  
  exceptions: {
    "있다": { type: "hold", desc: "존재를 나타낼 때는 형용사적 성격, 진행될 때는 동사적 성격을 띱니다. 학교문법 품사 통용 사례입니다." },
    "없다": { type: "adjective", desc: "‘있다’와 달리 활용 양상이 완벽히 형용사에 가깝습니다." },
    "크다": { type: "hold", desc: "자라는 과정(동사)인지, 이미 자란 상태(형용사)인지 문맥 구분이 필수적입니다." },
    "밝다": { type: "hold", desc: "날이 새다(동사)인지, 빛이 환하다(형용사)인지 문맥 확인이 필요합니다." },
    "맛있다": { type: "adjective", desc: "학교문법 및 규정상 형용사로 분류됩니다." },
    "재미있다": { type: "adjective", desc: "학교문법 및 규정상 형용사로 분류됩니다." }
  }
};

// DOM 요소 획득
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
 * 정밀 품사 검증 엔진
 */
function evaluateWord(word) {
  // [강력한 보완] '기본'처럼 '~다'로 끝나지 않는 명사/비용언 원천 차단
  if (!word.endsWith("다") || word.length < 2) {
    return {
      result: "hold",
      verbScore: 0,
      adjScore: 0,
      process: [{ 
        title: "기본형 적합성 검사 실패", 
        label: "용언 형태 아님", 
        reason: "동사와 형용사는 기본형 형태가 항상 ‘~다’로 끝나야 문법 분석을 진행할 수 있습니다." 
      }],
      notice: "‘기본’과 같은 명사는 판정 대상이 아닙니다. 반드시 ‘~다’로 끝나는 동사나 형용사를 입력해 주세요."
    };
  }

  const stem = getStem(word);
  let verbScore = 0;
  let adjScore = 0;
  const process = [];

  // 1단계: 지정 특수 예외사례 처리
  if (GRAMMAR_DB.exceptions[word]) {
    const ex = GRAMMAR_DB.exceptions[word];
    return {
      result: ex.type,
      verbScore: ex.type === "verb" ? 3 : 0,
      adjScore: ex.type === "adjective" ? 3 : 0,
      process: [{ title: "특수 필수 규정어", label: "지정 예외", reason: ex.desc }],
      notice: ex.desc
    };
  }

  // 2단계: 형태 분석 (접미사 패턴 매칭)
  let patternMatched = false;
  const isVerbHada = GRAMMAR_DB.verbWithHada.some(v => word.endsWith(v));
  
  if (isVerbHada) {
    verbScore += 3;
    process.push({ title: "형태 분석", label: "동사성 -하다", reason: "행위성을 지닌 명사에 결합하는 ‘-하다’ 용언은 동사입니다." });
    patternMatched = true;
  } else {
    for (const suffix of GRAMMAR_DB.adjectiveSuffixes) {
      if (word.endsWith(suffix)) {
        adjScore += 3;
        process.push({ title: "형태 분석", label: `형용사성 -${suffix}`, reason: `‘-${suffix}’ 규칙으로 끝나는 용언은 대다수 상태를 나타내는 형용사입니다.` });
        patternMatched = true;
        break;
      }
    }
  }

  // 3단계: 표준 활용형 가상 테스트 수용성 검증
  if (!patternMatched) {
    const plainPresent = `${stem}${hasFinalConsonant(stem) ? "는다" : "ㄴ다"}`;
    process.push({
      title: "현재 평서형 활용 검증",
      label: `‘${plainPresent}’ 테스트`,
      reason: "현재형 어미 ‘-ㄴ다/-는다’가 매끄럽게 연결되는 규칙성이 확인되면 동사, 불가능하면 형용사입니다."
    });
  }

  // 최종 결과 도출
  let result = "hold";
  if (verbScore > adjScore) result = "verb";
  if (adjScore > verbScore) result = "adjective";

  return {
    result,
    verbScore,
    adjScore,
    process,
    notice: result === "hold" 
      ? "기본적인 단어 구조 분석만으로는 판별이 모호합니다. 문맥 속에서 현재형 어미를 직접 붙여 검증해 보세요."
      : `분석 완료: ‘${word}’는 학교문법 기준에 의거하여 ${result === "verb" ? "동사" : "형용사"} 자격이 성립됩니다.`
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
    resultSummary.textContent = `‘${word}’는 분석 데이터 조건에 부합하지 않거나 판정 대상(용언)이 아닙니다.`;
  } else {
    resultSummary.textContent = `‘${word}’는 분석 매칭 결과 ${labels[analysis.result]} 자격이 우세합니다.`;
  }

  processList.innerHTML = analysis.process
    .map(p => `<li>${p.title}: <strong>${p.label}</strong><br><small style="color: var(--muted);">${p.reason}</small></li>`)
    .join("");

  evidenceTable.innerHTML = `
    <tr>
      <td>동사</td>
      <td>${analysis.verbScore}점</td>
      <td>동작/행위 기반 접사 점수</td>
    </tr>
    <tr>
      <td>형용사</td>
      <td>${analysis.adjScore}점</td>
      <td>성질/상태 기반 접사 점수</td>
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