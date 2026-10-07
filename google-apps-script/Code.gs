/**
 * ==============================================================================
 * 2026 한글날 퀴즈 (훈민정음 반포 580돌) - Google Apps Script Web App API
 * ==============================================================================
 * 
 * [특징 및 데이터 무결성 보장]
 * 1. LockService를 사용하여 동시 다발적 요청에 대한 경쟁 상태(Race Condition) 방지
 * 2. studentKey (학년-반-번호) 기준 엄격한 UPSERT 처리 (중복 행 생성 원천 차단)
 * 3. 클라이언트 정답 비공개: 20문항 정답 데이터 및 채점 로직을 서버에서만 수행
 * 4. submitQuiz 멱등성(Idempotency) 보장: 중복 클릭 또는 재전송 시에도 기존 제출 결과 반환
 * 5. PropertiesService를 이용한 안전한 관리자 비밀번호 해시 관리
 * 6. ContentService를 통한 JSON 응답 반환 및 CORS 대응 (Simple Request text/plain 수신)
 */

// ==========================================
// 1. 서버 측 20문항 정답 데이터 (학생에게 절대 비공개)
// ==========================================
var SERVER_ANSWER_KEY = {
  1: '세종',
  2: 'O',
  3: 'X',
  4: '불쌍하고 가엾다',
  5: '어리석다',
  6: '리더십',
  7: '슈림프',
  8: '며칠',
  9: '웬',
  10: '금세 끝났다',
  11: '설렘',
  12: '오랜만',
  13: '얼굴이 희고 키가 헌칠한 모습',
  14: '맥없이 축 늘어진 모습',
  15: '외양이 말쑥하고 똑똑해 보이는 사람',
  16: '격에 맞지 않아 어울리지 않는 상황',
  17: '도무지 일어날 가망이 없는 일',
  18: '믿음성이 있고 믿을 만하다',
  19: '초저녁 서쪽 하늘에 보이는 금성',
  20: '충분히 익어 저절로 벌어진 과실'
};

// ==========================================
// 2. 등급 체계 정보
// ==========================================
function getRankInfo(score) {
  if (score >= 95) {
    return {
      title: '한글 대왕',
      image: '/assets/ranks/king.png',
      comment: '과인이 인정하노라!\n그대야말로 오늘의 진정한 한글 대왕이로다.'
    };
  } else if (score >= 85) {
    return {
      title: '한글 장원',
      image: '/assets/ranks/jangwon.png',
      comment: '훌륭하도다!\n한글 과거시험이 있었다면 장원급제했을 것이로다.'
    };
  } else if (score >= 70) {
    return {
      title: '한글 장군',
      image: '/assets/ranks/general.png',
      comment: '제법 실력이 있구나!\n당당한 한글 장군으로 인정하노라.'
    };
  } else if (score >= 50) {
    return {
      title: '한글 선비',
      image: '/assets/ranks/scholar.png',
      comment: '글 읽고 글 쓰는 멋이 있구나!\n조금 더 정진하면 더 높은 자리에 오를 수 있다.'
    };
  } else {
    return {
      title: '한글 학동',
      image: '/assets/ranks/student.png',
      comment: '배움의 첫걸음을 내디뎠구나!\n오늘 알게 된 한글과 우리말을 하나씩 익혀 보자.'
    };
  }
}

// ==========================================
// 3. 스프레드시트 헬퍼
// ==========================================
function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty('SPREADSHEET_ID');
  if (sheetId && sheetId.trim().length > 0) {
    return SpreadsheetApp.openById(sheetId.trim());
  }
  // 기본적으로 스크립트가 바인딩된 활성 시트 사용
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

