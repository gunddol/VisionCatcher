# Vision Catcher 웹사이트 AWS 배포 계획서

- 작성일: 2026-10-06
- 대상 도메인: `visioncatcher.kr` (`www`는 대표 주소로 리다이렉트)
- 대상 리전: 서울(`ap-northeast-2`)을 기본으로 가정
- 대상 코드: 현재 저장소의 정적 HTML/CSS/JavaScript 랜딩페이지

## 1. 결론

현재 사이트는 **EC2, 상시 구동 백엔드, 데이터베이스가 모두 필요하지 않다.**

현 단계의 권장 구성은 다음과 같다.

```text
사용자
  └─ Route 53 또는 기존 DNS
      └─ CloudFront + ACM(HTTPS)
          └─ 비공개 S3 버킷
              └─ HTML / CSS / JS / 이미지
```

정적 파일은 S3에 저장하고 CloudFront로 전달하는 편이 EC2 한 대에서 Nginx로 제공하는 방식보다 저렴하고, 장애 대응과 보안 패치 부담이 적으며, 트래픽 증가에도 자동으로 대응한다. AWS도 정적 웹사이트에 S3와 CloudFront 또는 Amplify Hosting을 권장한다.

백엔드와 DB는 다음 기능을 실제로 도입할 때만 추가한다.

- 문의 내용을 사이트에서 직접 접수하고 저장할 때
- Instagram 최신 게시물을 자동으로 불러올 때
- 관리자 페이지에서 포트폴리오를 등록·수정할 때
- 회원, 예약, 결제, 견적 상태 관리가 필요할 때

초기 출시에는 `S3 + CloudFront + ACM + DNS`만 사용하고, 문의 폼 또는 Instagram 자동 피드를 구현할 때 `API Gateway + Lambda`를 추가하는 방식을 권장한다. 단순 문의 알림만 필요하면 DB 없이 SES 이메일 발송만으로 충분하다.

## 2. 현재 사이트 분석

### 2.1 코드와 용량

- 프레임워크나 빌드 과정이 없는 정적 HTML/CSS/JavaScript 사이트
- HTML 5개: 메인, 회사소개, 사업소개, 포트폴리오, 문의
- 로컬 소스 및 자산 총량: 약 **329 KiB**
- 저장소 전체 크기: 약 **1 MiB**
- 로컬 이미지: 로고 이미지 2개, 합계 약 **212 KiB**
- 서버 측 코드, 패키지 매니저, 로그인, 세션, API, DB 연결 없음
- 문의 기능은 현재 `mailto:` 링크
- Instagram은 현재 프로필 링크와 정적 카드만 제공

이 크기에서는 CPU나 메모리보다 이미지 전송량과 외부 이미지 응답 속도가 사용자 체감 성능을 좌우한다.

### 2.2 외부 의존성

현재 일부 이미지가 `file.cafe24cos.com`, `ecimg.cafe24img.com`에 있고 Pretendard 폰트가 jsDelivr CDN에서 로드된다.

운영 전 다음 조치를 권장한다.

1. 사용 권한이 확인된 Cafe24 이미지를 내려받아 자체 S3 버킷으로 이전한다.
2. 이미지 파일을 WebP 또는 AVIF로 최적화하고 원본 PNG/JPEG를 대체한다.
3. 장기적으로 폰트도 자체 호스팅하여 외부 CDN 장애와 정책 변경의 영향을 줄인다.
4. 이미지에는 명시적인 크기와 지연 로딩을 적용해 레이아웃 이동과 초기 전송량을 줄인다.

외부 이미지가 현재 저장소에 포함되지 않았으므로 실제 페이지 전송 크기는 329 KiB보다 크다. 최종 이전 후 Chrome Lighthouse와 네트워크 패널로 페이지별 전송량을 다시 측정해야 한다.

## 3. 서비스별 필요 여부

### 프론트엔드 호스팅 — 필요

권장 서비스는 S3와 CloudFront다.

- S3: HTML, CSS, JavaScript, 이미지 원본 저장
- CloudFront: 전 세계 CDN, 캐시, HTTPS 종단, 보안 헤더 적용
- ACM: 무료 공개 인증서 발급 및 자동 갱신
- Route 53: 선택 사항. 도메인 DNS가 이미 다른 업체에 있으면 해당 업체 DNS에서 CloudFront로 연결해도 된다.

