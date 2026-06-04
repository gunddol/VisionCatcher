# VisionCatcher

비전캐처(Vision Catcher) 공식 랜딩페이지 — 정적 HTML/CSS/JS

## 구성 파일
- `index.html`: 메인 랜딩페이지
- `portfolio.html`: 포트폴리오 상세 페이지
- `styles.css`: 반응형 스타일
- `script.js`: 모바일 메뉴, 히어로 슬라이드
- `robots.txt`: 검색엔진 크롤링 설정
- `sitemap.xml`: 기본 사이트맵

## 배포 방법
정적 사이트이므로 아래 중 하나에 업로드하면 됩니다.

1. Cafe24 웹호스팅의 루트 디렉터리에 파일 업로드
2. Netlify / Vercel / Cloudflare Pages에 업로드
3. Nginx 또는 Apache 정적 파일 서버에 업로드

## 이미지 처리
현재 코드는 기존 Cafe24 이미지 URL을 외부 링크로 참조합니다. 완전 독립형으로 운영하려면 기존 이미지 파일을 다운로드하여 `assets/` 폴더에 넣고 CSS/HTML의 이미지 경로를 로컬 경로로 바꾸면 됩니다.

## SEO 반영 사항
- 쇼핑몰 회원가입/장바구니/주문조회 관련 요소 제거
- title, description, canonical, Open Graph 메타태그 적용
- LocalBusiness 구조화 데이터 적용
- robots.txt, sitemap.xml 포함

## 추후 연결 권장
- 문의 폼을 실제 접수하려면 Formspree, Netlify Forms, Google Apps Script, 자체 API 중 하나와 연결하면 됩니다.
- 포트폴리오를 자주 업데이트하려면 Notion, Google Sheet, Headless CMS 중 하나로 관리하는 방식을 권장합니다.