// ==========================================
// 4. HTTP 요청 핸들러 (doGet, doPost)
// ==========================================
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'getRosterOptions') {
    return handleGetRosterOptions();
  }
  return respondJSON({
    ok: true,
    success: true,
    service: '2026 한글날 퀴즈 API',
    message: 'Google Apps Script Web App이 정상 작동 중입니다.'
  });
}

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : '';
    if (!contents) {
      return respondJSON({ success: false, ok: false, error: '요청 본문(Body)이 비어있습니다.', message: '요청 본문(Body)이 비어있습니다.' });
    }

    var data = JSON.parse(contents);
    var action = data.action;

    switch (action) {
      case 'getRosterOptions':
        return handleGetRosterOptions();

      case 'loginStudent':
        return handleLoginStudent(data);

      case 'loadProgress':
        return respondJSON({ ok: false, message: '진행 정보는 브라우저에만 저장됩니다.' });

      case 'saveProgress':
        return respondJSON({ ok: false, message: '진행 정보는 브라우저에만 저장됩니다.' });

      case 'submitQuiz':
        return handleSubmitQuiz(data);

      case 'adminLogin':
        return handleAdminLogin(data);

      case 'getDashboard':
        return handleGetDashboard(data);

      default:
        return respondJSON({ success: false, ok: false, error: '지원하지 않는 액션입니다: ' + action, message: '지원하지 않는 액션입니다: ' + action });
    }
  } catch (error) {
    return respondJSON({
      success: false,
      ok: false,
      error: '서버 내부 오류: ' + error.toString(),
      message: '서버 내부 오류: ' + error.toString()
    });
  }
}

function respondJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 5. 액션별 핸들러
// ==========================================

/**
 * 5-0. Roster 기반 학년/반/번호 옵션 조회 (학생 이름 비공개)
 */
function handleGetRosterOptions() {
  var ss = getSpreadsheet();
  var rosterSheet = ss.getSheetByName('Roster');

  if (!rosterSheet) {
    return respondJSON({
      success: false,
      ok: false,
      error: 'Roster 시트를 찾을 수 없습니다.',
      message: 'Roster 시트를 찾을 수 없습니다.'
    });
  }

  var rosterData = rosterSheet.getDataRange().getValues();
  if (rosterData.length <= 1) {
    return respondJSON({
      success: true,
      ok: true,
      grades: [],
      classesByGrade: {},
      numbersByGradeClass: {}
    });
  }

  var gradesSet = {};
  var classesByGrade = {};
  var numbersByGradeClass = {};

  // 컬럼: studentKey(A), grade(B), class(C), number(D), name(E), active(F)
  for (var i = 1; i < rosterData.length; i++) {
    var row = rosterData[i];
    var rGrade = (row[1] !== undefined && row[1] !== null) ? String(row[1]).trim() : '';
    var rClass = (row[2] !== undefined && row[2] !== null) ? String(row[2]).trim() : '';
    var rNumber = (row[3] !== undefined && row[3] !== null) ? String(row[3]).trim() : '';
    var rActive = row[5];

    var isActive = (rActive === true || rActive === 'TRUE' || rActive === 'true' || rActive === 1);
    if (!isActive || !rGrade || !rClass || !rNumber) continue;

    gradesSet[rGrade] = true;

    if (!classesByGrade[rGrade]) classesByGrade[rGrade] = {};
    classesByGrade[rGrade][rClass] = true;

    var gcKey = rGrade + '-' + rClass;
    if (!numbersByGradeClass[gcKey]) numbersByGradeClass[gcKey] = {};
    numbersByGradeClass[gcKey][rNumber] = true;
  }

  var sortedGrades = Object.keys(gradesSet).sort(function(a, b) {
    return Number(a) - Number(b);
  });

  var formattedClasses = {};
  for (var g in classesByGrade) {
    formattedClasses[g] = Object.keys(classesByGrade[g]).sort(function(a, b) {
      return Number(a) - Number(b);
    });
  }

  var formattedNumbers = {};
  for (var gc in numbersByGradeClass) {
    formattedNumbers[gc] = Object.keys(numbersByGradeClass[gc]).sort(function(a, b) {
      return Number(a) - Number(b);
    });
  }

  return respondJSON({
    success: true,
    ok: true,
    grades: sortedGrades,
    classesByGrade: formattedClasses,
    numbersByGradeClass: formattedNumbers
  });
}

/**
 * 5-1. 학생 로그인: Roster 확인 및 기존 상태 조회
 */
