# 위젯이 사라진 원인과 긴급 복구

## 진단 결과 (확인됨)

- 레지스트리 코드 자체는 정상입니다. 개발 서버에서 `getWidgets()`를 실행하면 5개(`tasks`, `multiple_tasks`, `events`, `habit_tracker`, `monthly_summary`)가 모두 등록되어 있습니다.
- 문제는 빌드 설정입니다. `package.json`에 `"sideEffects": false`가 설정되어 있어, 빌드 시 `src/lib/widgets.ts`의 부수효과 전용 import(`import "@/components/wann/TasksPanel"` 등)가 "사용되지 않는 코드"로 제거됩니다. 그 결과 빌드된 화면에서는 `registerWidget()`이 한 번도 실행되지 않아 레지스트리가 비고, 대시보드 위젯 목록과 Settings의 WIDGETS 탭이 모두 빈 상태가 됩니다.
- This Week(3일 뷰)는 레지스트리를 거치지 않고 직접 렌더링되므로 정상 동작합니다. 증상이 정확히 일치합니다.
- 추가 확인: 저장된 설정값은 `habit_tracker: false`, `monthly_summary: false`입니다. 레지스트리 복구 후에도 이 두 위젯은 사용자가 껐던 상태이므로 숨김으로 남습니다.

## 수정 방안 (롤백 불필요, 소규모 수정)

부수효과 import에 의존하지 않도록 등록 방식을 "값(value) import" 기반으로 바꿉니다. 트리셰이킹이 값 import는 절대 제거하지 못하므로 빌드에서도 안전합니다.

1. 각 패널 파일: `registerWidget({...})` 호출 대신 위젯 정의를 `export const <name>Widget: WidgetDef = {...}`로 내보냅니다 (Tasks, Multiple Task, Events, Habit Tracker, Monthly Summary 5개).
2. `src/lib/widgets.ts`: 5개 정의를 값으로 import 해 배열로 모으고, 모듈 로드 시 `registerWidget`으로 등록합니다. 기존 `getWidgets` / `orderedWidgets` / `isWidgetVisible` 공개 API는 그대로 유지되므로 대시보드와 Settings 코드는 수정 불필요합니다.
3. `registerWidget`은 남겨두되(외부 확장용), 기본 5개는 값 등록 경로를 사용합니다. 앞으로 새 위젯 추가 시 "정의 export + widgets.ts 배열에 한 줄 추가"가 규칙이 됩니다.
4. 복구 검증: 빌드 결과 화면에서 TASKS 폼/목록, MULTIPLE TASK, Events가 다시 보이는지, Settings WIDGETS 탭에 5개 항목이 뜨는지, 체크박스와 드래그 순서가 반영되는지 확인합니다.

## 참고

- Habit Tracker / Monthly Summary는 저장값이 꺼져 있어 계속 숨겨집니다. 원하시면 이번에 함께 켜진 상태로 되돌리겠습니다.
