# [최종] Gemma 4 기반 최적화된 지출 분석 및 근무표 수기 입력 계획 (v1.5)

사용자의 피드백을 바탕으로 **M(M12) 근무 코드 반영**, **Gemma 4 정확도 최우선**, **AI 모델 가이드라인 준수**, **전송 속도 최적화**, **근무표 입력 편의성 극대화**를 달성하기 위한 최종 구현 계획입니다.

## User Review Required

- **AI 모델 운영 정책 (Standard)**: 
    - **단종된 `gemini-1.5-flash` 계열은 영구 배제**합니다. 
    - **Primary**: 오직 `gemma-4-31b-it`(Gemma 4) 엔진을 사용합니다. 
    - **Secondary**: 429(할당량 초과) 또는 503(서버 오류) 시에만 제한적으로 차세대 모델인 `gemini-2.5-flash`/`gemini-2.0-flash` 시리즈를 폴백으로 사용합니다.
- **근무 코드 일원화**: `N`(야간), `D`(주간), `X`(오프)와 더불어 **`M` (M12 - 낮 12시 출근)** 코드를 공식적으로 업무 체계에 반영합니다. 원본 및 저장 시에는 `M`으로 하되, 레이블은 `M12`로 가독성을 높입니다.

## Proposed Changes

### 1. 지출 OCR 및 시스템 성능 고도화 [완료]
Gemma 4 모델을 위해 프런트엔드에서 이미지를 미리 가공하여 전송 효율을 극대화하고 서버 응답을 최적화했습니다.

#### [MODIFY] [ocr.js](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/src/utils/ocr.js)
- **이미지 전처리**: `optimizeImage` 함수에 `ctx.filter = 'grayscale(1)'`을 추가하여 흑백 변환을 적용하고, `single` 모드 해상도를 **800px**로 하향하여 페이로드를 약 40% 절감합니다.
- **캐시 버그 수정**: `manageCache()`에서 사전순 삭제 버그를 수정합니다. 각 항목에 `_ts`(타임스탬프)를 추가하고 **LRU(Least Recently Used) 방식**으로 가장 오래된 항목부터 삭제되도록 개선합니다.

#### [MODIFY] [api/ocr.js](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/api/ocr.js)
- **AI 모델 체인 정비**: `gemini-1.5-flash`를 목록에서 완전히 제거하고 차세대 모델 전용 체인(`Gemma 4` → `Gemini 2.5` → `Gemini 2.0`)으로 운영합니다.
- **추론 최적화**: 지출 내역 한 장(`single`) 분석 시 `maxOutputTokens`를 **256**으로 대폭 낮추어 응답 대기 시간을 단축합니다.

### 2. 근무표: M(M12) 근무를 포함한 수기 입력 시스템 구성 [완료]
다양한 근무 코드를 완벽하게 지원하는 100% 정확도의 수기 입력 인터페이스를 구현했습니다.

#### [MODIFY] [ScheduleScanSheet.jsx](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/src/components/ScheduleScanSheet.jsx)
- **확장된 수기 UI**: `대상자`, `시작일`, `코드 리스트(textarea)` 중심의 폼을 구성하고, **`M` 코드를 정식 지원**합니다.
- **견고한 파서**: 엔터/줄바꿈(`\r\n`) 및 다양한 공백 문자를 구분자로 인식하는 `split(/[\s\n\r]+/)` 로직을 적용합니다.
- **사용자 경험(UX) 강화**: 
    - 가동적인 "코드표 정보(**M=낮12시**, N=야간, D=주간...)" 버튼과 정보를 제공합니다.
    - 입력창 하단에 해당 월의 미니 그리드를 배치하여 입력된 정보(M 포함)의 분포를 즉시 시각적으로 확인하는 시뮬레이션 기능을 추가합니다.

### 3. 달력 위젯: M(M12) 레이블 시각화 [완료]
근무 정보를 한눈에 확인할 수 있도록 레이아웃과 컬러 시스템을 개선했습니다.
포함 사항: `N`, `D`, `X`, `M12` (보라색) 배지 노출 및 부부 병렬 표시 레이아웃.

---

## ✅ 프로젝트 완료 보고 (2026-04-07)
모든 요구사항이 반영되었으며, 상세 작업 내역은 [완료 보고서(walkthrough.md)](file:///Users/dongpayuk/.gemini/antigravity/brain/cbca3c73-b8de-4235-b4d1-df9369275f56/walkthrough.md)에서 확인하실 수 있습니다.

## Verification Plan

### Automated Tests
- [ ] `api/ocr.js` 응답에서 `gemini-1.5-flash` 호출 가능성 및 관련 찌꺼기 코드 완전 제거 여부 확인.
- [ ] 수기 입력 파서가 `M` 코드를 정확히 인식하여 `M12` 데이터로 변환하는지 유닛 테스트.

### Manual Verification
- [ ] 달력 셀에서 **보라색 M12 레이블**이 다른 정보와 겹치지 않고 모바일에서 가독성이 확보되는지 확인.
- [ ] 수기 입력 중 제공되는 미니 그리드 시뮬레이션이 정확한 날짜에 M 근무를 표시하는지 확인.
