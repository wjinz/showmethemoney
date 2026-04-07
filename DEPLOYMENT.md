# Deployment Guide (배포 가이드)

프로젝트 배포 시 혼동을 방지하기 위한 상세 가이드입니다. 

## 🏗 Vercel Project Info

에이전트가 다른 프로젝트(`showmethemoney-eta`)와 혼동하지 않도록 주의가 필요합니다.

- **Vercel Project Name**: `showmethemoney`
- **Aliases (URL)**: `showmethemoney-eta.vercel.app`
- **Link Command**: 
  ```bash
  npx vercel link --yes --project showmethemoney
  ```

## ⚠️ 주의사항 (Caution)

1. **프로젝트명 주의**: 프로젝트명이 `showmethemoney-eta`인 별도의 Vercel 프로젝트가 존재할 수 있습니다. 해당 프로젝트로 배포 시 실제 서비스 주소와 다른 곳으로 연결되므로 주의가 필요합니다. 
2. **배포 시 확인**: 반드시 `Production: https://showmethemoney-eta.vercel.app`이 결과물로 나오는지 CLI에서 확인하십시오.

## 📁 폴더 정리 규칙

- **작업 히스토리**: `_history/` 폴더에 과거의 `plan.md`, `research.md` 등을 보관하여 루트 폴더를 깨끗하게 유지합니다.
- **문서 업데이트**: 새로운 배포 환경이나 이슈 발생 시 이 `DEPLOYMENT.md`에 기록하십시오.