function handleLoginStudent(data) {
  var grade = String(data.grade !== undefined && data.grade !== null ? data.grade : '').trim();
  var classNum = String(data.class !== undefined && data.class !== null ? data.class : (data.classNum || '')).trim();
  var number = String(data.number !== undefined && data.number !== null ? data.number : '').trim();
  var name = String(data.name || '').trim();

  if (!grade || !classNum || !number || !name) {
    return respondJSON({
      success: false,
      ok: false,
      error: '학년, 반, 번호, 이름을 다시 확인해 주세요.',
      message: '학년, 반, 번호, 이름을 다시 확인해 주세요.'
    });
  }

  var studentKey = grade + '-' + classNum + '-' + number;
  var ss = getSpreadsheet();
  var rosterSheet = ss.getSheetByName('Roster');

  if (!rosterSheet) {
    return respondJSON({
      success: false,
      ok: false,
      error: 'Roster 시트를 찾을 수 없습니다. 관리자에게 문의하세요.',
      message: 'Roster 시트를 찾을 수 없습니다. 관리자에게 문의하세요.'
    });
  }

  var rosterData = rosterSheet.getDataRange().getValues();
  if (rosterData.length <= 1) {
    return respondJSON({
      success: false,
      ok: false,
      error: '학생 명단이 등록되어 있지 않습니다.',
      message: '학생 명단이 등록되어 있지 않습니다.'
    });
  }

  // Roster 시트 컬럼: studentKey(A), grade(B), class(C), number(D), name(E), active(F)
  var studentFound = false;
  for (var i = 1; i < rosterData.length; i++) {
    var row = rosterData[i];
    var rGrade = String(row[1] !== undefined ? row[1] : '').trim();
    var rClass = String(row[2] !== undefined ? row[2] : '').trim();
    var rNumber = String(row[3] !== undefined ? row[3] : '').trim();
    var rName = String(row[4] || '').trim();
    var rActive = row[5];

    var isActive = (rActive === true || rActive === 'TRUE' || rActive === 'true' || rActive === 1);

    if (rGrade === grade && rClass === classNum && rNumber === number && rName === name) {
      if (isActive) {
        studentFound = true;
        break;
      } else {
        return respondJSON({
          success: false,
          ok: false,
          error: '비활성화된 학생 계정입니다. 교사에게 문의하세요.',
          message: '비활성화된 학생 계정입니다. 교사에게 문의하세요.'
        });
      }
    }
  }

  if (!studentFound) {
    return respondJSON({
      success: false,
      ok: false,
      error: '학년, 반, 번호, 이름을 다시 확인해 주세요.',
      message: '학년, 반, 번호, 이름을 다시 확인해 주세요.'
    });
  }

  // Submissions 시트 확인: 이미 최종 제출한 학생인지 검사
  var subSheet = ss.getSheetByName('Submissions');
  if (subSheet) {
    var subData = subSheet.getDataRange().getValues();
    for (var s = 1; s < subData.length; s++) {
      var sKey = String(subData[s][0] || '').trim();
      if (sKey === studentKey) {
        var subScore = Number(subData[s][7]);
        var subRank = subData[s][8];
        var subElapsed = Number(subData[s][9]);
        var subSubmittedAt = subData[s][11];
        var rankInfo = getRankInfo(subScore);

        return respondJSON({
          success: true,
          ok: true,
          status: 'submitted',
          studentKey: studentKey,
          name: name,
          grade: grade,
          class: classNum,
          classNum: classNum,
          number: number,
          isSubmitted: true,
          hasProgress: true,
          finalResult: {
            studentKey: studentKey,
            name: name,
            grade: Number(grade),
            classNum: Number(classNum),
            number: Number(number),
            score: subScore,
            rankTitle: subRank || rankInfo.title,
            rankImage: rankInfo.image,
            rankComment: rankInfo.comment,
            submittedAt: subSubmittedAt ? subSubmittedAt.toString() : '',
            elapsedSeconds: subElapsed
          }
        });
      }
    }
  }

  // 진행 정보는 학생별 브라우저 저장소만 사용합니다.

  // 신규 응시 학생
  return respondJSON({
    success: true,
    ok: true,
    status: 'new',
    studentKey: studentKey,
    name: name,
    grade: grade,
    class: classNum,
    classNum: classNum,
    number: number,
    isSubmitted: false,
    hasProgress: false,
    currentQuestion: 1,
    savedAnswers: {}
  });
}

// 20문항 A/B/C/D 및 텍스트 매핑 테이블 (서버 채점용)
var LETTER_ANSWER_KEY = {
  1: 'B', 2: 'O', 3: 'X', 4: 'B', 5: 'C',
  6: 'A', 7: 'A', 8: 'B', 9: 'B', 10: 'B',
  11: 'B', 12: 'A', 13: 'A', 14: 'B', 15: 'A',
  16: 'B', 17: 'A', 18: 'B', 19: 'A', 20: 'C'
};

