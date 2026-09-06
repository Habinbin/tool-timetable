import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { addBlock, addPerson, type Timetable } from './schedule';
import { STORAGE_KEY, loadTimetable, saveTimetable } from './storage';

/** 브라우저 없이 저장 왕복을 확인하기 위한 최소 구현. */
class MemoryStorage {
	private map = new Map<string, string>();

	get length(): number {
		return this.map.size;
	}

	getItem(key: string): string | null {
		return this.map.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		this.map.set(key, value);
	}

	removeItem(key: string): void {
		this.map.delete(key);
	}

	clear(): void {
		this.map.clear();
	}

	key(index: number): string | null {
		return [...this.map.keys()][index] ?? null;
	}
}

function sample(): Timetable {
	const people = addPerson(addPerson([], '하빈'), '지우');
	let blocks = addBlock([], { personId: people[0].id, day: 1, range: { start: 4, end: 10 } });
	blocks = addBlock(blocks, { personId: people[1].id, day: 3, range: { start: 0, end: 3 } });
	return { title: '연구실 시간표', people, blocks };
}

describe('자동 저장', () => {
	beforeEach(() => {
		Object.defineProperty(globalThis, 'localStorage', {
			value: new MemoryStorage(),
			configurable: true
		});
	});

	afterEach(() => {
		Reflect.deleteProperty(globalThis, 'localStorage');
	});

	it('저장한 뒤 다시 읽으면 같은 시간표다 — 새로고침이 하는 일', () => {
		const table = sample();
		saveTimetable(table);
		expect(loadTimetable()).toEqual(table);
	});

	it('저장한 적이 없으면 null 이다', () => {
		expect(loadTimetable()).toBeNull();
	});

	it('저장된 값이 깨져 있으면 null 로 떨어뜨린다 — 빈 화면이 오류 화면보다 낫다', () => {
		localStorage.setItem(STORAGE_KEY, '{"people": 3}');
		expect(loadTimetable()).toBeNull();
	});

	it('저장소가 없어도(프리렌더·사생활 보호 모드) 던지지 않는다', () => {
		Reflect.deleteProperty(globalThis, 'localStorage');
		expect(() => saveTimetable(sample())).not.toThrow();
		expect(loadTimetable()).toBeNull();
	});
});
