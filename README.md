# 2026 한글날 퀴즈 (훈민정음 반포 580돌) 웹앱

중학교 학생들을 대상으로 한 **2026년 한글날 기념 퀴즈 웹앱**입니다.  
스마트폰 QR코드 접속에 최적화된 반응형 모바일 우선 UI와 데이터 안정성(진행 상황 실시간 자동저장, 중복 행 생성 방지, 중복 제출 차단, 서버 채점, 재응시 방지)을 갖추고 있습니다.

---

## 목차
1. [프로젝트 실행 방법 (npm install & dev)](#1-프로젝트-실행-방법)
2. [Google Sheets 생성 및 시트 구조](#2-google-sheets-생성-및-시트-구조)
3. [Google Apps Script 설치 및 배포 방법](#3-google-apps-script-설치-및-배포-방법)
4. [환경변수 (VITE_APPS_SCRIPT_URL) 설정 방법](#4-환경변수-설정-방법)
5. [Vercel 환경변수 및 배포 방법](#5-vercel-환경변수-및-배포-방법)
6. [교사용 관리자 비밀번호 Hash 생성 및 설정 방법](#6-교사용-관리자-비밀번호-hash-설정-방법)
7. [등급 캐릭터 이미지 파일 추가 방법](#7-등급-캐릭터-이미지-파일-추가-방법)
8. [GitHub → Vercel 배포 가이드](#8-github--vercel-배포-가이드)
9. [보안 및 데이터 무결성 설계 원칙](#9-보안-및-데이터-무결성-설계-원칙)

---

## 1. 프로젝트 실행 방법

### 로컬 개발 환경 실행
```bash
# 1. 의존성 패키지 설치
npm install

# 2. 로컬 개발 서버 시작
npm run dev
```

브라우저에서 `http://localhost:3000` (또는 지정된 포트)으로 접속합니다.  
*운영 API 환경변수 VITE_APPS_SCRIPT_URL이 필요합니다. 설정이 없으면 로그인과 제출을 차단하며 오류를 안내합니다.*

---

## 2. Google Sheets 생성 및 시트 구조

Google Drive에서 새로운 **Google 스프레드시트**를 하나 생성합니다.  
(스프레드시트 이름 예: `2026 한글날 퀴즈 결과`)

스프레드시트에는 다음 **3개의 시트**가 생성되어야 합니다:

### 1) `Roster` (학생 명단)
학교 학생 명단입니다. `active` 값이 `TRUE`인 학생만 로그인할 수 있습니다.
* **A열**: `studentKey` (예: `1-1-1`, `2-3-15`)
* **B열**: `grade` (학년 숫자, 예: `2`)
* **C열**: `class` (반 숫자, 예: `3`)
* **D열**: `number` (번호 숫자, 예: `15`)
* **E열**: `name` (이름, 예: `홍길동`)
* **F열**: `active` (`TRUE` 또는 `FALSE`)

### 2) `Progress` (이전 버전의 기록, 운영에서 사용하지 않음)
중간 진행은 학생별 React state와 localStorage에만 저장합니다. `saveProgress`와 `loadProgress`는 비활성화되어 있으며 문제 이동 시 서버 저장을 요청하지 않습니다. 기존 Progress 데이터는 자동으로 삭제하지 않습니다.
* **A열**: `studentKey`
* **B열**: `grade`
* **C열**: `class`
* **D열**: `number`
* **E열**: `name`
* **F열**: `answersJson` (현재까지 선택한 답안 JSON)
* **G열**: `currentQuestion` (현재 진행 문항 번호)
* **H열**: `quizStartedAt` (최초 퀴즈 시작 일시)
* **I열**: `updatedAt` (최근 저장 일시)
* **J열**: `submitted` (최종 제출 여부 `TRUE`/`FALSE`)

### 3) `Submissions` (최종 제출 결과)
최종 20번 문항 제출 시 기록되는 채점 결과입니다.  
**동일 학생 중복 제출 방지(LockService 및 멱등성)를 통해 학생당 반드시 1개의 행만 유지됩니다.**
* **A열**: `studentKey`
* **B열**: `grade`
* **C열**: `class`
* **D열**: `number`
* **E열**: `name`
* **F열**: `answersJson` (전체 20문항 답안)
* **G열**: `correctCount` (맞힌 개수)
* **H열**: `score` (총점, 문항당 5점)
* **I열**: `rankTitle` (등급명, 예: `한글 장원`)
* **J열**: `elapsedSeconds` (풀이 소요 시간 초 단위 - 교사 기록용)
* **K열**: `quizStartedAt` (최초 시작 시각)
* **L열**: `submittedAt` (최종 제출 시각)

> **💡 팁:** Google Apps Script의 `setupSheets()` 함수를 실행하면 위 3개 시트와 헤더, 서식이 1초 만에 자동 생성됩니다!

---

## 3. Google Apps Script 설치 및 배포 방법

1. 생성한 Google 스프레드시트 상단 메뉴에서 **[확장 프로그램] → [Apps Script]** 클릭.
2. 기본 생성된 `Code.gs` 내용을 모두 지우고, 이 프로젝트의 `/google-apps-script/Code.gs` 전체 내용을 복사하여 붙여넣습니다.
3. 상단 툴바에서 함수 목록 중 `setupSheets`를 선택하고 **[실행]** 버튼을 누릅니다.
   - 첫 실행 시 Google 계정 권한 승인 창이 나타나면 승인합니다.
   - 스프레드시트에 `Roster`, `Progress`, `Submissions` 시트가 자동으로 만들어집니다.
4. 상단 우측 파란색 **[배포] → [새 배포]** 버튼을 클릭합니다.
5. 톱니바퀴 아이콘을 눌러 **[웹 앱(Web App)]** 유형을 선택합니다.
   - **설명**: `2026 한글날 퀴즈 API`
   - **다음 사용자로 실행**: `나 (My account)`
   - **액세스 권한이 있는 사용자**: `모든 사용자 (Anyone)` *(중요: 학생 모바일 접속을 위해 반드시 '모든 사용자'로 설정해야 합니다)*
6. **[배포]** 버튼을 누르고 생성된 **웹 앱 URL** (형식: `https://script.google.com/macros/s/AKfycb.../exec`)을 복사합니다.

---

## 4. 환경변수 설정 방법

프로젝트 루트의 `.env` 파일에 발급받은 웹 앱 URL을 설정합니다.

```env
VITE_APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycb.../exec"
```

*웹앱 상단 헤더의 ⚙️(설정) 아이콘을 눌러 웹 인터페이스 상에서 직접 URL을 입력하고 **[연결 테스트]**를 진행할 수도 있습니다.*

---

## 5. Vercel 환경변수 및 배포 방법

1. GitHub 저장소에 코드를 push합니다.
2. [Vercel](https://vercel.com/) 대시보드에서 **[Add New...] → [Project]**를 선택하고 해당 GitHub 저장소를 Import합니다.
3. **Configure Project** 화면의 **Environment Variables** 항목에서 다음 환경변수를 추가합니다:
   - **Name**: `VITE_APPS_SCRIPT_URL`
   - **Value**: `https://script.google.com/macros/s/AKfycb.../exec` (본인의 Apps Script 배포 URL)
4. **[Deploy]** 버튼을 누르면 약 1~2분 후 배포가 완료됩니다.
5. 배포된 Vercel 도메인(`https://your-project.vercel.app`)으로 학생들에게 QR코드를 안내하시면 됩니다.

---

## 6. 교사용 관리자 비밀번호 Hash 설정 방법

보안을 위해 관리자 비밀번호 원문은 프론트엔드 코드에 절대 노출되지 않으며, Google Apps Script 서버 측에서 SHA-256 해시로 검증됩니다.

Apps Script의 프로젝트 설정 → 스크립트 속성에 `ADMIN_PASSWORD_HASH`를 설정합니다. 값은 관리자 비밀번호의 SHA-256 16진수 해시입니다. 기존 운영 속성은 유지합니다. 비밀번호 원문을 소스, GitHub 또는 실행 로그에 남기지 마세요. 기본 비밀번호는 없습니다.

프론트는 사용자가 입력한 비밀번호를 HTTPS로 `adminLogin`에 보내고 서버에서 해시를 비교합니다. 로그인 성공 후 관리자 토큰은 서버 캐시에 최대 6시간 유지됩니다.

---

## 7. 등급 캐릭터 이미지 파일 추가 방법

학생이 퀴즈를 마친 후 부여받는 5개 등급의 이미지를 커스텀할 수 있습니다.

이미지 경로: `public/assets/ranks/`
* `king.png` : **한글 대왕** (95~100점)
* `jangwon.png` : **한글 장원** (85~90점)
* `general.png` : **한글 장군** (70~80점)
* `scholar.png` : **한글 선비** (50~65점)
* `student.png` : **한글 학동** (0~45점)

> **💡 Zero-Broken-Image 폴백 시스템:**  
> 파일이 아직 업로드되지 않았거나 파일명이 일치하지 않더라도, 앱 내에 한국 전통 왕실 어새 및 낙관 문양의 전용 Fallback UI가 내장되어 있어 절대 화면이 깨지거나 빈 상자로 나오지 않습니다.

---

## 8. GitHub → Vercel 배포 가이드

```bash
# Git 초기화 및 커밋
git init
git add .
git commit -m "feat: 2026 한글날 퀴즈 웹앱 완성"

# 원격 저장소 연결 후 푸시
git branch -M main
git remote add origin https://github.com/사용자명/저장소명.git
git push -u origin main
```

이후 Vercel 대시보드에서 해당 저장소를 Import하면 즉시 자동 빌드되어 전 세계 어디서든 고속으로 접속 가능합니다. (Vercel SPA 새로고침 404 방지를 위해 `vercel.json` rewrite 설정이 사전 탑재되어 있습니다.)

---

## 9. 보안 및 데이터 무결성 설계 원칙

1. **서버 채점**: 학생 번들에서 정답 배열과 모의 채점을 제거했습니다. 정답과 채점 로직은 Apps Script 코드에만 존재합니다. 다만 이 저장소가 공개이면 서버 소스의 정답도 GitHub에서 볼 수 있으므로 시험 운영 시 저장소 공개 범위를 별도로 검토해야 합니다.
2. **동시성 보호 (LockService)**: 수십 명의 학생이 동시에 제출하더라도 Google Apps Script의 `LockService`가 행 덮어쓰기 충돌을 방지합니다.
3. **문자열 키와 중복 제출 방지**: Submissions는 `학년-반-번호` 문자열을 기준으로 비교합니다. 날짜로 변환된 기존 키는 학년·반·번호 열과 날짜 값을 정규화해 조회합니다. 새 제출의 A열 셀은 먼저 일반 텍스트(`@`)로 설정하고 문자열을 씁니다. 이미 제출한 학생은 기존 결과를 반환합니다. 새 시트 생성 시 Roster/Progress/Submissions의 A열 전체를 텍스트로 설정하지만 기존 실제 학생 셀은 일괄 변경하지 않습니다.
4. **재응시 및 중복 제출 차단**: 제출 완료(`isSubmitted=TRUE`)된 학생은 다시 로그인하더라도 문제 풀이 화면으로 진입할 수 없으며, 본인의 최종 결과 화면만 안전하게 다시 확인하게 됩니다.
9. **Roster 기반 동적 드롭다운 (개인정보 보호)**: 학생 로그인 화면 진입 시 `getRosterOptions`를 호출하여 실제 Roster에 등록된 학년, 반, 번호만 동적으로 구성합니다. 학생들의 실명 목록은 일체 클라이언트로 내려보내지 않으며, 학생 본인이 이름을 직접 입력하여 인증받습니다.
10. **브라우저 자동 번역 오작동 방지**: 모바일 크롬, 사파리 등의 자동 번역기가 「학년」을 「학과」 등으로 왜곡 번역하지 않도록 `translate="no"`, `notranslate`, `lang="ko"` 다중 보호 태그가 적용되어 있습니다.