/**
 * 5-4. 최종 제출 (submitQuiz) - LockService + 멱등성 보장 + 서버 채점
 */
function handleSubmitQuiz(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return respondJSON({ success: false, ok: false, error: '서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.', message: '서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.' });
  }

  try {
    var studentKey = String(data.studentKey || '').trim();
    var grade = String(data.grade !== undefined ? data.grade : '').trim();
    var classNum = String(data.class !== undefined ? data.class : (data.classNum || '')).trim();
    var number = String(data.number !== undefined ? data.number : '').trim();
    var name = String(data.name || '').trim();

    var answersJsonStr = '';
    if (typeof data.answers === 'object' && data.answers !== null) {
      answersJsonStr = JSON.stringify(data.answers);
    } else if (typeof data.answersJson === 'string') {
      answersJsonStr = data.answersJson;
    } else {
      answersJsonStr = JSON.stringify(data.answers || data.answersJson || {});
    }

    var quizStartedAt = String(data.quizStartedAt || '');
    var now = new Date();
    var submittedAt = now.toISOString();

    if (!studentKey) {
      lock.releaseLock();
      return respondJSON({ success: false, ok: false, error: 'studentKey가 필요합니다.', message: 'studentKey가 필요합니다.' });
    }

    var expectedKey = grade + '-' + classNum + '-' + number;
    var roster = getSpreadsheet().getSheetByName('Roster');
    if (studentKey !== expectedKey || !roster) {
      lock.releaseLock();
      return respondJSON({ ok: false, message: '학생 정보를 다시 확인해 주세요.' });
    }
    var rosterRows = roster.getDataRange().getValues();
    var verified = rosterRows.slice(1).some(function(row) {
      return String(row[1]).trim() === grade && String(row[2]).trim() === classNum &&
        String(row[3]).trim() === number && String(row[4]).trim() === name &&
        (row[5] === true || String(row[5]).toLowerCase() === 'true');
    });
    if (!verified) {
      lock.releaseLock();
      return respondJSON({ ok: false, message: '학생 정보를 다시 확인해 주세요.' });
    }

    var ss = getSpreadsheet();
    var subSheet = getOrCreateSheet(ss, 'Submissions');
    var subData = subSheet.getDataRange().getValues();

    // 1. 멱등성 검사: 이미 Submissions에 존재하는 학생인지 확인
    for (var s = 1; s < subData.length; s++) {
      if (String(subData[s][0] || '').trim() === studentKey) {
        var existingScore = Number(subData[s][7]);
        var existingRank = String(subData[s][8] || '');
        var existingElapsed = Number(subData[s][9]);
        var existingSubmittedAt = String(subData[s][11] || '');
        var rankMeta = getRankInfo(existingScore);

        lock.releaseLock();
        return respondJSON({
          success: true,
          ok: true,
          result: {
            studentKey: studentKey,
            name: name,
            grade: Number(grade),
            classNum: Number(classNum),
            number: Number(number),
            score: existingScore,
            rankTitle: existingRank || rankMeta.title,
            rankImage: rankMeta.image,
            rankComment: rankMeta.comment,
            submittedAt: existingSubmittedAt,
            elapsedSeconds: existingElapsed
          }
        });
      }
    }

    // 2. 서버 측 20문항 정답 채점 (정답 데이터는 클라이언트에 절대 전송하지 않음)
    var studentAnswers = {};
    try {
      studentAnswers = JSON.parse(answersJsonStr);
    } catch (e) {
      studentAnswers = {};
    }

    if (!studentAnswers || typeof studentAnswers !== 'object' || Array.isArray(studentAnswers) ||
        Object.keys(studentAnswers).length !== 20) {
      lock.releaseLock();
      return respondJSON({ ok: false, message: '20문항 모두 답을 선택해 주세요.' });
    }
    for (var questionId = 1; questionId <= 20; questionId++) {
      var allowed = questionId === 2 || questionId === 3 ? ['O', 'X'] :
        ([6, 7, 12].indexOf(questionId) >= 0 ? ['A', 'B'] : ['A', 'B', 'C', 'D']);
      if (allowed.indexOf(studentAnswers[questionId]) < 0) {
        lock.releaseLock();
        return respondJSON({ ok: false, message: '유효하지 않은 답안입니다.' });
      }
    }
    var correctCount = 0;
    for (var qId = 1; qId <= 20; qId++) {
      var studentAns = String(studentAnswers[qId] || '').trim();
      var correctAns = String(SERVER_ANSWER_KEY[qId] || '').trim();
      var correctLetter = String(LETTER_ANSWER_KEY[qId] || '').trim();

      // 보기 텍스트 또는 A/B/C/D 기호 모두 정답 판정
      if (studentAns === correctAns || (correctLetter && studentAns.toUpperCase() === correctLetter)) {
        correctCount++;
      }
    }

    var score = correctCount * 5; // 문항당 5점, 총점 100점
    var rankInfo = getRankInfo(score);

    // 3. 풀이 시간 계산 (초 단위)
    var elapsedSeconds = 0;
    if (quizStartedAt) {
      var startParsed = new Date(quizStartedAt);
      if (!isNaN(startParsed.getTime())) {
        elapsedSeconds = Math.max(1, Math.round((now.getTime() - startParsed.getTime()) / 1000));
      }
    }

    // 4. Submissions 시트에 저장 (studentKey당 반드시 1행만 존재)
    var subRow = [
      studentKey,
      grade,
      classNum,
      number,
      name,
      answersJsonStr,
      correctCount,
      score,
      rankInfo.title,
      elapsedSeconds,
      quizStartedAt,
      submittedAt
    ];
    subSheet.appendRow(subRow);

    SpreadsheetApp.flush();
    lock.releaseLock();

    return respondJSON({
      success: true,
      ok: true,
      result: {
        studentKey: studentKey,
        name: name,
        grade: Number(grade),
        classNum: Number(classNum),
        number: Number(number),
        score: score,
        rankTitle: rankInfo.title,
        rankImage: rankInfo.image,
        rankComment: rankInfo.comment,
        submittedAt: submittedAt,
        elapsedSeconds: elapsedSeconds
      }
    });
  } catch (err) {
    lock.releaseLock();
    return respondJSON({ success: false, ok: false, error: '최종 제출 처리 중 오류: ' + err.toString(), message: '최종 제출 처리 중 오류: ' + err.toString() });
  }
}

