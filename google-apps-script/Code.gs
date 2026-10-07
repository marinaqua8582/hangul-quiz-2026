/******************************************************
 * 2026 한글날 퀴즈 - Google Apps Script Backend
 *
 * 연결 시트
 * - Roster
 * - Progress
 * - Submissions
 *
 * 학생 고유키
 * grade-class-number
 *
 * 예: 2학년 5반 25번 → 2-5-25
 ******************************************************/

const SHEETS = {
  ROSTER: 'Roster',
  PROGRESS: 'Progress',
  SUBMISSIONS: 'Submissions',
};

const HEADERS = {
  ROSTER: [
    'studentKey',
    'grade',
    'class',
    'number',
    'name',
    'active',
  ],

  PROGRESS: [
    'studentKey',
    'grade',
    'class',
    'number',
    'name',
    'answersJson',
    'currentQuestion',
    'quizStartedAt',
    'updatedAt',
    'submitted',
  ],

  SUBMISSIONS: [
    'studentKey',
    'grade',
    'class',
    'number',
    'name',
    'answersJson',
    'correctCount',
    'score',
    'rankTitle',
    'elapsedSeconds',
    'quizStartedAt',
    'submittedAt',
  ],
};


/******************************************************
 * 정답
 *
 * accepted에는
 * - 보기의 실제 문자열
 * - 보기 번호(A/B/C/D)
 * 를 모두 넣어 두어 프론트 구현 방식이 달라도 채점 가능
 ******************************************************/

const QUIZ_ANSWERS = [
  {
    id: 1,
    accepted: ['B', '세종'],
  },
  {
    id: 2,
    accepted: ['O', 'TRUE', 'true'],
  },
  {
    id: 3,
    accepted: ['X', 'FALSE', 'false'],
  },
  {
    id: 4,
    accepted: ['B', '불쌍하고 가엾다'],
  },
  {
    id: 5,
    accepted: ['C', '어리석다'],
  },
  {
    id: 6,
    accepted: ['A', '리더십'],
  },
  {
    id: 7,
    accepted: ['A', '슈림프'],
  },
  {
    id: 8,
    accepted: ['B', '며칠'],
  },
  {
    id: 9,
    accepted: ['B', '웬'],
  },
  {
    id: 10,
    accepted: ['B', '금세 끝났다'],
  },
  {
    id: 11,
    accepted: ['B', '설렘'],
  },
  {
    id: 12,
    accepted: ['A', '오랜만'],
  },
  {
    id: 13,
    accepted: ['A', '얼굴이 희고 키가 헌칠한 모습'],
  },
  {
    id: 14,
    accepted: ['B', '맥없이 축 늘어진 모습'],
  },
  {
    id: 15,
    accepted: ['A', '외양이 말쑥하고 똑똑해 보이는 사람'],
  },
  {
    id: 16,
    accepted: ['B', '격에 맞지 않아 어울리지 않는 상황'],
  },
  {
    id: 17,
    accepted: ['A', '도무지 일어날 가망이 없는 일'],
  },
  {
    id: 18,
    accepted: ['B', '믿음성이 있고 믿을 만하다'],
  },
  {
    id: 19,
    accepted: ['A', '초저녁 서쪽 하늘에 보이는 금성'],
  },
  {
    id: 20,
    accepted: ['C', '충분히 익어 저절로 벌어진 과실'],
  },
];


/******************************************************
 * Web App Entry
 ******************************************************/

function doGet(e) {
  return jsonResponse_({
    success: true,
    version: '2026-10-08-studentkey-text-v1',
    message: '2026 한글날 퀴즈 API가 정상 작동 중입니다.',
  });
}


function doPost(e) {
  try {
    const request = parseRequest_(e);
    const action = String(request.action || '').trim();

    let result;

    switch (action) {
      case 'loginStudent':
        result = loginStudent_(request);
        break;

      case 'loadProgress':
        throw new Error('진행 정보는 브라우저에만 저장됩니다.');
        break;

      case 'saveProgress':
        throw new Error('진행 정보는 브라우저에만 저장됩니다.');
        break;

      case 'submitQuiz':
        result = submitQuiz_(request);
        break;

      case 'adminLogin':
        result = adminLogin_(request);
        break;

      case 'getDashboard':
        result = getDashboard_(request);
        break;

      case 'getRosterOptions':
        result = getRosterOptions_();
        break;

      default:
        throw new Error('알 수 없는 요청입니다: ' + action);
    }

    return jsonResponse_({
      success: true,
      version: '2026-10-08-studentkey-text-v1',
      ...result,
    });

  } catch (error) {
    console.error(error);

    return jsonResponse_({
      success: false,
      error: error.message || String(error),
    });
  }
}