S3 버킷은 공개 웹사이트 버킷으로 열지 않고, CloudFront Origin Access Control(OAC)을 통해서만 읽도록 구성한다.

### EC2 — 현 단계에서는 불필요

현재 사이트에는 서버에서 실행할 코드가 없다. EC2를 사용하면 다음 운영 업무가 추가된다.

- OS와 Nginx 보안 업데이트
- SSH 접근 통제와 키 관리
- 장애 및 디스크 사용량 모니터링
- 인증서 갱신 관리 또는 CloudFront/ALB 추가
- 인스턴스 장애 시 복구
- 고정 공인 IPv4 비용

따라서 “AWS에 배포한다”는 요구가 반드시 “EC2를 사용한다”는 의미가 아니라면 EC2를 사용하지 않는 것이 합리적이다.

### 백엔드 — 현재 불필요, 일부 기능 도입 시 필요

현재는 이메일·전화·SNS 외부 링크만 있어 백엔드가 필요 없다.

다음 단계에서 권장하는 백엔드는 상시 EC2 서버가 아니라 서버리스 방식이다.

```text
브라우저
  └─ API Gateway HTTP API
      └─ Lambda
          ├─ SES: 문의 알림 메일
          ├─ DynamoDB: 문의 저장이 필요할 때만
          └─ Instagram API: 최신 피드 조회 및 캐싱
```

API Gateway HTTP API는 REST API보다 기능이 단순하지만 이 프로젝트의 문의 접수와 피드 조회에는 충분하다. Lambda와 함께 요청이 있을 때만 실행되므로 소규모 기업 사이트에 적합하다.

### 데이터베이스 — 현재 불필요

DB를 도입할지 여부는 “사이트 운영자가 나중에 검색·처리해야 하는 데이터가 있는가”로 판단한다.

- 문의를 이메일로만 전달: DB 불필요
- 문의 이력, 처리 상태, 담당자 메모 관리: DynamoDB 필요
- Instagram 응답을 짧게 캐싱: DynamoDB 또는 S3 JSON 파일 중 하나 사용
- 관리자 페이지에서 콘텐츠 편집: DynamoDB 또는 CMS 도입 검토
- 회원·예약·복잡한 관계형 데이터: 이 단계에서 Aurora Serverless v2 또는 RDS 검토

현재 트래픽과 데이터 구조에서 RDS를 미리 만드는 것은 비용과 관리 부담만 늘리므로 권장하지 않는다.

## 4. 권장 아키텍처

### 4.1 1단계: 정적 사이트 출시

구성 요소:

- S3 비공개 버킷 1개
- CloudFront 배포 1개
- ACM 인증서 1개
- Route 53 Hosted Zone 1개 또는 기존 DNS
- CloudWatch 기본 지표
- AWS Budget 월 예산 알림

캐시 정책:

- 파일명이 고정된 HTML: 짧은 캐시 또는 `no-cache`
- CSS/JS/이미지: 배포 시 파일명에 버전을 붙이고 1년 캐시
- 현재처럼 파일명이 고정된 상태로 시작한다면 CSS/JS는 짧은 TTL로 두고 배포마다 CloudFront invalidation 수행

보안 정책:

- S3 Block Public Access 활성화
- CloudFront OAC 사용
- HTTPS 강제 리다이렉트
- TLS 1.2 이상
- `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` 적용
- IAM 배포 권한은 해당 버킷과 CloudFront invalidation에만 제한

### 4.2 2단계: 문의 폼 추가

추천 흐름:

```text
문의 폼 → API Gateway → Lambda → 입력 검증
                               ├─ SES로 담당자 알림
                               └─ DynamoDB 저장(선택)
```

필수 보호 장치:

- 서버 측 필수값·길이·형식 검증
- 허용 Origin 제한 CORS
- 허니팟 필드 또는 CAPTCHA
- API Gateway throttling
- 로그에 전화번호·이메일·문의 원문을 그대로 남기지 않기
- 개인정보 수집·이용 동의 문구와 보유 기간 명시
- DB 저장 시 TTL 또는 정기 삭제 정책 설정

단순히 담당자에게 이메일을 보내는 것이 목적이라면 DynamoDB를 생략한다. 접수 목록과 처리 상태를 관리해야 할 때만 저장한다.

### 4.3 3단계: Instagram 자동 피드 추가

추천 흐름:

```text
EventBridge 일정 실행
  └─ Lambda가 Instagram API 조회
      └─ 정제된 feed.json을 S3에 저장
          └─ CloudFront가 사용자에게 캐시 제공
```

