# AI 사진 분석 프로세스 마스터 안정화 계획 (v5)

무료 티어의 환경적 제약을 기술적 설계로 극복하여, 404/429 오류를 방지하고 사용자에게 끊김 없는 경험을 제공하는 최종 안정성 강화 모델입니다.

## User Review Required

> [!IMPORTANT]
> - **Zero-Delay Serverless (Zero-Wait)**: 서버단(`api/ocr.js`)의 `delay()`를 완전히 제거하여 Vercel 504 타임아웃을 원천 차단합니다.
> - **Shared Global Cool-down**: `sessionStorage`를 활용해 앱 전체가 429 상태를 공유하며, 30초간 지능적으로 요청을 제한합니다.
> - **Status-Aware Errors**: 유틸리티 함수가 에러 발생 시 HTTP 상태 코드를 함께 던지도록 수정하여 UI가 에러 성격(429 vs 404)을 명확히 인지하게 합니다.

## Proposed Changes

### 1. API 엔진 규격화 (`api/ocr.js`)
- **모델 체인 고정**: `gemini-2.0-flash-lite` (1순위), `gemini-2.0-flash` (2순위)로 고정하여 404 및 성능 문제 해결.
- **URL 구조 최적화**: `v1beta/models/${model}:generateContent` 형식을 유지하되, 중복 접두사가 붙지 않도록 변수 관리.
- **디버깅 강화**: 에러 발생 시 반환하는 메시지의 길이를 충분히 늘려(슬라이싱 완화) 원인 파악 용이화.

### 2. 프론트엔드 유틸리티 고도화 (`src/utils/ocr.js`)
- **이미지 다이어트**: MAX_SIZE 1024px, JPEG Quality 0.75 적용 (기존 대비 용량 약 70% 절감).
- **에러 객체 확장**: `const err = new Error(msg); err.status = res.status; throw err;` 패턴 도입.
- **지능형 캐싱**: `ocr_${file.name}_${file.size}` 키를 사용하여 최근 3개의 분석 결과를 `sessionStorage`에 보관 (LRU 방식).

### 3. 컴포넌트 아키텍처 개선 (`useOcrScan` 훅 도입)
- **로직 공통화**: `CardScanSheet`, `ScheduleScanSheet`에서 공통으로 사용할 `useOcrScan` 커스텀 훅 설계.
  - `scanning`, `cooldown`, `error`, `data` 상태 관리.
  - 429 감지 시 `sessionStorage`의 전역 타임스탬프(`ocr_cooldown_until`) 업데이트.
- **전역 쿨다운 UI**: 카운트다운 타이머(30초)를 시각적으로 노출하고, 타이머 작동 중에는 업로드 영역의 클릭/드롭을 차단.

### 4. 캘린더 연동 강화
- `ScheduleScanSheet.jsx`를 최신 엔진에 맞춰 리팩토링하고, `useOcrScan` 훅을 적용하여 지출 스캔과 동일한 안정성 확보.

## Open Questions

> [!TIP]
> **Q: 캐싱은 어떤 범위까지 적용할까요?**
> A: 지출 내역(`runBulkOCR`)과 단건 영수증(`runOCR`)에 우선 적용합니다. 근무표(`runScheduleOCR`)는 사용자당 같은 파일을 반복 스캔할 확률이 낮으므로 2순위로 둡니다.
>
> **Q: 쿨다운 시간을 늘릴 필요가 있을까요?**
> A: 기본 30초로 시작하되, 연속해서 429를 맞을 경우 60초로 자동 연장되는 '가변 쿨다운' 방식도 고려 중입니다. 일단 30초 고정으로 안정성을 먼저 확인하겠습니다.

## Verification Plan

### Technical Checklist
1. **Network**: 동일 이미지 업로드 시 Preview 탭에서 API 호출이 일어나지 않는지 확인.
2. **Status Code**: 429 에러 발생 시 UI가 일반 에러가 아닌 "Cool-down UI"로 정확히 진입하는지 확인.
3. **Payload**: 전송되는 Base64 이미지의 용량이 1024px 최적화 이후 유의미하게 줄었는지 체크.
4. **Resiliency**: 한 채널(지출)에서 429 발생 후 다른 채널(캘린더) 이동 시 즉시 쿨다운이 적용되어 있는지 확인.