/******************************************************
 * 1. 학생 로그인
 ******************************************************/

function loginStudent_(request) {
  const grade = normalizeNumber_(request.grade);
  const classNo = normalizeNumber_(request.class);
  const number = normalizeNumber_(request.number);
  const name = normalizeName_(request.name);

  if (!grade || !classNo || !number || !name) {
    throw new Error('학년, 반, 번호, 이름을 모두 입력해 주세요.');
  }

  const studentKey = makeStudentKey_(grade, classNo, number);

  const rosterStudent = findRosterStudent_(
    grade,
    classNo,
    number,
    name
  );

  if (!rosterStudent) {
    throw new Error(
      '학년, 반, 번호, 이름을 다시 확인해 주세요.'
    );
  }

  if (!isTrue_(rosterStudent.active)) {
    throw new Error(
      '현재 퀴즈에 참여할 수 없는 학생입니다.'
    );
  }

  // 이미 제출했는지 먼저 확인
  const submission = getSubmissionByStudentKey_(studentKey);

  if (submission) {
    return {
      status: 'submitted',
      studentKey: studentKey,
      student: {
        grade: grade,
        class: classNo,
        number: number,
        name: name,
      },
      result: {
        score: Number(submission.score),
        rankTitle: submission.rankTitle,
      },
    };
  }

  return {
    status: 'new',
    studentKey: studentKey,
    student: {
      grade: grade,
      class: classNo,
      number: number,
      name: name,
    },
  };
}


/******************************************************
 * 2. 진행 상황 조회
 ******************************************************/

function loadProgress_(request) {
  const studentKey = normalizeStudentKey_(request.studentKey);

  if (!studentKey) {
    throw new Error('studentKey가 없습니다.');
  }

  const submission = getSubmissionByStudentKey_(studentKey);

  if (submission) {
    return {
      status: 'submitted',
      result: {
        score: Number(submission.score),
        rankTitle: submission.rankTitle,
      },
    };
  }

  const progress = getProgressByStudentKey_(studentKey);

  if (!progress) {
    return {
      status: 'new',
      progress: null,
    };
  }

  return {
    status: 'progress',
    progress: {
      answers: safeJsonParse_(progress.answersJson, {}),
      currentQuestion: Number(progress.currentQuestion || 1),
      quizStartedAt: toIsoString_(progress.quizStartedAt),
      submitted: isTrue_(progress.submitted),
    },
  };
}


/******************************************************
 * 3. 진행 상황 자동 저장
 *
 * 다음 버튼 클릭 시 호출
 ******************************************************/

function saveProgress_(request) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const studentKey = normalizeStudentKey_(request.studentKey);

    if (!studentKey) {
      throw new Error('학생 정보가 올바르지 않습니다.');
    }

    // 제출 완료 학생은 저장 금지
    const existingSubmission =
      getSubmissionByStudentKey_(studentKey);

    if (existingSubmission) {
      throw new Error(
        '이미 최종 제출된 퀴즈입니다.'
      );
    }

    const grade = normalizeNumber_(request.grade);
    const classNo = normalizeNumber_(request.class);
    const number = normalizeNumber_(request.number);
    const name = normalizeName_(request.name);

    const expectedKey =
      makeStudentKey_(grade, classNo, number);

    if (studentKey !== expectedKey) {
      throw new Error('학생 정보가 일치하지 않습니다.');
    }

    // Roster 재검증
    const rosterStudent =
      findRosterStudent_(
        grade,
        classNo,
        number,
        name
      );

    if (!rosterStudent || !isTrue_(rosterStudent.active)) {
      throw new Error(
        '학생 명단을 확인할 수 없습니다.'
      );
    }

    const answers = normalizeAnswersObject_(
      request.answers
    );

    const currentQuestion =
      Number(request.currentQuestion || 1);

    let quizStartedAt =
      request.quizStartedAt
        ? new Date(request.quizStartedAt)
        : null;

    const existingProgress =
      getProgressByStudentKey_(studentKey);

    // 기존 시작 시간이 있으면 그것을 유지
    if (
      existingProgress &&
      existingProgress.quizStartedAt
    ) {
      quizStartedAt =
        new Date(existingProgress.quizStartedAt);
    }

    if (
      !quizStartedAt ||
      isNaN(quizStartedAt.getTime())
    ) {
      quizStartedAt = new Date();
    }

    const now = new Date();

    const rowData = [
      studentKey,
      grade,
      classNo,
      number,
      name,
      JSON.stringify(answers),
      currentQuestion,
      quizStartedAt,
      now,
      false,
    ];

    upsertByStudentKey_(
      SHEETS.PROGRESS,
      rowData
    );

    return {
      saved: true,
      studentKey: studentKey,
      currentQuestion: currentQuestion,
      updatedAt: now.toISOString(),
      quizStartedAt: quizStartedAt.toISOString(),
    };

  } finally {
    lock.releaseLock();
  }
}