/**
 * 5-5. 관리자 로그인 (adminLogin)
 */
function handleAdminLogin(data) {
  var password = (data.password || '').toString();
  var props = PropertiesService.getScriptProperties();
  var savedHash = props.getProperty('ADMIN_PASSWORD_HASH');

  var isValid = false;
  if (savedHash) {
    var inputHash = computeSha256(password);
    isValid = (inputHash === savedHash);
  }

  if (isValid) {
    var token = 'admin_session_' + Utilities.getUuid();
    // 토큰 1일 유효 저장
    props.setProperty(token, new Date().getTime().toString());
    return respondJSON({ ok: true, token: token });
  } else {
    return respondJSON({ ok: false, message: '관리자 비밀번호가 올바르지 않습니다.' });
  }
}

/**
 * 5-6. 교사용 대시보드 데이터 조회 (getDashboard)
 */
function handleGetDashboard(data) {
  var token = (data.token || '').toString();
  var password = (data.password || '').toString();
  var props = PropertiesService.getScriptProperties();

  var authorized = false;
  if (token && token.indexOf('admin_session_') === 0 && props.getProperty(token)) {
    var issuedAt = Number(props.getProperty(token));
    authorized = issuedAt > 0 && Date.now() - issuedAt < 24 * 60 * 60 * 1000;
  } else if (password) {
    var savedHash = props.getProperty('ADMIN_PASSWORD_HASH');
    if (savedHash && computeSha256(password) === savedHash) {
      authorized = true;
    }
  }

  if (!authorized) {
    return respondJSON({ ok: false, message: '관리자 인증이 필요합니다.' });
  }

  var filterGrade = Number(data.grade) || 0;
  var filterClass = Number(data.classNum || data.class) || 0;

  var ss = getSpreadsheet();
  var subSheet = ss.getSheetByName('Submissions');
  if (!subSheet) {
    return respondJSON({ ok: true, totalCount: 0, students: [] });
  }

  var subData = subSheet.getDataRange().getValues();
  var results = [];

  // 컬럼: studentKey(0), grade(1), class(2), number(3), name(4), answersJson(5), correctCount(6), score(7), rankTitle(8), elapsedSeconds(9), quizStartedAt(10), submittedAt(11)
  for (var i = 1; i < subData.length; i++) {
    var row = subData[i];
    var sKey = (row[0] || '').toString().trim();
    if (!sKey) continue;

    var sGrade = Number(row[1]);
    var sClass = Number(row[2]);
    var sNumber = Number(row[3]);
    var sName = (row[4] || '').toString();
    var sScore = Number(row[7]);
    var sRank = (row[8] || '').toString();
    var sElapsed = Number(row[9]);
    var sSubmittedAt = (row[11] || '').toString();

    // 학년 / 반 필터 적용
    if (filterGrade > 0 && sGrade !== filterGrade) continue;
    if (filterClass > 0 && sClass !== filterClass) continue;

    results.push({
      studentKey: sKey,
      grade: sGrade,
      classNum: sClass,
      number: sNumber,
      name: sName,
      score: sScore,
      rankTitle: sRank,
      elapsedSeconds: sElapsed,
      submittedAt: sSubmittedAt
    });
  }

  // 정렬: 학년 오름차순 -> 반 오름차순 -> 번호 오름차순
  results.sort(function(a, b) {
    if (a.grade !== b.grade) return a.grade - b.grade;
    if (a.classNum !== b.classNum) return a.classNum - b.classNum;
    return a.number - b.number;
  });

  return respondJSON({
    ok: true,
    totalCount: results.length,
    students: results
  });
}

