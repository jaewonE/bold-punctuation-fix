# Bold Punctuation Fix

[ [English](https://github.com/jaewonE/bold-punctuation-fix) | [한국어](https://github.com/jaewonE/bold-punctuation-fix/blob/master/README.ko.md) ]

Bold Punctuation Fix는 문장부호 경계 때문에 `**` 표지가 잘못 해석되는 Obsidian Markdown 굵게 구간을 고칩니다. HTML 태그를 넣지 않고 Markdown 원문만 대치합니다.

## 기능

- 현재 노트에만 명시적으로 적용하며, 편집기를 감시하거나 Vault 전체를 스캔하지 않습니다.
- 안전하지 않은 `**...**` 구간의 앞뒤 문장부호를 굵게 범위 밖으로 이동합니다.
- `나는 **"안녕하세요"**라고`를 `나는 "**안녕하세요**"라고`로 변환합니다.
- ASCII, 인용부호, CJK 문장부호를 처리합니다.
- 주변 문맥이 이미 올바른 일반 굵게 구간은 바꾸지 않습니다.
- YAML frontmatter, fenced code block, 인라인 코드, 이스케이프된 표지, Markdown 링크, 위키링크, `***` delimiter run은 건너뜁니다.
- 문자열 길이를 유지하므로 예측 가능한 하나의 편집 동작으로 대치됩니다.

## 동작 방식

명령은 보호된 Markdown 구간 밖에서 정확한 리터럴 `**...**` 구간을 찾습니다. 문장부호가 텍스트와 맞닿아 여는 표지 또는 닫는 표지가 안전하지 않으면, 이동 가능한 모든 경계 문장부호를 굵게 범위 밖으로 옮기고 안쪽 텍스트만 굵게 남깁니다.

다음 Markdown:

```markdown
나는 **"안녕하세요"**라고 말했다.
가**(오늘)**
**「메모」**라고
```

은 다음으로 변환됩니다.

```markdown
나는 "**안녕하세요**"라고 말했다.
가(**오늘**)
「**메모**」라고
```

`™`, `©`, 이모지는 이 변환에서 문장부호 경계로 취급하지 않습니다. 또한 `*`, `_`, 역슬래시, 백틱은 다른 Markdown 문법을 만들 수 있으므로 경계 문자여도 의도적으로 이동하지 않습니다.

## 사용 방법

1. 고칠 Markdown 노트를 엽니다.
2. 명령 팔레트를 엽니다.
3. **Fix punctuation-bound bold syntax in current note**를 실행합니다.
4. 저장하기 전에 변환된 Markdown을 검토합니다.

명령은 활성 편집기만 변경합니다. 원하지 않는 결과이면 즉시 Obsidian의 **Undo**를 사용하십시오. 중요한 노트에는 텍스트 변환 전에 평소 사용하는 Vault 백업 또는 버전 기록 방식을 유지하십시오.

## 명령과 단축키

| 명령 | 기본 단축키 |
| --- | --- |
| Fix punctuation-bound bold syntax in current note | 없음 |

단축키는 **Settings → Hotkeys**에서 지정할 수 있습니다.

## 설정

`1.0.0`에는 설정이 없습니다. 플러그인은 설정이나 노트 데이터를 저장하지 않습니다.

## 개인정보와 네트워크 접근

Bold Punctuation Fix는 전부 로컬에서 실행됩니다.

- 네트워크 요청과 텔레메트리를 사용하지 않습니다.
- 현재 Vault 밖의 파일을 읽지 않습니다.
- Vault를 스캔하거나 백그라운드에서 실행하지 않습니다.
- 명령을 실행할 때 활성 편집기 텍스트만 읽고 그 편집기의 텍스트만 대치합니다.

## 모바일·데스크톱 지원

`isDesktopOnly`는 `false`입니다. 모바일 호환 Obsidian 편집기 API만 사용하므로 모바일 명령 팔레트에서도 실행할 수 있습니다.

## 설치

### Community Plugins에서 설치

플러그인이 Obsidian Community Plugins 디렉터리에 등록된 후:

1. **Settings → Community plugins**를 엽니다.
2. **Bold Punctuation Fix**를 검색합니다.
3. 설치하고 활성화합니다.

### 수동 설치

GitHub Release에서 다음 파일을 받습니다.

- `main.js`
- `manifest.json`
- `styles.css`

다음 경로에 복사합니다.

```text
<Vault>/.obsidian/plugins/bold-punctuation-fix/
```

Obsidian을 다시 불러온 다음 **Settings → Community plugins**에서 **Bold Punctuation Fix**를 활성화합니다.

## 개발

```bash
npm install
npm test
npm run lint
npm run build
```

## 라이선스

0BSD. [LICENSE](LICENSE)를 참고하십시오.