/******************************************************
 * 4. 최종 제출
 ******************************************************/

function submitQuiz_(request) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const studentKey =
      normalizeStudentKey_(request.studentKey);

    if (!studentKey) {
      throw new Error('학생 정보가 올바르지 않습니다.');
    }

    const grade = normalizeNumber_(request.grade);
    const classNo = normalizeNumber_(request.class);
    const number = normalizeNumber_(request.number);
    const name = normalizeName_(request.name);

    const expectedKey =
      makeStudentKey_(grade, classNo, number);

    if (studentKey !== expectedKey) {
      throw new Error('학생 정보가 일치하지 않습니다.');
    }

    // 명단 재확인
    const rosterStudent =
      findRosterStudent_(
        grade,
        classNo,
        number,
        name
      );

    if (!rosterStudent || !isTrue_(rosterStudent.active)) {
      throw new Error(
        '학생 명단을 확인할 수 없습니다.'
      );
    }

    // 이미 제출했다면 새 행을 만들지 않고 기존 결과 반환
    const existingSubmission =
      getSubmissionByStudentKey_(studentKey);

    if (existingSubmission) {
      return {
        alreadySubmitted: true,
        result: {
          score: Number(existingSubmission.score),
          rankTitle: existingSubmission.rankTitle,
        },
      };
    }

    const answers =
      normalizeAnswersObject_(request.answers);

    // 20문제 모두 응답 확인
    const missingQuestions = [];

    for (let i = 1; i <= 20; i++) {
      const answer = getStudentAnswer_(answers, i);

      if (
        answer === null ||
        answer === undefined ||
        String(answer).trim() === ''
      ) {
        missingQuestions.push(i);
      }
    }

    if (missingQuestions.length > 0) {
      throw new Error(
        '응답하지 않은 문제가 있습니다: ' +
        missingQuestions.join(', ')
      );
    }

    // 채점
    const correctCount = scoreQuiz_(answers);
    const score = correctCount * 5;

    const rank = getRank_(score);

    // 시작 시간
    let quizStartedAt = null;

    if (
      !quizStartedAt ||
      isNaN(quizStartedAt.getTime())
    ) {
      if (request.quizStartedAt) {
        quizStartedAt =
          new Date(request.quizStartedAt);
      }
    }

    if (
      !quizStartedAt ||
      isNaN(quizStartedAt.getTime())
    ) {
      quizStartedAt = new Date();
    }

    const submittedAt = new Date();

    const elapsedSeconds = Math.max(
      0,
      Math.round(
        (submittedAt.getTime() -
          quizStartedAt.getTime()) / 1000
      )
    );

    const submissionRow = [
      studentKey,
      grade,
      classNo,
      number,
      name,
      JSON.stringify(answers),
      correctCount,
      score,
      rank.title,
      elapsedSeconds,
      quizStartedAt,
      submittedAt,
    ];

    upsertByStudentKey_(
      SHEETS.SUBMISSIONS,
      submissionRow
    );

    // 학생에게 정답/오답/풀이시간은 반환하지 않는다.
    return {
      alreadySubmitted: false,
      result: {
        score: score,
        rankTitle: rank.title,
        rankImage: rank.image,
        message: rank.message,
      },
    };

  } finally {
    lock.releaseLock();
  }
}


/******************************************************
 * 5. 관리자 로그인
 ******************************************************/

