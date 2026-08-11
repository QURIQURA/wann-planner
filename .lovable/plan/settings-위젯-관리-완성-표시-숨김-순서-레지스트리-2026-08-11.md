# Settings 위젯 관리 완성 (표시/숨김 + 순서 + 레지스트리)

## 현재 상태 (확인됨)

- 저장은 정상: Settings 체크박스는 `widget_visibility`를 `planner_user_settings`에 저장하고 낙관적 업데이트도 동작합니다.
- 렌더링이 문제: `src/routes/_authenticated/index.tsx`가 Tasks / Multiple Task / Events / Habit Tracker / Monthly Summary를 조건 없이 그립니다. 저장된 값을 읽는 코드가 없습니다.
- 설정 목록의 "Weekly Review"는 대응 패널이 없고, 반대로 Tasks / Multiple Task / Events는 토글 항목이 없습니다.

## A. 표시/숨김 수정

- 대시보드가 저장된 `widget_visibility`를 참조해 각 위젯을 조건부 렌더링. 값이 없으면 레지스트리의 기본값(표시)을 사용.
- "Weekly Review" 항목 제거.
- This Week(3일 뷰)와 상단 헤더는 토글 대상에서 제외하고 항상 최상단 고정.

## B. 위젯 순서 조정

- Settings의 Widgets 탭에서 목록을 드래그앤드롭으로 재정렬 (이미 쓰고 있는 @dnd-kit 사용). 각 행에 드래그 핸들 + 표시/숨김 체크박스.
- 저장된 순서가 대시보드 렌더링 순서에 그대로 반영. 순서에 없는 신규 위젯은 레지스트리 정의 순서대로 뒤에 붙음.
- 순서를 예측 가능하게 하기 위해 위젯들은 This Week 아래에 한 줄씩(전체 폭) 순서대로 쌓입니다. 지금의 Tasks / (Multiple Task+Events) 2단 그리드 배치는 사라집니다.

## C. 위젯 레지스트리

- `src/lib/widget-registry.ts`에 등록 API(`registerWidget`)와 조회 API(`getWidgets`)를 둠. 각 항목: `id`, `label`, `defaultVisible`, `render(ctx)`.
- 각 위젯 파일이 자기 자신을 등록하고, 레지스트리 모듈에서 위젯 파일들을 import 해 등록을 보장.
- Settings 패널과 대시보드 모두 하드코딩된 목록 대신 레지스트리를 순회.
- 기존 5개 위젯(Tasks, Multiple Task, Events, Habit Tracker, Monthly Summary)을 등록으로 이전.
- 앞으로 새 위젯은 파일 안에 등록 코드만 추가하면 표시/숨김·순서 조정에 자동 포함.

## 기술 메모

- 마이그레이션: `planner_user_settings`에 `widget_order text[]`(기본 `'{}'`) 추가.
- 위젯 렌더 컨텍스트: 현재 대시보드가 각 패널에 넘기는 props(쿼리 데이터, 뮤테이션 핸들러, `userId`, `anchor`, 편집 상태 등)를 하나의 `WidgetContext` 객체로 모아 `render(ctx)`에 전달. 패널 컴포넌트 자체의 props 시그니처는 변경하지 않음.
- 등록 부수효과 import가 트리셰이킹되지 않도록 레지스트리 모듈에서 명시적으로 위젯 모듈을 import.
- `UserSettings` 타입에 `widget_order: string[]` 추가, `widget_visibility`는 `Record<string, boolean>`으로 일반화(`weekly_review` 제거).