이 방식은 방문할 때마다 Instagram API를 호출하지 않으므로 API 제한, 응답 지연, 토큰 노출 위험을 줄인다.

- Instagram 계정은 Business 또는 Creator 계정이어야 한다.
- Meta 앱과 Instagram Login 권한 설정이 필요하다.
- 앱 비밀값과 액세스 토큰은 브라우저 코드에 넣지 않는다.
- 토큰은 AWS Systems Manager Parameter Store SecureString 또는 Secrets Manager에 저장한다.
- 15분~1시간 간격으로 피드를 갱신하면 회사 포트폴리오 사이트에는 충분하다.
- API 장애 시 마지막으로 성공한 `feed.json`을 계속 제공한다.

### 4.4 4단계: 운영 기능 확장

아래 요구가 생기면 별도 재설계를 진행한다.

- 포트폴리오 CMS
- 관리자 로그인과 권한 관리
- 견적 워크플로우
- 파일 업로드
- 예약 또는 결제

이 시점에는 Cognito, API Gateway, Lambda, DynamoDB 또는 관리형 CMS를 비교한다. 관리 화면과 관계형 업무 데이터가 커질 때만 RDS 계열을 검토한다.

## 5. 권장 사이징

### 정적 프론트엔드

초기 저장 공간은 **1 GB 이하**면 충분하다. 실제 소스는 약 329 KiB지만, 외부 이미지를 자체 호스팅하고 향후 포트폴리오가 늘어나는 상황을 고려한 여유치다.

초기 트래픽 가정:

- 월 방문자: 1,000~10,000명
- 1인당 페이지뷰: 2~4회
- 최적화 후 페이지당 전송량: 1~3 MB 목표
- 월 CDN 전송량: 약 2~120 GB 범위

위 범위에서는 CloudFront 무료 또는 저사용량 구간으로 시작할 수 있다. 이미지·영상이 크게 늘면 영상은 웹 서버가 아니라 YouTube/Vimeo 같은 스트리밍 서비스 또는 별도 미디어 전략을 사용한다.

### Lambda

- 런타임: Node.js LTS
- 메모리: 문의 API 128~256 MB
- 제한 시간: 문의 API 5~10초, Instagram 동기화 15~30초
- 동시성: 기본값으로 시작, 비정상 호출 방지를 위해 reserved concurrency 2~5 검토
- 로그 보존: 14일 또는 30일

### DynamoDB를 추가하는 경우

- 문의량이 적고 예측하기 어려우면 On-demand 모드
- 기본 키 예시: `inquiryId`
- 보조 속성: `createdAt`, `name`, `contact`, `message`, `status`
- 개인정보 보유 기간에 맞춰 TTL 적용
- Point-in-time recovery는 문의가 핵심 영업 데이터일 때 활성화

### EC2가 반드시 필요한 경우

단순 정적 사이트만 제공한다면 다음보다 큰 사양은 필요 없다.

- 인스턴스: `t4g.nano`(2 vCPU, 0.5 GiB) 가능
- 운영 안정성을 위한 권장 최소: `t4g.micro`(2 vCPU, 1 GiB)
- OS: Amazon Linux 2023 ARM64
- 웹 서버: Nginx
- EBS: gp3 8~12 GiB
- 네트워크: Elastic IP 1개, 보안 그룹 80/443 허용
- 관리: SSH 22번을 전체 공개하지 않고 SSM Session Manager 사용 권장

Nginx와 정적 파일만 실행하면 `t4g.nano`도 처리량은 충분하지만, 패키지 업데이트와 운영 도구의 메모리 여유를 고려하면 `t4g.micro`가 안전하다. ARM 비호환 소프트웨어를 추가할 계획이면 `t3.micro`를 대안으로 사용한다.

EC2 한 대만 사용하는 구성은 단일 장애점이다. 회사소개 사이트의 초기 운영에는 감수할 수 있지만, 고가용성을 위해 ALB와 다중 AZ 인스턴스를 추가하는 것은 현재 규모에 비해 과도하다. 고가용성이 중요하면 처음부터 S3와 CloudFront를 선택한다.

## 6. 비용 예상

아래 금액은 저트래픽 초기 운영을 가정한 계획용 범위이며, 세금·환율·도메인 등록비·실제 이미지 전송량은 제외한다. 배포 직전 AWS Pricing Calculator로 서울 리전의 최종 금액을 다시 산출한다.

