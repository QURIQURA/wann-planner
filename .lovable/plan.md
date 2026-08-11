# Settings 위젯 표시/숨김 버그 수정

## 원인 (확인됨)

- 저장은 정상입니다. Settings 패널의 체크박스는 `widget_visibility`를 갱신해 `planner_user_settings`에 저장하고, 낙관적 업데이트도 걸려 있습니다.
- 문제는 대시보드 렌더링입니다. `src/routes/_authenticated/index.tsx`는 Habit Tracker, Monthly Summary를 포함한 모든 패널을 조건 없이 그립니다. 저장된 값을 아무도 읽지 않아 화면이 바뀌지 않습니다.
- 추가 불일치: 설정 목록에 있는 "Weekly Review"는 대응하는 패널이 아예 없습니다. 반대로 Tasks / Multiple Task / Events 패널은 토글 항목이 없습니다.

## 수정 내용

1. 대시보드에서 저장된 표시 설정을 실제로 참조해 각 패널을 조건부 렌더링 (값이 없으면 기본 표시).
2. 설정 목록을 실제 존재하는 패널과 일치시킴:
   - Tasks
   - Multiple Task (프로젝트)
   - Events
   - Habit Tracker
   - Monthly Summary
   - 존재하지 않는 "Weekly Review" 항목 제거
3. Tasks / Multiple Task / Events가 들어 있는 2단 그리드는, 한쪽이 숨겨지면 남은 쪽이 자연스럽게 폭을 차지하도록 처리하고 양쪽 모두 숨겨지면 그리드 자체를 렌더링하지 않음.
4. This Week(3일 뷰)는 앱의 핵심 화면이므로 토글 대상에서 제외.

## 기술 메모

- `src/lib/wann-data.ts`의 `UserSettings.widget_visibility` 타입에 새 키(`tasks`, `multiple_tasks`, `events`) 추가, `weekly_review` 제거.
- `src/components/wann/SettingsPanel.tsx`의 `WIDGETS` 목록 갱신.
- `src/routes/_authenticated/index.tsx`에 `const vis = settingsQ.data.widget_visibility ?? {}` 기반 헬퍼(`show(id) => vis[id] !== false`)를 두고 각 섹션을 감쌈.