function adminLogin_(request) {
  const password = String(
    request.password || ''
  );

  if (!password) {
    throw new Error('비밀번호를 입력해 주세요.');
  }

  const properties =
    PropertiesService.getScriptProperties();

  const savedHash =
    properties.getProperty('ADMIN_PASSWORD_HASH');

  if (!savedHash) {
    throw new Error(
      '관리자 비밀번호가 아직 설정되지 않았습니다.'
    );
  }

  const inputHash = sha256Hex_(password);

  if (inputHash !== savedHash) {
    throw new Error(
      '관리자 비밀번호가 올바르지 않습니다.'
    );
  }

  // 임시 관리자 토큰 발급
  const token =
    Utilities.getUuid() +
    '-' +
    new Date().getTime();

  CacheService
    .getScriptCache()
    .put(
      'admin:' + token,
      'true',
      21600
    ); // 6시간

  return {
    authenticated: true,
    token: token,
  };
}


/******************************************************
 * 6. 교사용 대시보드
 ******************************************************/

function getDashboard_(request) {
  validateAdminToken_(request.token);

  const filterGrade =
    request.grade &&
    request.grade !== 'all'
      ? normalizeNumber_(request.grade)
      : '';

  const filterClass =
    request.class &&
    request.class !== 'all'
      ? normalizeNumber_(request.class)
      : '';

  const sheet =
    getSheet_(SHEETS.SUBMISSIONS);

  const values =
    sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return {
      participantCount: 0,
      students: [],
    };
  }

  const headers = values[0];
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const obj =
      rowToObject_(headers, values[i]);

    if (!obj.studentKey) continue;

    const grade =
      normalizeNumber_(obj.grade);

    const classNo =
      normalizeNumber_(obj.class);

    if (
      filterGrade &&
      grade !== filterGrade
    ) {
      continue;
    }

    if (
      filterClass &&
      classNo !== filterClass
    ) {
      continue;
    }

    rows.push({
      grade: grade,
      class: classNo,
      number: normalizeNumber_(obj.number),
      name: normalizeName_(obj.name),
      score: Number(obj.score || 0),
      rankTitle: String(obj.rankTitle || ''),
    });
  }

  rows.sort(function(a, b) {
    const gradeDiff =
      Number(a.grade) - Number(b.grade);

    if (gradeDiff !== 0) return gradeDiff;

    const classDiff =
      Number(a.class) - Number(b.class);

    if (classDiff !== 0) return classDiff;

    return (
      Number(a.number) -
      Number(b.number)
    );
  });

  return {
    participantCount: rows.length,
    students: rows,
  };
}


/******************************************************
 * 등급
 ******************************************************/

function getRank_(score) {
  if (score >= 95) {
    return {
      title: '한글 대왕',
      image: '/assets/ranks/king.png',
      message:
        '과인이 인정하노라! 그대야말로 오늘의 진정한 한글 대왕이로다.',
    };
  }

  if (score >= 85) {
    return {
      title: '한글 장원',
      image: '/assets/ranks/jangwon.png',
      message:
        '훌륭하도다! 한글 과거시험이 있었다면 장원급제했을 것이로다.',
    };
  }

  if (score >= 70) {
    return {
      title: '한글 장군',
      image: '/assets/ranks/general.png',
      message:
        '제법 실력이 있구나! 당당한 한글 장군으로 인정하노라.',
    };
  }

  if (score >= 50) {
    return {
      title: '한글 선비',
      image: '/assets/ranks/scholar.png',
      message:
        '글 읽고 글 쓰는 멋이 있구나! 조금 더 정진하면 더 높은 자리에 오를 수 있다.',
    };
  }

  return {
    title: '한글 학동',
    image: '/assets/ranks/student.png',
    message:
      '배움의 첫걸음을 내디뎠구나! 오늘 알게 된 한글과 우리말을 하나씩 익혀 보자.',
  };
}


/******************************************************
 * 채점
 ******************************************************/

function scoreQuiz_(answers) {
  let correctCount = 0;

  QUIZ_ANSWERS.forEach(function(question) {
    const studentAnswer =
      getStudentAnswer_(
        answers,
        question.id
      );

    const normalized =
      normalizeAnswer_(studentAnswer);

    const accepted =
      question.accepted.map(
        normalizeAnswer_
      );

    if (
      accepted.indexOf(normalized) !== -1
    ) {
      correctCount++;
    }
  });

  return correctCount;
}