### 권장안: S3 + CloudFront

- 예상: 월 **USD 1~5 내외**
- AWS의 정적 사이트 안내는 일반적인 소규모 사이트를 무료 티어 밖에서 월 USD 1~3 수준으로 안내한다.
- CloudFront Free 플랜은 월 100 GB 전송과 100만 요청 범위를 제공하며, 플랜에 연결된 Route 53 Hosted Zone의 표준 비용도 포함한다. Paid account 자격과 플랜 연결 상태를 운영 중 확인한다.
- ACM 공개 인증서는 CloudFront에 연결해 사용할 때 별도 인증서 비용이 없다.

### 권장 확장안: 서버리스 문의·Instagram

- 예상: 월 **USD 1~10 내외**(매우 낮은 요청량 기준)
- Lambda는 월 100만 요청과 400,000 GB-second 무료 구간을 제공한다.
- API Gateway는 신규 계정에 HTTP API 월 100만 호출 무료 구간이 있고, 이후에도 호출량 기반 과금이다.
- DynamoDB는 저장이 필요할 때만 추가하며 소규모 문의 데이터는 매우 작은 용량이다.
- SES는 발송량 기반 과금이며 수십~수백 건의 문의 알림에서는 비용 영향이 작다.

### EC2 사용안

- 예상: 월 **USD 12~25 이상**
- 인스턴스 사용료, gp3 EBS, 스냅샷, 데이터 전송, DNS 비용을 합산해야 한다.
- 공인 IPv4 한 개는 시간당 USD 0.005로, 30일 상시 사용 시 약 USD 3.60이 추가된다.
- 관리 작업과 장애 위험은 비용표에 포함되지 않는 운영 비용이다.

결론적으로 현재 사이트에서는 EC2가 비용과 관리 측면 모두 불리하다.

## 7. 배포 절차

### 1단계 — 사전 정리

1. 외부 Cafe24 이미지의 소유권과 사용 범위를 확인한다.
2. 외부 이미지를 내려받아 WebP/AVIF로 최적화한다.
3. HTML의 외부 이미지 URL을 로컬 `assets/` 경로로 변경한다.
4. `visioncatcher.kr`의 현재 등록기관과 DNS 관리 위치를 확인한다.
5. 루트 도메인과 `www` 중 대표 주소를 정하고 나머지는 리다이렉트한다.

### 2단계 — AWS 기반 구성

1. 서울 리전에 프론트엔드 S3 버킷을 생성한다.
2. Block Public Access를 유지한다.
3. CloudFront 배포와 OAC를 생성해 S3를 Origin으로 연결한다.
4. `us-east-1`에서 CloudFront용 ACM 인증서를 발급한다.
5. 도메인 DNS 검증을 완료하고 CloudFront Alternate Domain Name을 설정한다.
6. Route 53 또는 기존 DNS에서 A/AAAA Alias 또는 CNAME을 설정한다.
7. HTTPS 리다이렉트와 보안 헤더 정책을 적용한다.

### 3단계 — 첫 배포

1. 정적 파일을 S3에 동기화한다.
2. HTML은 짧은 캐시, 해시 또는 버전이 붙은 자산은 긴 캐시로 설정한다.
3. CloudFront invalidation을 수행한다.
4. Chrome에서 데스크톱·모바일 화면, 링크, 메뉴, 모션을 확인한다.
5. Lighthouse로 성능, 접근성, SEO, Best Practices를 점검한다.
6. `robots.txt`, `sitemap.xml`, canonical URL이 운영 도메인과 일치하는지 확인한다.

### 4단계 — 배포 자동화

현재 사이트는 빌드 단계가 없으므로 CI/CD는 아래 두 작업이면 충분하다.

```text
main 브랜치 변경
  ├─ 정적 파일 검사
  ├─ aws s3 sync
  └─ CloudFront invalidation
```

GitHub Actions를 사용할 경우 장기 Access Key를 저장하지 않고 GitHub OIDC로 제한된 IAM Role을 Assume하도록 구성한다. 별도 Git 저장소 연동이 어렵다면 AWS CLI 배포 스크립트로 시작해도 된다.

### 5단계 — 운영 준비

- AWS Budget: 월 USD 10 경고, 월 USD 20 경고 등 두 단계 설정
- CloudFront 4xx/5xx 비율 알람
- S3 버전 관리 여부 결정
- 배포 전후 백업 또는 Git 태그 생성
- CloudTrail 기본 감사 로그 확인
- 담당자와 장애 연락 방법 기록
- 월 1회 비용과 외부 링크 정상 여부 확인

