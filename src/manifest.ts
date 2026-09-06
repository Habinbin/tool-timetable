import CalendarRangeIcon from '@lucide/svelte/icons/calendar-range';

/**
 * 런처와 헤더에 쓰이는 메타데이터.
 *
 * 제목·설명은 호스트가 헤더를 그릴 때도 여기서 가져간다 — 두 번 적지 않는다.
 * 타입을 공유 패키지에서 가져오지 않는다: 이 툴은 자립해야 하고,
 * 호스트가 자기 `ToolManifest` 로 구조적으로 검사한다.
 */
export const manifest = {
	id: 'timetable',
	title: '시간표',
	description:
		'연구실 주간 시간표를 드래그로 그립니다. 사람은 색, 일정 종류는 무늬로 구분하고 PNG·JSON으로 내보냅니다.',
	category: '문서 도구',
	icon: CalendarRangeIcon,
	/** 'embed' — 툴박스 안 라우트로 렌더한다. @standalone-tool-deployment */
	surface: 'embed' as const
};
