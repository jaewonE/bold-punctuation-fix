# Bold Punctuation Fix

[ [English](https://github.com/jaewonE/bold-punctuation-fix) | [한국어](https://github.com/jaewonE/bold-punctuation-fix/blob/master/README.ko.md) ]

Bold Punctuation Fix는 문장부호 경계 때문에 `**` 표지가 잘못 해석되는 Obsidian Markdown 굵게 구간을 입력 중 자동으로 고치는 Obsidian 플러그인입니다. HTML 태그를 넣지 않고 Markdown 원문만 대치합니다.

## 기능

- 닫는 `**` 또는 그 직후 텍스트 입력이 완료되면 현재 편집 줄만 자동으로 고칩니다.
- 관련 입력이 멈춘 뒤 350ms를 기다리며, 명령이나 자동 적용 설정이 필요하지 않습니다.
- 활성 Markdown 문서를 처음 열 때 한 번 전체를 고쳐, 기존의 문장부호 경계 굵게 구간도 처리합니다.
- 텍스트를 붙여넣을 때는 노트 전체를 다시 검사하지 않고 영향을 받은 물리적 줄만 고칩니다.
- 안전하지 않은 `**...**` 구간의 앞뒤 문장부호를 굵게 범위 밖으로 이동합니다.
- `나는 **"안녕하세요"**라고`를 `나는 "**안녕하세요**"라고`로 변환합니다.
- ASCII, 인용부호, CJK 문장부호를 처리합니다.
- 주변 문맥이 이미 올바른 일반 굵게 구간은 바꾸지 않습니다.
- YAML frontmatter, fenced code block, 인라인 코드, 이스케이프된 표지, Markdown 링크, 위키링크, `***` delimiter run은 건너뜁니다.
- 문자열 길이를 유지하므로 예측 가능한 하나의 편집 동작으로 대치됩니다.

## 동작 방식

활성 Markdown 문서를 열면 플러그인은 해당 문서를 한 번 검사합니다. 관련 입력이 멈춘 뒤에는 활성 줄만, 텍스트 붙여넣기 뒤에는 붙여넣어진 줄 범위만 검사합니다. 모든 경우 보호된 Markdown 구간 밖에서 정확한 리터럴 `**...**` 구간을 찾습니다. 문장부호가 텍스트와 맞닿아 여는 표지 또는 닫는 표지가 안전하지 않으면, 이동 가능한 모든 경계 문장부호를 굵게 범위 밖으로 옮기고 안쪽 텍스트만 굵게 남깁니다.

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

1. Bold Punctuation Fix를 활성화합니다.
2. 기존 문장부호 경계 굵게 구간을 고치려면 Markdown 문서를 엽니다.
3. Markdown 편집기에서 문장부호를 포함한 굵게 구간을 입력하고 닫는 `**`를 완성하거나 바로 뒤에 텍스트를 입력합니다.
4. 문장부호 경계 굵게 구간을 포함한 텍스트를 붙여넣어 영향을 받은 줄을 즉시 고칩니다.
5. 관련 입력이 350ms 동안 없으면 자동 변환 결과를 검토합니다.

플러그인은 변환을 적용할 때 활성 커서와 선택 영역을 보존합니다. 원하지 않는 결과이면 즉시 Obsidian의 **Undo**를 사용하십시오. 플러그인은 Undo를 인식하여 같은 변환을 곧바로 다시 적용하지 않습니다. 중요한 노트에는 텍스트 변환 전에 평소 사용하는 Vault 백업 또는 버전 기록 방식을 유지하십시오.

## 개인정보와 네트워크 접근

Bold Punctuation Fix는 전부 로컬에서 실행됩니다.

- 네트워크 요청과 텔레메트리를 사용하지 않습니다.
- 현재 Vault 밖의 파일을 읽지 않습니다.
- Vault를 스캔하거나 주기적으로 백그라운드 작업을 실행하지 않습니다.
- 활성 문서를 열 때에는 그 문서만, 텍스트 붙여넣기 뒤에는 영향을 받은 줄만, 관련 입력 뒤에는 활성 줄만 검사합니다.
- 설정이나 노트 데이터를 저장하지 않으며, 대기 타이머와 Undo 보호 정보는 열려 있는 편집기에 대해서만 메모리에 둡니다.

## 모바일·데스크톱 지원

`isDesktopOnly`는 `false`입니다. 모바일 호환 Obsidian 편집기 API만 사용하며, 모바일과 데스크톱에서 Obsidian `1.1.1` 이상을 지원합니다.

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

GNU General Public License v3.0 only. [LICENSE](LICENSE)를 참고하십시오.