## 8. EC2 배포가 확정된 경우의 실행안

조직 정책상 EC2가 반드시 필요하다면 다음 최소 구성을 사용한다.

```text
사용자
  └─ DNS
      └─ Elastic IP
          └─ EC2 t4g.micro
              ├─ Nginx
              └─ /var/www/visioncatcher 정적 파일
```

구현 항목:

1. Amazon Linux 2023 ARM64와 `t4g.micro` 생성
2. gp3 8~12 GiB 할당
3. Elastic IP 연결
4. 보안 그룹에서 80/443만 공개
5. SSM Session Manager를 활성화하고 SSH 공개 포트는 닫기
6. Nginx 설치 및 정적 파일 배치
7. Certbot으로 인증서를 관리하거나 CloudFront를 EC2 앞에 추가
8. system update, Nginx 상태, 디스크 사용량을 정기 점검
9. 주기적인 EBS 스냅샷과 복구 절차 마련

백엔드를 같은 EC2에 나중에 함께 올릴 수는 있지만 권장하지 않는다. 사이트 장애와 API 장애가 한 서버에 묶이고, Instagram 토큰과 문의 데이터의 보안 경계도 약해진다. 기능이 추가될 때는 Lambda 기반으로 분리하거나 별도 애플리케이션 계층을 설계한다.

## 9. 테스트 및 완료 기준

배포 완료로 판단하려면 아래 조건을 모두 충족해야 한다.

- `https://visioncatcher.kr` 접속 성공
- HTTP 접속이 HTTPS로 리다이렉트
- 루트 도메인과 `www`의 대표 주소 정책 정상
- Chrome 최신 버전과 모바일 화면에서 레이아웃 정상
- 모든 내부 페이지와 CTA 링크 정상
- Instagram, Kakao, Blog, 이메일, 전화 링크 정상
- S3 객체가 직접 공개되지 않고 CloudFront를 통해서만 접근
- 인증서 자동 갱신 가능 상태
- 404 페이지 또는 오류 응답 정책 확인
- Lighthouse 주요 항목 점검
- CloudFront 캐시 갱신 절차 검증
- 예산 알림 수신 확인
- 롤백용 이전 배포본 또는 Git 태그 확보

## 10. 의사결정 사항

실제 배포 전에 다음 네 가지만 확정하면 된다.

1. EC2 사용이 필수 조건인지, AWS 안에서 호스팅하는 것이 조건인지
2. 도메인의 현재 등록기관과 DNS 관리 권한 보유 여부
3. 문의를 단순 이메일로 받을지, 사이트 폼과 접수 이력을 운영할지
4. Instagram을 링크만 유지할지, Business/Creator 계정 API로 자동 피드를 만들지

권장 결정은 다음과 같다.

- 호스팅: S3 + CloudFront
- DNS: 기존 DNS 유지 가능, 필요 시 Route 53 이전
- 문의: 초기에는 이메일 링크 유지, 다음 단계에 Lambda + SES 폼 추가
- DB: 초기 미사용, 문의 이력 관리가 필요해질 때 DynamoDB 추가
- Instagram: 초기 링크 유지, 계정 전환과 Meta 앱 준비 후 EventBridge + Lambda + S3 캐시 방식 추가

## 11. 참고 자료

- [AWS: S3 정적 웹사이트 호스팅](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [AWS: CloudFront를 이용한 안전한 정적 웹사이트](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/getting-started-secure-static-website-cloudformation-template.html)
- [AWS: 정적 웹사이트 호스팅 실습과 비용 안내](https://docs.aws.amazon.com/hands-on/latest/host-static-website/host-static-website.html)
- [AWS: API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
- [AWS Lambda 요금](https://aws.amazon.com/lambda/pricing/)
- [Amazon DynamoDB 요금](https://aws.amazon.com/dynamodb/pricing/)
- [Amazon Route 53 요금](https://aws.amazon.com/route53/pricing/)
- [Amazon VPC 공인 IPv4 요금](https://aws.amazon.com/vpc/pricing/)
- [Amazon EC2 T4g 사양](https://aws.amazon.com/ec2/instance-types/t4/)
- [Amazon CloudFront 요금](https://aws.amazon.com/cloudfront/pricing/)