function getStudentAnswer_(answers, questionId) {
  if (!answers) return null;

  // 객체 형식
  // {"1":"B","2":"O"}
  const candidates = [
    String(questionId),
    'q' + questionId,
    questionId,
  ];

  for (let i = 0; i < candidates.length; i++) {
    const key = candidates[i];

    if (
      Object.prototype.hasOwnProperty.call(
        answers,
        key
      )
    ) {
      return extractAnswerValue_(
        answers[key]
      );
    }
  }

  // 배열 형식
  if (Array.isArray(answers)) {
    const value =
      answers[questionId - 1];

    return extractAnswerValue_(value);
  }

  return null;
}


function extractAnswerValue_(value) {
  if (
    value &&
    typeof value === 'object'
  ) {
    if ('answer' in value)
      return value.answer;

    if ('value' in value)
      return value.value;

    if ('selectedAnswer' in value)
      return value.selectedAnswer;

    if ('selected' in value)
      return value.selected;
  }

  return value;
}


/******************************************************
 * Roster 조회
 ******************************************************/

function findRosterStudent_(
  grade,
  classNo,
  number,
  name
) {
  const sheet =
    getSheet_(SHEETS.ROSTER);

  const values =
    sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return null;
  }

  const headers = values[0];

  for (let i = 1; i < values.length; i++) {
    const obj =
      rowToObject_(
        headers,
        values[i]
      );

    if (
      normalizeNumber_(obj.grade) === grade &&
      normalizeNumber_(obj.class) === classNo &&
      normalizeNumber_(obj.number) === number &&
      normalizeName_(obj.name) === name
    ) {
      return obj;
    }
  }

  return null;
}


/******************************************************
 * Progress 조회
 ******************************************************/

function getProgressByStudentKey_(
  studentKey
) {
  return getRowByStudentKey_(
    SHEETS.PROGRESS,
    studentKey
  );
}


/******************************************************
 * Submission 조회
 ******************************************************/

function getSubmissionByStudentKey_(
  studentKey
) {
  return getRowByStudentKey_(
    SHEETS.SUBMISSIONS,
    studentKey
  );
}


/******************************************************
 * studentKey 기준 조회
 ******************************************************/

function getRowByStudentKey_(sheetName, studentKey) {
  const sheet = getSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const targetKey = normalizeStudentKey_(studentKey);
  // Scan identifiers only. Read the answer/name/score row only for the requested student.
  const identifiers = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  for (let i = 0; i < identifiers.length; i++) {
    if (studentKeyFromRow_(identifiers[i]) !== targetKey) continue;
    const headers = sheet.getRange(1, 1, 1, HEADERS[sheetName.toUpperCase()].length).getValues()[0];
    const row = sheet.getRange(i + 2, 1, 1, headers.length).getValues()[0];
    const result = rowToObject_(headers, row);
    result.studentKey = targetKey;
    return result;
  }
  return null;
}


/******************************************************
 * studentKey 기준 Upsert
 *
 * 동일 학생 중복행 발견 시
 * 첫 행만 유지하고 나머지는 삭제
 ******************************************************/

function upsertByStudentKey_(sheetName, rowData) {
  const sheet = getSheet_(sheetName);
  const targetKey = studentKeyFromRow_(rowData);
  if (!targetKey) throw new Error('studentKey가 올바르지 않습니다.');
  const lastRow = sheet.getLastRow();
  let targetRow = lastRow + 1;
  if (lastRow >= 2) {
    const identifiers = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    for (let i = 0; i < identifiers.length; i++) {
      if (studentKeyFromRow_(identifiers[i]) === targetKey) { targetRow = i + 2; break; }
    }
  }
  rowData = rowData.slice();
  rowData[0] = String(targetKey);
  // Format BEFORE writing, so Sheets never interprets a key as a date.
  sheet.getRange(targetRow, 1).setNumberFormat('@');
  sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
  SpreadsheetApp.flush();
}


/******************************************************
 * 관리자 토큰 확인
 ******************************************************/

function validateAdminToken_(token) {
  if (!token) {
    throw new Error(
      '관리자 인증이 필요합니다.'
    );
  }

  const value =
    CacheService
      .getScriptCache()
      .get('admin:' + token);

  if (value !== 'true') {
    throw new Error(
      '관리자 인증이 만료되었습니다. 다시 로그인해 주세요.'
    );
  }
}


/******************************************************
 * 비밀번호 SHA-256
 ******************************************************/

