# [COMPLETED] 초대 코드 합류 및 채널 관리 개선 계획 (v2.0 — 2026-04-22)

사용자의 상세 검증(Claude 코드 검증) 결과를 바탕으로, 실제 모듈형 코드베이스(`src/`)에 존재하는 버그를 수정하고 시스템의 안정성을 높이기 위한 계획입니다.

---

> [!WARNING]
> **[구조적 정정 및 이해 완료 — 2026-04-22]**
>
> 이전 플랜이 프로토타입 파일(`index.html`)을 전제로 했던 오류를 확인했습니다. 현재 앱의 실제 로직은 `src/views/SyncSetup.jsx`와 `src/App.jsx`에서 `householdId` 기반으로 관리되고 있으며, 사용자의 메모대로 기존 플랜에서 지적한 3가지 문제는 이미 해결되어 있음을 파악했습니다.
>
> 본 플랜은 사용자가 새롭게 발견한 **실제 버그 2건 및 개선 제안**을 반영하는 데 집중합니다.

---

## 1. 신규 발견 버그 수정 (우선순위: 🔴 높음)

### 🔴 버그 1: 실시간 채널 구독 정리(Cleanup) 누수 수정
- **현상**: `db.subscribe()` 이후 `subscription.unsubscribe()`만 호출하면 `db._channels` Map에서 채널이 제거되지 않아, 다시 합류할 때 닫힌 채널을 재사용하게 되어 실시간 수신이 불가능해집니다.
- **수정**: `App.jsx`의 cleanup 함수에서 `db.unsubscribe(householdId)`를 호출하도록 변경합니다.

```javascript
// [MODIFY] src/App.jsx (Line 325-331 부근)
useEffect(() => {
  if (!setupDone || !householdId) return;
  const subscription = db.subscribe(householdId, (key, value) => {
    updateSharedState(key, value);
  });
  // db.unsubscribe()는 내부적으로 supabase.removeChannel()과 Map.delete()를 모두 수행함
  return () => { db.unsubscribe(householdId); }; 
}, [setupDone, householdId, updateSharedState]);
```

### 🟡 버그 2: localStorage 중복 저장 제거 및 책임 일원화
- **현상**: `SyncSetup.jsx`와 `App.jsx` 양쪽에서 `householdId`를 저장하고 있어 코드 유지보수가 혼란스럽습니다.
- **수정**: `SyncSetup`에서는 저장 로직을 제거하고 `onDone` 콜백(App.jsx의 `handleSetupDone`)으로 모든 저장 책임을 위임합니다.

```javascript
// [MODIFY] src/views/SyncSetup.jsx (handleJoin 및 handleCreate)
// localStorage.setItem 호출 라인 삭제
onDone(hid, role); 
```

---

## 2. 시스템 안정성 개선 제안 (우선순위: 🟡 보통)

### 🟡 개선 1: 네트워크 타임아웃 처리 도입
- **현상**: `db.loadAll(hid)` 호출 시 네트워크 상태에 따라 무한 대기 상태에 빠질 수 있습니다.
- **수정**: `Promise.race`를 사용하여 10초 타임아웃을 적용합니다.

```javascript
// [MODIFY] src/views/SyncSetup.jsx (handleJoin 내부)
const data = await Promise.race([
  db.loadAll(hid),
  new Promise((_, reject) => setTimeout(() => reject(new Error("네트워크 타임아웃")), 10000))
]);
```

### 🟡 개선 2: 역할 중복 경고 (선택 사항)
- **현상**: 이미 파트너가 사용하는 역할을 선택하여 입장할 수 있습니다.
- **수정**: 합류 시 `loadAll` 결과의 `names` 정보를 확인하여 중복 역할을 선택했을 경우 경고 메시지를 표시합니다.

---

## 3. 빌드 및 배포 시스템 복구

현재 배포 시스템이 단일 `index.html`만 복사하도록 되어 있어, 수정된 `src/` 코드가 반영되지 않고 있습니다. 이를 Vite 빌드 방식으로 복구합니다.

### [MODIFY] [package.json](file:///Users/dongpayuk/wjin_forwork/어플개발_우진지연%20budget/package.json)
```json
"scripts": {
  "build": "vite build",
  "preview": "vite preview"
}
```

---

## 검증 계획 (현재 구현 기준)

1. **채널 누수 검증**: 가계부 합류 -> 나가기 -> 동일 코드로 재합류 후 실시간 데이터(지출 입력 등)가 정상 수신되는지 확인.
2. **저장 일관성 검증**: 온보딩 완료 후 `localStorage`에 `householdId`가 정확히 1회(App 수준에서) 저장되는지 확인.
3. **타임아웃 검증**: (테스트용) 네트워크 오프라인 상태에서 합류 시도 시 10초 후 정상적으로 에러 메시지가 뜨는지 확인.

---
> [!IMPORTANT]
> 사용자가 메모한 모든 세부 사항을 파악했으며, 특히 `db.unsubscribe` 누수 문제는 시스템 안정성에 핵심적이므로 최우선으로 반영하겠습니다. 주석과 메모를 모두 보존하며 작업을 진행할 준비가 되었습니다.

## 🏁 최종 구현 결과 요약 (2026-04-22)

### 1. 온보딩 및 동기화 안정화
- **실시간 채널 누수 수정**: `App.jsx` cleanup 시 `db.unsubscribe`를 호출하여 중복 채널 생성 및 수신 불능 문제를 원천 차단했습니다.
- **데이터 저장 책임 단일화**: `SyncSetup`의 직접적인 저장 로직을 제거하고 `App.jsx`로 일원화하여 데이터 무결성을 높였습니다.
- **역할 중복 방지**: 이미 파트너가 사용 중인 역할을 선택할 경우 경고를 띄워 잘못된 합류를 방지하는 로직을 추가했습니다.
- **네트워크 타임아웃**: 데이터 로딩 시 10초 타임아웃을 적용하여 무한 대기 현상을 방지했습니다.

### 2. 타입 시스템 고도화 및 빌드 에러 해결
- **`tsc` 빌드 오류 100% 해결**: `window` 객체 확장, CSS 속성 정의, `ArrayBuffer` 처리 등 총 9건 이상의 TypeScript 오류를 JSDoc 및 명시적 타입 캐스팅으로 해결했습니다.
- **`any` / `unknown` 제거**: 코드베이스 전반에서 느슨한 타입을 제거하고 `Plan`, `BudgetData`, `TxItem` 등 구체적인 인터페이스를 도입했습니다.
- **글로벌 타입 정의**: `constants/index.js`에 핵심 비즈니스 로직 타입을 정의하여 프로젝트 전반의 타입 일관성을 확보했습니다.

### 3. 검증 완료
- `npx tsc`를 통한 정적 타입 검사 통과.
- PWA 환경에서의 이미지/텍스트 공유(Share Target) 기능과 OCR 인식 로직의 타입 안정성 확인.
