import { describe, expect, it } from 'vitest';

import {
	DAY_GAP,
	LANE_GAP,
	MIN_LANE_WIDTH,
	TIME_GUTTER_WIDTH,
	minDayWidth,
	minGridWidth,
	pngLaneWidth
} from './layout';
import { DAY_COUNT } from './schedule';

/** 그리드 폭에서 레인 하나가 실제로 받는 폭. */
function laneWidthAt(peopleCount: number): number {
	const columns =
		(minGridWidth(peopleCount) - TIME_GUTTER_WIDTH - (DAY_COUNT - 1) * DAY_GAP) / DAY_COUNT;
	return (columns - (peopleCount - 1) * LANE_GAP) / peopleCount;
}

describe('레인 폭', () => {
	it('12명에서도 레인이 최소 폭 아래로 눌리지 않는다', () => {
		expect(laneWidthAt(12)).toBeGreaterThanOrEqual(MIN_LANE_WIDTH);
	});

	it('1명부터 12명까지 모두 최소 폭을 지킨다', () => {
		for (let people = 1; people <= 12; people += 1) {
			expect(laneWidthAt(people)).toBeGreaterThanOrEqual(MIN_LANE_WIDTH);
		}
	});

	it('인원이 늘면 그리드가 넓어진다 — 좁히는 대신 넘치게 둔다', () => {
		expect(minGridWidth(12)).toBeGreaterThan(minGridWidth(6));
		expect(minGridWidth(6)).toBeGreaterThan(minGridWidth(1));
	});

	it('인원이 0이면 열 폭이 하한으로 버틴다', () => {
		expect(minDayWidth(0)).toBe(minDayWidth(1));
	});

	it('PNG 레인도 같은 하한을 지킨다', () => {
		for (let people = 1; people <= 20; people += 1) {
			expect(pngLaneWidth(people)).toBeGreaterThanOrEqual(MIN_LANE_WIDTH);
		}
	});
});