function sha256Hex_(text) {
  const digest =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      text,
      Utilities.Charset.UTF_8
    );

  return digest
    .map(function(byte) {
      const v =
        byte < 0
          ? byte + 256
          : byte;

      return (
        '0' +
        v.toString(16)
      ).slice(-2);
    })
    .join('');
}


/******************************************************
 * 관리자 비밀번호 해시 생성용
 *
 * 나중에 사용
 *
 * 아래 CHANGE_ME를 원하는 비밀번호로
 * 임시 변경한 후 실행
 *
 * 실행 로그에 나온 hash를
 * Script Properties의
 * ADMIN_PASSWORD_HASH에 저장
 ******************************************************/

function generateAdminPasswordHash() {
  throw new Error('비밀번호 원문을 소스나 로그에 저장하지 마세요. ADMIN_PASSWORD_HASH 속성을 직접 설정하세요.');
}


/******************************************************
 * 시트 헤더 확인 / 생성
 *
 * 기존 데이터가 있으면 삭제하지 않음
 ******************************************************/

function setupSheets() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(
    ss,
    SHEETS.ROSTER,
    HEADERS.ROSTER
  );

  ensureSheet_(
    ss,
    SHEETS.PROGRESS,
    HEADERS.PROGRESS
  );

  ensureSheet_(
    ss,
    SHEETS.SUBMISSIONS,
    HEADERS.SUBMISSIONS
  );

  console.log(
    '시트 설정 완료'
  );
}


function ensureSheet_(
  ss,
  sheetName,
  headers
) {
  let sheet =
    ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet =
      ss.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange('A:A').setNumberFormat('@');
    sheet
      .getRange(
        1,
        1,
        1,
        headers.length
      )
      .setValues([headers]);

    return;
  }

  const currentHeaders =
    sheet
      .getRange(
        1,
        1,
        1,
        headers.length
      )
      .getValues()[0];

  let empty = true;

  currentHeaders.forEach(function(value) {
    if (String(value).trim()) {
      empty = false;
    }
  });

  if (empty) {
    sheet
      .getRange(
        1,
        1,
        1,
        headers.length
      )
      .setValues([headers]);
  }
}


/******************************************************
 * 기본 Utility
 ******************************************************/

function getSheet_(sheetName) {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(
      sheetName +
      ' 시트를 찾을 수 없습니다.'
    );
  }

  return sheet;
}


function makeStudentKey_(
  grade,
  classNo,
  number
) {
  return (
    normalizeNumber_(grade) +
    '-' +
    normalizeNumber_(classNo) +
    '-' +
    normalizeNumber_(number)
  );
}


function normalizeStudentKey_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) return '';
    value = Utilities.formatDate(value, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'yyyy-M-d');
  }
  const text = String(value || '').trim().replace(/^'/, '').replace(/\s+/g, '');
  const match = text.match(/^(\d{1,4})-(\d{1,3})-(\d{1,3})$/);
  if (!match) return text;
  let grade = Number(match[1]);
  if (grade >= 2001 && grade <= 2003) grade -= 2000;
  if (grade < 1 || grade > 3 || Number(match[2]) < 1 || Number(match[3]) < 1) return '';
  return grade + '-' + Number(match[2]) + '-' + Number(match[3]);
}


function normalizeNumber_(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  const n =
    Number(String(value).trim());

  if (isNaN(n)) {
    return '';
  }

  return String(n);
}


function normalizeName_(value) {
  return String(value || '')
    .trim();
}


function normalizeAnswer_(value) {
  if (value === true) {
    return 'O';
  }

  if (value === false) {
    return 'X';
  }

  return String(value ?? '')
    .trim()
    .toUpperCase();
}


function normalizeAnswersObject_(answers) {
  if (!answers) {
    return {};
  }

  if (typeof answers === 'string') {
    return safeJsonParse_(
      answers,
      {}
    );
  }

  return answers;
}


function isTrue_(value) {
  if (value === true) return true;

  const text =
    String(value || '')
      .trim()
      .toUpperCase();

  return (
    text === 'TRUE' ||
    text === '1' ||
    text === 'Y' ||
    text === 'YES'
  );
}


function rowToObject_(
  headers,
  row
) {
  const obj = {};

  headers.forEach(
    function(header, index) {
      obj[String(header)] =
        row[index];
    }
  );

  return obj;
}


function safeJsonParse_(
  value,
  fallback
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}


