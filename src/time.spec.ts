import { describe, expect, it } from 'vitest';

import {
	SLOT_COUNT,
	boundaryAt,
	clampBoundary,
	normalizeRange,
	rangeLabel,
	resizeRange,
	shiftRange,
	slotLabel
} from './time';

describe('시간축', () => {
	it('09:00~21:00 을 30분으로 끊으면 24칸이다', () => {
		expect(SLOT_COUNT).toBe(24);
		expect(slotLabel(0)).toBe('09:00');
		expect(slotLabel(SLOT_COUNT)).toBe('21:00');
		expect(slotLabel(1)).toBe('09:30');
	});
});

describe('boundaryAt — 30분 스냅', () => {
	it('레인 비율을 가장 가까운 30분 경계로 붙인다', () => {
		// 0.51 은 12.24 칸 → 12(15:00). 3분의 1 지점은 8(13:00).
		expect(boundaryAt(0.51)).toBe(12);
		expect(boundaryAt(1 / 3)).toBe(8);
		expect(boundaryAt(0)).toBe(0);
		expect(boundaryAt(1)).toBe(SLOT_COUNT);
	});

	it('어떤 비율을 넣어도 결과는 정수 경계다', () => {
		for (let step = 0; step <= 100; step += 1) {
			const boundary = boundaryAt(step / 100);
			expect(Number.isInteger(boundary)).toBe(true);
		}
	});

	it('그리드 밖 좌표는 09:00·21:00 에서 멈춘다', () => {
		expect(boundaryAt(-2)).toBe(0);
		expect(boundaryAt(3)).toBe(SLOT_COUNT);
		expect(clampBoundary(Number.NaN)).toBe(0);
	});
});

describe('normalizeRange — 역방향 드래그', () => {
	it('아래에서 위로 끌어도 같은 범위가 된다', () => {
		expect(normalizeRange(14, 6)).toEqual(normalizeRange(6, 14));
		expect(normalizeRange(14, 6)).toEqual({ start: 6, end: 14 });
	});

	it('제자리 드래그도 한 칸짜리 막대를 남긴다', () => {
		expect(normalizeRange(6, 6)).toEqual({ start: 6, end: 7 });
	});

	it('바닥에서 제자리 드래그하면 위로 한 칸 벌어진다', () => {
		expect(normalizeRange(SLOT_COUNT, SLOT_COUNT)).toEqual({
			start: SLOT_COUNT - 1,
			end: SLOT_COUNT
		});
	});

	it('그리드 밖으로 끌어도 하루 안에 갇힌다', () => {
		expect(normalizeRange(-10, 40)).toEqual({ start: 0, end: SLOT_COUNT });
	});
});

describe('resizeRange — 반대쪽 끝 고정', () => {
	it('아래 끝을 늘여도 시작은 그대로다', () => {
		expect(resizeRange({ start: 4, end: 10 }, 'end', 18)).toEqual({ start: 4, end: 18 });
	});

	it('위 끝을 올려도 끝은 그대로다', () => {
		expect(resizeRange({ start: 4, end: 10 }, 'start', 1)).toEqual({ start: 1, end: 10 });
	});

	it('끝을 반대편 너머로 끌면 뒤집힐 뿐 앵커 값은 남는다', () => {
		expect(resizeRange({ start: 4, end: 10 }, 'start', 20)).toEqual({ start: 10, end: 20 });
	});

	it('21:00 아래로 끌어도 그 아래로는 못 간다', () => {
		expect(resizeRange({ start: 4, end: 10 }, 'end', 99)).toEqual({ start: 4, end: SLOT_COUNT });
	});
});

describe('shiftRange — 옮기기', () => {
	it('길이를 지킨 채 민다', () => {
		expect(shiftRange({ start: 4, end: 10 }, 3)).toEqual({ start: 7, end: 13 });
	});

	it('위로 넘치면 09:00 에서 멈추고 길이는 그대로다', () => {
		expect(shiftRange({ start: 2, end: 8 }, -9)).toEqual({ start: 0, end: 6 });
	});

	it('아래로 넘치면 21:00 에서 멈추고 길이는 그대로다', () => {
		expect(shiftRange({ start: 18, end: 22 }, 9)).toEqual({
			start: SLOT_COUNT - 4,
			end: SLOT_COUNT
		});
	});
});

describe('rangeLabel', () => {
	it('막대에 글자가 없으므로 툴팁에서만 쓰는 표기', () => {
		expect(rangeLabel({ start: 0, end: 7 })).toBe('09:00~12:30');
	});
});
