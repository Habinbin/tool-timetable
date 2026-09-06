/**
 * 시간축 좌표계.
 *
 * 화면과 PNG 가 같은 눈금을 쓰려면 "픽셀"이 아니라 "경계 번호"로 말해야 한다.
 * 여기 나오는 수는 전부 30분 경계의 번호다 — 0 이 09:00, `SLOT_COUNT` 가 21:00.
 * 픽셀은 경계로 바꾼 뒤에만 도메인에 들어온다.
 */

export const START_HOUR = 9;
export const END_HOUR = 21;
export const SLOT_MINUTES = 30;

/** 하루에 놓이는 30분 칸의 수. 경계 번호는 0 … SLOT_COUNT 다(칸보다 하나 많다). */
export const SLOT_COUNT = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;

export interface TimeRange {
	/** 시작 경계(포함). */
	start: number;
	/** 끝 경계(배타). 항상 start 보다 크다 — 높이 0 인 막대는 만들지 않는다. */
	end: number;
}

/** 막대의 어느 끝을 잡았는지. */
export type Edge = 'start' | 'end';

/**
 * 임의의 수를 30분 경계로 스냅하고 하루 범위 안으로 가둔다.
 *
 * 09:00 위·21:00 아래로 끌어도 여기서 잘리므로, 호출자는 커서 좌표를 그대로 넘겨도 된다.
 *
 * @param value 경계 단위의 실수(픽셀 비율에서 온 값).
 * @returns 0 … SLOT_COUNT 사이의 정수.
 */
export function clampBoundary(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(SLOT_COUNT, Math.max(0, Math.round(value)));
}

/**
 * 레인 높이 대비 비율을 경계 번호로 바꾼다.
 *
 * 픽셀이 도메인으로 들어오는 유일한 문이다 — 레인의 실제 높이는 CSS 가 정하므로
 * 로직은 비율만 안다.
 *
 * @param ratio 레인 위에서 잰 0…1 비율.
 * @returns 스냅된 경계 번호.
 */
export function boundaryAt(ratio: number): number {
	return clampBoundary(ratio * SLOT_COUNT);
}

/**
 * 경계 번호를 `HH:MM` 으로 적는다.
 *
 * @param boundary 경계 번호.
 * @returns 24시간 표기 문자열.
 */
export function slotLabel(boundary: number): string {
	const minutes = START_HOUR * 60 + clampBoundary(boundary) * SLOT_MINUTES;
	const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
	const mm = String(minutes % 60).padStart(2, '0');
	return `${hh}:${mm}`;
}

/**
 * 잡은 두 점에서 범위를 만든다.
 *
 * 두 점의 순서를 따지지 않으므로 아래에서 위로 끌어도 같은 범위가 나온다 —
 * 드래그 방향은 사용자가 신경 쓸 일이 아니다.
 *
 * @param a 한쪽 점.
 * @param b 다른 쪽 점.
 * @returns 스냅·클램프된 범위. 두 점이 같으면 한 칸짜리로 벌린다.
 */
export function normalizeRange(a: number, b: number): TimeRange {
	const first = clampBoundary(a);
	const second = clampBoundary(b);
	let start = Math.min(first, second);
	let end = Math.max(first, second);
	if (start === end) {
		// 제자리 드래그도 막대 하나는 남긴다. 아래로 한 칸, 바닥이면 위로 한 칸.
		if (end < SLOT_COUNT) end += 1;
		else start -= 1;
	}
	return { start, end };
}

/**
 * 막대의 한쪽 끝만 옮긴다.
 *
 * 잡지 않은 끝을 앵커로 두고 `normalizeRange` 에 넘기므로, 커서가 반대편을 지나가도
 * 앵커 값 자체는 그대로 남는다(범위가 뒤집힐 뿐이다).
 *
 * @param range 현재 범위.
 * @param edge 잡은 끝.
 * @param cursor 커서가 가리키는 경계.
 * @returns 새 범위.
 */
export function resizeRange(range: TimeRange, edge: Edge, cursor: number): TimeRange {
	const anchor = edge === 'start' ? range.end : range.start;
	return normalizeRange(anchor, cursor);
}

/**
 * 길이를 유지한 채 범위를 위아래로 민다.
 *
 * 하루 밖으로 나가면 길이를 줄이는 대신 이동을 멈춘다 — 옮기기가 몰래 크기를
 * 바꾸면 안 된다.
 *
 * @param range 현재 범위.
 * @param delta 경계 단위 이동량.
 * @returns 같은 길이의 새 범위.
 */
export function shiftRange(range: TimeRange, delta: number): TimeRange {
	const step = Number.isFinite(delta) ? Math.round(delta) : 0;
	const span = range.end - range.start;
	const start = Math.min(SLOT_COUNT - span, Math.max(0, range.start + step));
	return { start, end: start + span };
}

/**
 * 범위를 사람이 읽는 문자열로 적는다. 막대에는 글자가 없으므로 툴팁에서만 쓴다.
 *
 * @param range 범위.
 * @returns `09:00~12:30` 꼴.
 */
export function rangeLabel(range: TimeRange): string {
	return `${slotLabel(range.start)}~${slotLabel(range.end)}`;
}