// ==========================================
// 6. 관리자 유틸리티 및 초기 설정 함수
// ==========================================

function computeSha256(text) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  var hexString = '';
  for (var i = 0; i < rawHash.length; i++) {
    var byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    var byteHex = byteVal.toString(16);
    if (byteHex.length == 1) byteHex = '0' + byteHex;
    hexString += byteHex;
  }
  return hexString;
}

/**
 * 교사용 비밀번호를 설정하는 유틸리티 함수.
 * Google Apps Script 편집기에서 setAdminPassword('원하는비밀번호') 실행
 */
function setAdminPassword(plainPassword) {
  var hash = computeSha256(plainPassword);
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD_HASH', hash);
  Logger.log('관리자 비밀번호 해시 설정 완료');
}

/**
 * 시트 자동 초기화 함수 (최초 1회 실행)
 * Roster, Progress, Submissions 3개 시트를 생성하고 헤더 서식을 적용합니다.
 */
function setupSheets() {
  var ss = getSpreadsheet();

  // 1. Roster 시트 설정
  var rosterSheet = getOrCreateSheet(ss, 'Roster');
  if (rosterSheet.getLastRow() === 0) {
    rosterSheet.appendRow(['studentKey', 'grade', 'class', 'number', 'name', 'active']);
    // 헤더 서식
    var rHeader = rosterSheet.getRange(1, 1, 1, 6);
    rHeader.setBackground('#1e3a8a').setFontColor('#ffffff').setFontWeight('bold');
    rosterSheet.setFrozenRows(1);
  }

  // 2. Progress 시트 설정
  var progSheet = getOrCreateSheet(ss, 'Progress');
  if (progSheet.getLastRow() === 0) {
    progSheet.appendRow([
      'studentKey',
      'grade',
      'class',
      'number',
      'name',
      'answersJson',
      'currentQuestion',
      'quizStartedAt',
      'updatedAt',
      'submitted'
    ]);
    var pHeader = progSheet.getRange(1, 1, 1, 10);
    pHeader.setBackground('#0f766e').setFontColor('#ffffff').setFontWeight('bold');
    progSheet.setFrozenRows(1);
  }

  // 3. Submissions 시트 설정
  var subSheet = getOrCreateSheet(ss, 'Submissions');
  if (subSheet.getLastRow() === 0) {
    subSheet.appendRow([
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
      'submittedAt'
    ]);
    var sHeader = subSheet.getRange(1, 1, 1, 12);
    sHeader.setBackground('#881337').setFontColor('#ffffff').setFontWeight('bold');
    subSheet.setFrozenRows(1);
  }

  Logger.log('시트 초기화 완료: Roster, Progress, Submissions');
}
