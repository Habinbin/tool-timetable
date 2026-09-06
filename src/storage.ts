/**
 * 브라우저 저장.
 *
 * 저장 버튼을 두지 않는다는 결정이 여기 걸려 있다 — 바뀔 때마다 조용히 쓰고,
 * 다음에 열 때 조용히 읽는다. @tool-ux-principles
 */

import { fromJson, serialize, type Timetable } from './schedule';

/** 구조가 바뀌면 키를 바꿔 옛 데이터를 그냥 버린다. 마이그레이션할 만한 가치가 없다. */
export const STORAGE_KEY = 'betlab.timetable.v1';

/**
 * `localStorage` 를 얻는다.
 *
 * 없을 수 있는 이유가 둘이다: 프리렌더(서버에는 창이 없다)와 사생활 보호 모드
 * (접근 자체가 예외를 던진다). 어느 쪽이든 저장이 안 될 뿐 툴은 계속 돌아야 한다.
 *
 * @returns 저장소. 쓸 수 없으면 null.
 */
function store(): Storage | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null;
	}
}

/**
 * 저장된 시간표를 읽는다.
 *
 * @returns 시간표. 없거나 깨졌으면 null.
 */
export function loadTimetable(): Timetable | null {
	const text = store()?.getItem(STORAGE_KEY);
	return text === null || text === undefined ? null : fromJson(text);
}

/**
 * 시간표를 저장한다. 실패해도 조용히 넘어간다 — 사용자가 할 수 있는 일이 없다.
 *
 * @param table 저장할 시간표.
 */
export function saveTimetable(table: Timetable): void {
	try {
		store()?.setItem(STORAGE_KEY, serialize(table));
	} catch {
		/* 용량 초과·사생활 보호 모드. 화면의 내용은 그대로 살아 있다. */
	}
}
