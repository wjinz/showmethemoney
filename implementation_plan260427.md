# 지출 입력 개선 및 월간 정산 계산기 고도화 통합 계획 (2026-04-27 20:11)

본 문서는 지출 입력 UI의 모호성 해결과 월간 정산 기능을 '수기 계산기' 형태로 고도화하기 위한 통합 계획서입니다. 사용자 피드백([wody])을 반영하여 최종 확정되었습니다.

## 📜 프로젝트 히스토리 및 작업 가이드라인

### 히스토리 요약
- **v4.0.0+**: 부부 다이어리 중심 아키텍처로 전환 완료. 실시간 동기화 및 Bulk OCR 최적화 적용.
- **인사이트**: 단순 지출 추적을 넘어 '기록과 공유'의 가치 강조. 이번 작업은 이를 바탕으로 정산의 명확성을 높이는 데 집중함.

### 작업 원칙 (Working Guidelines)
1. **Type-First**: 구현 전 데이터 모델(`Interface/Type`) 정의.
2. **SRP & Line Limit**: 함수 20줄, 파일 150줄 이내 유지.
3. **Guard Clauses**: 예외 케이스 우선 처리로 중첩 if-else 방지.
4. **Functional Purity**: 비즈니스 로직은 순수 함수로 작성.
5. **Unified Error Handling**: 표준 에러 객체 및 사용자/개발용 로그 구분.

## 🌐 배포 및 주요 파일 정보

- **배포 URL**: [https://showmethemoney-eta.vercel.app](https://showmethemoney-eta.vercel.app)
- **주요 관련 파일**:
    - [App.jsx](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/src/App.jsx), [BudgetContext.jsx](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/src/context/BudgetContext.jsx)
    - [InputSheet.jsx](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/src/components/InputSheet.jsx), [SettlementView.jsx](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/src/views/SettlementView.jsx), [constants/index.js](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/src/constants/index.js)

---

## 🛠️ 최종 제안된 변경 사항 (피드백 반영)

### 1. 데이터 모델 확장 (Type-First)
`SettlementItem` 타입을 확장하여 부부 개별 현금 및 기타 비용 내역을 관리합니다.

```javascript
/** 
 * @typedef {{ label: string, amount: number }} ExtraExpense
 * @typedef {{ id: number, date: string, cardBills: CardBill[], fixedCash: number, husbandCash: number, wifeCash: number, extraExpenses: ExtraExpense[], expectedShortage: number, salary?: number }} SettlementItem 
 */
```

### 2. 지출 입력 시트 (InputSheet) 고도화
- **[피드백 반영] 메모 필드 제거**: 항목명이 명확하므로 불필요한 전체 메모란을 삭제하여 공간 확보.
- **[신규] 실시간 예산 현황(Budget Insight)**: 항목의 카테고리 선택 시, 해당 카테고리의 **당월 잔여 예산**을 실시간으로 표시하여 소비 결정을 지원.
- **옵션 자동화**: '총액 공유' 및 '세부 내역 숨기기'를 기본값(`true`)으로 고정하고 UI에서 제거.

```javascript
// 카테고리별 실시간 잔액 계산 로직 적용
{it.cat && (
  <div className="budget-insight-chip">
    {CATS.find(c=>c.id===it.cat).label} 잔액: {fmtMoney(remains)}
  </div>
)}
```

### 3. 월간 정산 수기 계산기 (SettlementView)
- **자산 입력 세분화**: 남편 현금, 아내 현금을 각각 입력할 수 있는 필드 구성.
- **기타 비용 동적 추가**: 고정비 외에 발생하는 추가 지출 내역 리스트 구현.
- **최종 계산**: `(총 현금) - (카드 + 고정비 + 기타비용) = 최종 잔액`을 직관적으로 표시.

---

## ✅ 검증 계획
1. **지출 입력**: 카테고리 변경 시 예산 잔액 칩이 정확히 갱신되는지 확인.
2. **정산 계산기**: 부부 현금 및 기타 비용 합산/차감이 정확히 동작하는지 확인.
3. **데이터 무결성**: 정산 내역 저장 후 재조회 시 모든 입력 값이 유지되는지 확인.
