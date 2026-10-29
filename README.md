# VisionCatcher

비전캐처(Vision Catcher) 공식 랜딩페이지 — 정적 HTML/CSS/JS

## 프로젝트 구조

```text
.
├── index.html                 # 메인 랜딩페이지
├── about.html                 # 회사소개·연혁
├── business.html              # 사업 영역·제작 프로세스
├── portfolio.html             # Instagram 연동 포트폴리오
├── contact.html               # 문의 정보
├── 404.html
├── styles.css                 # 공통·반응형 스타일
├── script.js                  # 메뉴·모션·피드·필터
├── assets/                    # 실제 사용하는 로고와 파비콘
├── lambda/instagram-feed/     # Instagram 동기화 Lambda
├── infra/                     # AWS CloudFormation 템플릿
├── scripts/                   # 검증·토큰 저장·수동 배포 도구
├── docs/                      # 배포 계획 문서
└── .github/workflows/         # 검증 및 운영 배포 CI/CD
```

## 검증과 배포

```bash
./scripts/validate-site.sh
```

운영 도메인은 `https://visioncatcher.kr`입니다. `main` 브랜치에 변경사항을 푸시하면 GitHub Actions가 정적 파일 검증 후 비공개 S3 버킷에 동기화하고 CloudFront 캐시를 무효화합니다. AWS 인증에는 장기 키 대신 GitHub OIDC 임시 자격 증명을 사용합니다. 상세 구성은 `docs/AWS_DEPLOYMENT_PLAN.md`와 `infra/static-site.yml`을 참고하세요.

## Instagram 포트폴리오 자동 연동

EventBridge가 6시간마다 Lambda를 실행합니다. Lambda는 Instagram API에서 최근 게시물을 읽고 대표 이미지를 사이트 S3 버킷에 복사한 뒤 `/portfolio-feed.json`을 갱신합니다. 브라우저는 Instagram API나 액세스 토큰에 직접 접근하지 않습니다. API 장애 시에는 `portfolio.html`의 대표 작업 카드가 대체 콘텐츠로 유지됩니다.

- 토큰: SSM Parameter Store `/visioncatcher/instagram/access-token` (`SecureString`)
- 공개 데이터: S3의 `portfolio-feed.json`, `portfolio-media/`
- 토큰 갱신: Lambda가 7일 간격으로 장기 토큰 갱신을 시도
- 피드 갱신: EventBridge `rate(6 hours)`
- 로그 보존: CloudWatch Logs 14일

토큰 교체:

```bash
./scripts/store-instagram-token.sh
```

인프라 수동 배포:

```bash
./scripts/deploy-instagram-feed.sh
```

`main` 브랜치 배포 시 GitHub Actions가 정적 사이트와 Lambda 코드를 함께 업데이트합니다. 토큰 값은 GitHub에 저장하지 않습니다.

## 이미지 처리

브랜드 자산은 `assets/home_logo.png`, `assets/onlyV_logo.png`만 관리합니다. 현장 이미지는 현재 Cafe24 CDN URL을 사용하므로, 완전한 AWS 독립 운영이 필요하면 S3로 이전하고 HTML의 이미지 URL을 교체해야 합니다.

## SEO 반영 사항
- 쇼핑몰 회원가입/장바구니/주문조회 관련 요소 제거
- 회사소개서 2026 기준 title, description, canonical, Open Graph 메타태그 적용
- 회사소개서 2026 기준 LocalBusiness 구조화 데이터, 주소, 연락처, 대표 사업 영역 반영
- 원페이지 구조를 홈 허브 + 회사소개/사업소개/포트폴리오/문의 상세 페이지 구조로 분리
- robots.txt, sitemap.xml 포함

## 추후 연결 권장
- 문의 폼을 실제 접수하려면 Formspree, Netlify Forms, Google Apps Script, 자체 API 중 하나와 연결하면 됩니다.