function toIsoString_(value) {
  if (!value) return null;

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}


function parseRequest_(e) {
  if (!e) {
    return {};
  }

  // form-urlencoded 방식
  if (
    e.parameter &&
    Object.keys(e.parameter).length > 0
  ) {
    if (
      e.parameter.payload
    ) {
      return safeJsonParse_(
        e.parameter.payload,
        {}
      );
    }

    return e.parameter;
  }

  if (
    e.postData &&
    e.postData.contents
  ) {
    return safeJsonParse_(
      e.postData.contents,
      {}
    );
  }

  return {};
}

function getRosterOptions_() {
  const sheet = getSheet_(SHEETS.ROSTER);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return {
      grades: [],
      classesByGrade: {},
      numbersByGradeClass: {},
    };
  }

  const headers = values[0];

  const gradeSet = new Set();
  const classesByGradeSet = {};
  const numbersByGradeClassSet = {};

  for (let i = 1; i < values.length; i++) {
    const obj = rowToObject_(headers, values[i]);

    if (!isTrue_(obj.active)) {
      continue;
    }

    const grade = normalizeNumber_(obj.grade);
    const classNo = normalizeNumber_(obj.class);
    const number = normalizeNumber_(obj.number);

    if (!grade || !classNo || !number) {
      continue;
    }

    gradeSet.add(grade);

    if (!classesByGradeSet[grade]) {
      classesByGradeSet[grade] = new Set();
    }

    classesByGradeSet[grade].add(classNo);

    const gradeClassKey = grade + '-' + classNo;

    if (!numbersByGradeClassSet[gradeClassKey]) {
      numbersByGradeClassSet[gradeClassKey] = new Set();
    }

    numbersByGradeClassSet[gradeClassKey].add(number);
  }

  const grades = Array.from(gradeSet).sort(
    (a, b) => Number(a) - Number(b)
  );

  const classesByGrade = {};

  Object.keys(classesByGradeSet).forEach(function(grade) {
    classesByGrade[grade] = Array.from(
      classesByGradeSet[grade]
    ).sort((a, b) => Number(a) - Number(b));
  });

  const numbersByGradeClass = {};

  Object.keys(numbersByGradeClassSet).forEach(function(key) {
    numbersByGradeClass[key] = Array.from(
      numbersByGradeClassSet[key]
    ).sort((a, b) => Number(a) - Number(b));
  });

  return {
    grades: grades,
    classesByGrade: classesByGrade,
    numbersByGradeClass: numbersByGradeClass,
  };
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}

// Prefer the explicit grade/class/number columns over a legacy date-coerced key.
function studentKeyFromRow_(row) {
  const parts = [row[1], row[2], row[3]].map(value => Number(value));
  if (parts.every(value => Number.isInteger(value) && value > 0) && parts[0] <= 3) {
    return parts.join('-');
  }
  return normalizeStudentKey_(row[0]);
}

// Repairs ONLY the two explicitly authorized test students. It never returns student rows.
function repairAuthorizedTestStudents() {
  const allowed = {'2-5-25': '김과학', '2-5-26': '이삼진'};
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  const summary = {};
  try {
    [SHEETS.ROSTER, SHEETS.PROGRESS, SHEETS.SUBMISSIONS].forEach(function(sheetName) {
      const sheet = getSheet_(sheetName);
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return;
      const identifiers = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
      const seen = {};
      const duplicates = [];
      let repaired = 0;
      for (let i = 0; i < identifiers.length; i++) {
        const key = studentKeyFromRow_(identifiers[i]);
        if (!Object.prototype.hasOwnProperty.call(allowed, key)) continue;
        const rowNumber = i + 2;
        const name = normalizeName_(sheet.getRange(rowNumber, 5).getValue());
        if (name !== allowed[key]) continue;
        if (seen[key] && sheetName !== SHEETS.ROSTER) { duplicates.push(rowNumber); continue; }
        seen[key] = true;
        sheet.getRange(rowNumber, 1).setNumberFormat('@').setValue(String(key));
        repaired++;
      }
      duplicates.sort((a, b) => b - a).forEach(row => sheet.deleteRow(row));
      summary[sheetName] = {repaired: repaired, removedTestDuplicates: duplicates.length};
    });
    SpreadsheetApp.flush();
    console.log(JSON.stringify(summary));
    return summary;
  } finally { lock.releaseLock(); }
}

