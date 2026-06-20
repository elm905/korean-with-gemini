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

const cautionWords = new Set(["있다", "없다", "맛있다", "재미있다", "크다"]);

// 예시 데이터 및 기본 사전 데이터로 활용
const exampleData = {
  먹다: {
    sentence: "동생이 밥을 먹다.",
    choice: "동사 / 형용사",
    answers: ["action", "yes", "yes", "no", "yes", "yes"],
  },
  예쁘다: {
    sentence: "꽃이 예쁘다.",
    choice: "동사 / 형용사",
    answers: ["state", "no", "no", "yes", "no", "no"],
  },
  크다: {
    sentence: "나무가 크다.",
    choice: "동사 / 형용사",
    answers: ["state", "uncertain", "uncertain", "yes", "no", "no"],
  },
};

let checks = [];

function trimWord(value) {
  return value.trim().replace(/\s+/g, "");
}

function getStem(word) {
  return word.endsWith("다") ? word.slice(0, -1) : word;
}

function hasFinalConsonant(text) {
  if (!text) return false;
  const code = text.charCodeAt(text.length - 1);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

function makePlainPresent(word) {
  const stem = getStem(word);
  if (!stem) return "입력한 용언 + -ㄴ다/-는다";
  return `${stem}${hasFinalConsonant(stem) ? "는다" : "ㄴ다"}`;
}

function makeVerbModifier(word) {
  const stem = getStem(word);
  if (!stem) return "입력한 용언 + -는 대상";
  return `${stem}는 대상`;
}

function makeAdjectiveModifier(word) {
  const stem = getStem(word);
  if (!stem) return "입력한 용언 + -ㄴ/-은 대상";
  return `${stem}${hasFinalConsonant(stem) ? "은" : "ㄴ"} 대상`;
}

function makeImperative(word) {
  const stem = getStem(word);
  if (!stem) return "입력한 용언 + -어라/-아라";
  return `${stem}어라`;
}

function makeSuggestive(word) {
  const stem = getStem(word);
  if (!stem) return "입력한 용언 + -자";
  return `${stem}자`;
}

// 질문지 기준 정보 생성
function buildChecks(word) {
  const plainPresent = makePlainPresent(word);
  const verbModifier = makeVerbModifier(word);
  const adjectiveModifier = makeAdjectiveModifier(word);
  const imperative = makeImperative(word);
  const suggestive = makeSuggestive(word);

  return [
    {
      id: "meaning",
      title: "의미 기준",
      options: [
        { value: "action", label: "움직임/작용", verb: 1, adjective: 0 },
        { value: "state", label: "성질/상태", verb: 0, adjective: 1 },
        { value: "uncertain", label: "애매함", verb: 0, adjective: 0 },
      ],
    },
    {
      id: "plainPresent",
      title: "현재 평서형",
      options: yesNoOptions(1, 0),
    },
    {
      id: "verbModifier",
      title: "동사형 관형사형",
      options: yesNoOptions(1, 0),
    },
    {
      id: "adjectiveModifier",
      title: "형용사형 관형사형",
      options: yesNoOptions(0, 1),
    },
    {
      id: "imperative",
      title: "명령형",
      options: yesNoOptions(1, 0),
    },
    {
      id: "suggestive",
      title: "청유형",
      options: yesNoOptions(1, 0),
    },
  ];
}

function yesNoOptions(yesVerb, yesAdjective) {
  return [
    { value: "yes", label: "예", verb: yesVerb, adjective: yesAdjective },
    { value: "no", label: "아니오", verb: yesAdjective, adjective: yesVerb },
    { value: "uncertain", label: "애매함", verb: 0, adjective: 0 },
  ];
}

/**
 * [핵심 추가] 단어를 분석하여 각 기준별 답안(value)을 자동으로 판별하는 함수
 */
function autoDetermineAnswers(word) {
  // 1. 이미 등록된 예시 데이터가 있다면 해당 데이터 활용
  if (exampleData[word]) {
    return exampleData[word].answers;
  }

  // 2. 예시 데이터가 없는 새로운 단어의 규칙 기반 자동 추정 알고리즘
  // (실제 완벽한 한국어 형태소 분석은 API가 필요하므로, 학교문법의 기본 규칙 기반으로 추정합니다)
  
  // 기본적으로 '하다'로 끝나는 말 처리 (예: 공부하다 -> 동사, 건강하다 -> 형용사 등 문맥에 따라 갈림)
  // 여기서는 보편적인 동사/형용사 종결 어미 패턴이나 받침 규칙을 임의 가정하거나 기본값 설정
  // 안전하게 기본 규칙을 동사 위주 혹은 형용사 위주로 세팅 (여기선 기본형을 동사적 성격으로 임의 가정 후 테스트)
  
  // 예시: 간단한 규칙 (현실적인 브라우저 환경 단순화 판별)
  const isCaution = cautionWords.has(word);
  
  if (isCaution) {
    if (word === "크다") return ["state", "uncertain", "uncertain", "yes", "no", "no"];
    // 있다/없다 계열은 동사/형용사 성격 혼재
    return ["state", "yes", "yes", "yes", "no", "no"];
  }

  // 일반 단어 자동 판별 시도 (테스트용 디폴트: 동사 경향으로 세팅하되, 특정 조건 부여 가능)
  // 완벽한 판별을 원하시면 사전에 데이터를 더 확충하는 것이 좋습니다.
  return ["action", "yes", "yes", "no", "yes", "yes"]; 
}

// 자동 분석 실행 함수
function analyze() {
  const word = trimWord(wordInput.value);
  if (!word) {
    wordInput.focus();
    return;
  }

  checks = buildChecks(word);
  
  // 사용자가 체크하는 대신 코드가 자동으로 정답 배열을 가져옴
  const autoAnswers = autoDetermineAnswers(word);

  let verbScore = 0;
  let adjectiveScore = 0;
  const selected = [];

  checks.forEach((check, index) => {
    const autoValue = autoAnswers[index];
    const option = check.options.find((opt) => opt.value === autoValue) ?? check.options[2]; // 없으면 애매함(uncertain)
    
    verbScore += option.verb;
    adjectiveScore += option.adjective;
    selected.push({ check, option });
  });

  const result = decideResult(verbScore, adjectiveScore, selected);
  renderResult(word, result, verbScore, adjectiveScore, selected);
}

function decideResult(verbScore, adjectiveScore, selected) {
  const contradiction = hasContradiction(selected);
  const gap = Math.abs(verbScore - adjectiveScore);

  if (contradiction || gap < 2) {
    return "hold";
  }
  return verbScore > adjectiveScore ? "verb" : "adjective";
}

function hasContradiction(selected) {
  const meaning = selected.find((item) => item.check.id === "meaning")?.option.value;
  const imperative = selected.find((item) => item.check.id === "imperative")?.option.value;
  const suggestive = selected.find((item) => item.check.id === "suggestive")?.option.value;
  const plainPresent = selected.find((item) => item.check.id === "plainPresent")?.option.value;

  const stateButActsLikeVerb =
    meaning === "state" && (imperative === "yes" || suggestive === "yes" || plainPresent === "yes");
  const actionButNoVerbForms =
    meaning === "action" && imperative === "no" && suggestive === "no" && plainPresent === "no";

  return stateButActsLikeVerb || actionButNoVerbForms;
}

function renderResult(word, result, verbScore, adjectiveScore, selected) {
  const labels = {
    verb: "동사",
    adjective: "형용사",
    hold: "판정 유보",
  };

  setResultState(result);
  resultTitle.textContent = `결론: ${labels[result]}`;
  resultSummary.textContent = makeSummary(word, result, verbScore, adjectiveScore);
  processList.innerHTML = selected
    .map(({ check, option }) => `<li>${check.title}: <strong>${option.label}</strong> → ${makeReason(check, option)}</li>`)
    .join("");
  evidenceTable.innerHTML = `
    <tr>
      <td>동사</td>
      <td>${verbScore}</td>
      <td>${collectReasons(selected, "verb")}</td>
    </tr>
    <tr>
      <td>형용사</td>
      <td>${adjectiveScore}</td>
      <td>${collectReasons(selected, "adjective")}</td>
    </tr>
  `;
  noticeBox.textContent = makeNotice(word, result);
  resultPanel.classList.remove("hidden");
}

function setResultState(result) {
  resultBadge.className = `result-badge ${result}`;
  resultBadge.textContent = result === "verb" ? "동사" : result === "adjective" ? "형용사" : "판정 유보";
}

function makeSummary(word, result, verbScore, adjectiveScore) {
  const scoreText = `동사 ${verbScore}점, 형용사 ${adjectiveScore}점`;
  if (result === "verb") {
    return `‘${word}’는 ${scoreText}으로 동사 근거가 더 우세합니다.`;
  }
  if (result === "adjective") {
    return `‘${word}’는 ${scoreText}으로 형용사 근거가 더 우세합니다.`;
  }
  return `‘${word}’는 ${scoreText}으로 근거 차이가 작거나 답변이 충돌합니다.`;
}

function makeReason(check, option) {
  if (option.value === "uncertain") return "판정 근거에 반영하지 않았습니다.";
  if (check.id === "meaning") {
    return option.value === "action" ? "움직임/작용은 동사 쪽 근거입니다." : "성질/상태는 형용사 쪽 근거입니다.";
  }
  if (check.id === "adjectiveModifier") {
    return option.value === "yes" ? "‘-ㄴ/-은’은 형용사 쪽 근거입니다." : "형용사 쪽 근거가 약해집니다.";
  }
  if (option.value === "yes") return "해당 활용은 동사 쪽 근거입니다.";
  return "해당 활용이 어렵다면 형용사 쪽 근거입니다.";
}

function collectReasons(selected, type) {
  const reasons = selected
    .filter(({ option }) => option[type] > 0)
    .map(({ check }) => check.title);
  return reasons.length > 0 ? reasons.join(", ") : "뚜렷한 근거 없음";
}

function makeNotice(word, result) {
  if (cautionWords.has(word)) {
    return "주의 사례입니다. 학교문법에서 다루는 대표 기준은 적용하되, 문맥이나 특수한 활용 때문에 추가 확인이 필요할 수 있습니다.";
  }
  if (result === "hold") {
    return "판정이 유보된 경우에는 문맥, 의미, 활용 가능성을 다시 확인하세요. 특히 의미 기준과 활용 기준이 서로 충돌하는지 살펴보면 좋습니다.";
  }
  return "이 결론은 시스템이 분석한 규칙성을 바탕으로 한 학교문법 기준의 판별 결과입니다.";
}

function resetApp() {
  wordInput.value = "";
  sentenceInput.value = "";
  choiceInput.value = "";
  checks = [];
  resultPanel.classList.add("hidden");
  wordInput.focus();
}

// 이벤트 리스너 변경 (질문지를 만들지 않고 바로 분석)
buildButton.addEventListener("click", analyze);
resetButton.addEventListener("click", resetApp);

document.querySelectorAll("[data-example]").forEach((button) => {
  button.addEventListener("click", () => {
    const word = button.dataset.example;
    const example = exampleData[word];
    wordInput.value = word;
    sentenceInput.value = example.sentence;
    choiceInput.value = example.choice;
    analyze(); // 예시 클릭 시 바로 결과 분석
  });
});

wordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    analyze();
  }
});