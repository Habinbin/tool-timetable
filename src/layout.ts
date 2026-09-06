/**
 * 그리드 가로 배치.
 *
 * 화면(CSS)과 PNG(canvas)가 같은 규칙으로 폭을 잡아야 두 결과가 겹쳐 보인다.
 * 세로는 시간축이 정하므로(`time.ts`) 여기는 가로만 다룬다.
 */

import { DAY_COUNT } from './schedule';

/**
 * 레인 하나의 최소 폭(px).
 *
 * 이보다 좁아지면 색 면이 선처럼 보여 사람을 색으로 구분하는 전제가 깨진다.
 * 인원이 늘면 폭을 더 줄이는 대신 그리드가 가로로 넘치고, 컨테이너가 스크롤한다.
 */
export const MIN_LANE_WIDTH = 14;

/** 레인 사이 틈(px). 같은 색 두 사람이 붙어도 경계가 보이게 하는 최소값. */
export const LANE_GAP = 2;

/** 시간 눈금 열의 폭(px). `21:00` 이 잘리지 않는 최소치. */
export const TIME_GUTTER_WIDTH = 56;

/** 요일 열 사이 틈(px). */
export const DAY_GAP = 10;

/** 인원이 적을 때 요일 열이 지나치게 홀쭉해지지 않게 잡는 하한(px). */
export const MIN_DAY_WIDTH = 72;

/**
 * 인원 수에 필요한 요일 열 하나의 최소 폭.
 *
 * @param peopleCount 인원 수.
 * @returns 열 폭(px).
 */
export function minDayWidth(peopleCount: number): number {
	const lanes = Math.max(0, Math.trunc(peopleCount));
	if (lanes === 0) return MIN_DAY_WIDTH;
	return Math.max(MIN_DAY_WIDTH, lanes * MIN_LANE_WIDTH + (lanes - 1) * LANE_GAP);
}

/**
 * 그리드 전체의 최소 폭.
 *
 * 컨테이너에 이 값을 걸어 두면, 창이 좁아도 레인이 `MIN_LANE_WIDTH` 아래로
 * 눌리지 않고 대신 가로 스크롤이 생긴다.
 *
 * @param peopleCount 인원 수.
 * @returns 그리드 폭(px).
 */
export function minGridWidth(peopleCount: number): number {
	return TIME_GUTTER_WIDTH + DAY_COUNT * minDayWidth(peopleCount) + (DAY_COUNT - 1) * DAY_GAP;
}

/**
 * PNG 에 쓸 레인 폭.
 *
 * 화면은 남는 폭을 레인이 나눠 갖지만 PNG 에는 "남는 폭"이 없으므로, 인원이 적을 때는
 * 넓게 두고 많아지면 `MIN_LANE_WIDTH` 로 수렴시킨다.
 *
 * @param peopleCount 인원 수.
 * @returns 레인 폭(px).
 */
export function pngLaneWidth(peopleCount: number): number {
	const lanes = Math.max(1, Math.trunc(peopleCount));
	return Math.max(MIN_LANE_WIDTH, Math.round(168 / lanes));
}
