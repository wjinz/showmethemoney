# [최종 통합 계획] 부부 다이어리 7대 핵심 개선 및 기능 고도화 (2026-04-25 00:20)

본 계획서는 이전의 모든 요구사항을 하나로 통합하여, 코드베이스 수준의 상세한 구현 전략과 코드 스니팻을 포함한 최종 가이드입니다.

---

## 1. 다이어리 중심의 입력 흐름으로 전환 (FAB 동작 변경)
- **목표**: 하단 중앙의 '입력' 버튼 클릭 시 즉시 다이어리 작성 화면이 나타나도록 함.
- **수정 파일**: `src/components/Nav.jsx`, `src/App.jsx`
- **구현 내용**:
    - `Nav.jsx`의 FAB 클릭 시 `setView("quickEntry")` 대신 `setDiarySheet(myRole)`를 호출하도록 변경.
    - `InputSheet.jsx`의 `mode` 초기값을 `'diary'`로 설정하여 다이어리 탭이 먼저 보이게 함.

```javascript
// src/components/Nav.jsx (FAB 부분)
<button onClick={() => setDiarySheet(myRole)}> ... </button>

// src/components/InputSheet.jsx (상태 초기화)
const [mode, setMode] = useState('diary');
```

## 2. 지출 항목별(Itemized) 카테고리 및 결제수단 설정
- **목표**: 한 건의 지출 기록 내에서 여러 항목을 입력할 때, 항목마다 다른 카테고리와 카드를 지정 가능하게 함.
- **수정 파일**: `src/components/InputSheet.jsx`, `src/components/DetailSheet.jsx`
- **구현 내용**:
    - `items` 상태 구조 변경: `[{ id, label, amount, cat, payMethod, cardId }]`.
    - 항목 리스트의 각 행에 '설정' 아이콘 버튼 추가 -> 클릭 시 해당 항목의 카테고리/결제수단을 선택하는 확장 영역 표시.
    - 저장 시 `expenseItems` 배열에 개별 항목의 모든 속성을 포함.

```javascript
// InputSheet.jsx - 항목 추가 시 기본값
const addItem = () => setItems(prev => [...prev, {
  id: Date.now(), label: '', amount: '',
  cat: 'food', payMethod: 'credit', cardId: cards[0]?.id || ''
}]);
```

## 3. 사용자 선택 기능 제거 및 현재 사용자 자동 반영
- **목표**: 입력 시 '누구인지' 선택하는 단계를 없애고 현재 로그인된 사용자로 자동 기록.
- **수정 파일**: `src/components/InputSheet.jsx`
- **구현 내용**:
    - 상단의 `who-selector` (👨 남편 / 👩 와이프) 컴포넌트 삭제.
    - `who` 상태를 props로 전달받은 `defaultWho` (현재 사용자의 `myRole`)로 고정.

## 4. 전체 레이아웃 짤림 및 여백 문제 해결
- **목표**: 모바일 브라우저의 상/하단 툴바 간섭으로 인한 콘텐츠 짤림 방지.
- **수정 파일**: `src/styles/theme.css`
- **구현 내용**:
    - `.view`와 `.scroll-area`에 하단 네비게이션 높이와 safe-area를 반영한 패딩 적용.
    - 하단 여백 토큰 사용: `padding-bottom: calc(var(--nav-h) + env(safe-area-inset-bottom) + 20px)`.

## 5. 설정 - 기본 정보(부부 이름) 수정 기능 구현
- **목표**: '추후 업데이트'로 되어있던 이름 수정 기능을 활성화.
- **수정 파일**: `src/views/SettingsView.jsx`
- **구현 내용**:
    - `NameEditSheet` (신규 인라인 컴포넌트 혹은 모달) 구현.
    - `names.husband`, `names.wife`를 수정하여 `setNames` 호출.

```javascript
// SettingsView.jsx 내부 로직 예시
const [editName, setEditName] = useState(false);
...
{editName && (
  <SimpleModal onClose={() => setEditName(false)}>
    <input value={names.husband} onChange={e => setNames({...names, husband: e.target.value})} />
    <input value={names.wife} onChange={e => setNames({...names, wife: e.target.value})} />
  </SimpleModal>
)}
```

## 6. 데이터 초기화 기능 세분화 (선택적 삭제)
- **목표**: 지출, 다이어리, 설정 등 영역별로 선택하여 초기화할 수 있는 기능 추가.
- **수정 파일**: `src/views/SettingsView.jsx`, `src/App.jsx`
- **구현 내용**:
    - 초기화 버튼 클릭 시 `ResetOptionsSheet` 오픈.
    - 체크박스 리스트: `지출 내역 삭제`, `일기 내역 삭제`, `설정(예산/카드) 초기화`.
    - 선택된 항목에 따라 `db.save` 및 `setShared` 호출.

## 7. 다이어리 화면 예산 연동 로직 정상화
- **목표**: 다이어리 상단 배너의 '남은 예산'이 하드코딩되지 않고 실제 데이터와 연동되게 함.
- **수정 파일**: `src/views/DiaryView.jsx`
- **구현 내용**:
    - `useBudget`을 통해 `budgets` 상태를 가져와 `totalBudget` 계산.
    - `currentMonthDiaries`에서 이번 달 지출 총합을 구하여 `remaining` 계산.

```javascript
// src/views/DiaryView.jsx (정확한 연동 로직)
const totalBudget = Object.values(budgets).reduce((s, v) => s + (Number(v) || 0), 0);
const currentMonthSpent = diaries
  .filter(d => d.date.startsWith(CURRENT_MONTH) && d.type === 'expense')
  .reduce((s, d) => s + (d.totalSpent || 0), 0);
const remaining = totalBudget - currentMonthSpent;
```

---

## 검증 계획 (Verification Plan)

### 1. 자동 검증 (Automated)
- `npm run build`: 전체 프로젝트 빌드 성공 여부 확인.
- `tsc --noEmit`: 타입 오류가 없는지 체크.

### 2. 수동 검증 (Manual)
- [ ] 하단 '+' 버튼 클릭 시 다이어리 입력창이 뜨는지 확인.
- [ ] 지출 항목별로 카테고리를 다르게 설정했을 때 저장 후 상세 화면에서 각각 잘 보이는지 확인.
- [ ] 설정에서 이름을 바꾸고 다이어리 카드의 이름이 바뀌는지 확인.
- [ ] 초기화 모달에서 '다이어리만 삭제'가 정상 작동하는지 확인.
- [ ] 예산 관리에서 총액 수정 시 다이어리 배너의 '남은 금액'이 바뀌는지 확인.
