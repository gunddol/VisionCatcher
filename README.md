# VisionCatcher

비전캐처(Vision Catcher) 공식 랜딩페이지 — 정적 HTML/CSS/JS

## 구성 파일
- `index.html`: 메인 랜딩페이지
- `about.html`: 회사소개, 경쟁력, 연혁
- `business.html`: 사업소개, 제작 프로세스, 행사 유형
- `portfolio.html`: 포트폴리오 상세 페이지
- `contact.html`: 문의 정보
- `styles.css`: 반응형 스타일
- `script.js`: 모바일 메뉴, 히어로 슬라이드, 포트폴리오 필터, 내부 페이지 헤더 상태
- `robots.txt`: 검색엔진 크롤링 설정
- `sitemap.xml`: 기본 사이트맵

## 배포 방법
정적 사이트이므로 아래 중 하나에 업로드하면 됩니다.

1. Cafe24 웹호스팅의 루트 디렉터리에 파일 업로드
2. Netlify / Vercel / Cloudflare Pages에 업로드
3. Nginx 또는 Apache 정적 파일 서버에 업로드

현재 운영 배포의 기준 도메인은 `https://visioncatcher.kr`입니다. AWS 운영 환경은 비공개 S3 버킷과 CloudFront를 사용하며, `main` 브랜치 변경 시 GitHub Actions가 OIDC 임시 자격 증명으로 자동 배포합니다. 상세 구성과 절차는 `docs/AWS_DEPLOYMENT_PLAN.md` 및 `infra/static-site.yml`을 참고하세요.

## 이미지와 포트폴리오 처리
현재 코드는 기존 Cafe24 이미지 URL을 외부 링크로 참조합니다. 완전 독립형으로 운영하려면 기존 이미지 파일을 다운로드하여 `assets/` 폴더에 넣고 CSS/HTML의 이미지 경로를 로컬 경로로 바꾸면 됩니다.

포트폴리오는 별도 업로드 기능보다 인스타그램 게시글을 중심으로 보여주는 구조입니다. 실제 게시글을 사이트 안에 자동 노출하려면 아래 중 하나가 필요합니다.

1. Instagram Graph API를 사용할 수 있는 비즈니스/크리에이터 계정과 액세스 토큰
2. 사이트에 노출할 개별 인스타그램 게시글 URL 목록
3. 외부 위젯 서비스 또는 자체 서버를 통한 피드 캐싱

## SEO 반영 사항
- 쇼핑몰 회원가입/장바구니/주문조회 관련 요소 제거
- 회사소개서 2026 기준 title, description, canonical, Open Graph 메타태그 적용
- 회사소개서 2026 기준 LocalBusiness 구조화 데이터, 주소, 연락처, 대표 사업 영역 반영
- 원페이지 구조를 홈 허브 + 회사소개/사업소개/포트폴리오/문의 상세 페이지 구조로 분리
- robots.txt, sitemap.xml 포함

## 추후 연결 권장
- 문의 폼을 실제 접수하려면 Formspree, Netlify Forms, Google Apps Script, 자체 API 중 하나와 연결하면 됩니다.
- 인스타그램 자동 피드는 브라우저에서 직접 가져오기보다 서버/API 레이어에서 캐싱해 노출하는 방식을 권장합니다.
