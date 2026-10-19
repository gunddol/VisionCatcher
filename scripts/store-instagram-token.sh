#!/usr/bin/env bash
set -euo pipefail

profile="${AWS_PROFILE:-visioncatcher-prod}"
region="${AWS_REGION:-ap-northeast-2}"
parameter_name="/visioncatcher/instagram/access-token"

printf 'Instagram access token (입력 내용은 표시되지 않습니다): '
IFS= read -r -s token
printf '\n'

if [[ ${#token} -lt 20 ]]; then
  unset token
  echo '토큰이 너무 짧습니다. Meta에서 생성한 전체 액세스 토큰을 다시 입력하세요.' >&2
  exit 1
fi

printf '%s' "$token" | aws ssm put-parameter \
  --profile "$profile" \
  --region "$region" \
  --name "$parameter_name" \
  --description 'Vision Catcher Instagram API access token' \
  --type SecureString \
  --value file:///dev/stdin \
  --overwrite \
  --tier Standard \
  --query '{Version:Version,Tier:Tier}' \
  --output json

unset token
echo "토큰을 AWS SSM SecureString에 저장했습니다: $parameter_name"
