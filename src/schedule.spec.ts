import { describe, expect, it } from 'vitest';

import {
	DEFAULT_TITLE,
	PALETTE_SIZE,
	addBlock,
	addPerson,
	emptyTimetable,
	fromJson,
	laneBlocks,
	mergeBlocks,
	nextColor,
	nextPersonName,
	removeBlock,
	removePerson,
	serialize,
	setBlockRange,
	togglePattern,
	updatePerson,
	type Block,
	type Timetable
} from './schedule';

/** 병합 규칙만 보는 테스트를 위해 최소한의 막대를 만든다. */
function block(partial: Partial<Block> & Pick<Block, 'start' | 'end'>): Block {
	return {
		id: `b${partial.start}-${partial.end}`,
		personId: 'p1',
		day: 0,
		pattern: 'solid',
		...partial
	};
}

/** 사람 둘과 막대 몇 개가 있는 시간표. */
function sample(): Timetable {
	const people = addPerson(addPerson([], '하빈'), '지우');
	const [first, second] = people;
	let blocks: Block[] = [];
	blocks = addBlock(blocks, { personId: first.id, day: 0, range: { start: 0, end: 4 } });
	blocks = addBlock(blocks, { personId: first.id, day: 2, range: { start: 6, end: 10 } });
	blocks = addBlock(blocks, { personId: second.id, day: 0, range: { start: 2, end: 8 } });
	return { title: '연구실 시간표', people, blocks };
}

describe('nextPersonName', () => {
	it('비어 있으면 1번부터', () => {
		expect(nextPersonName([])).toBe('인원 1');
	});

	it('이미 쓰인 번호를 건너뛴다 — 지웠다 다시 넣어도 겹치지 않는다', () => {
		const people = addPerson(addPerson([], '인원 1'), '인원 3');
		expect(nextPersonName(people)).toBe('인원 2');
	});

	it('사람이 직접 준 이름과는 겹치지 않는 한 상관없다', () => {
		expect(nextPersonName(addPerson([], '조하빈'))).toBe('인원 1');
	});
});

describe('인원', () => {
	it('팔레트를 앞에서부터 순서대로 배정한다', () => {
		const people = addPerson(addPerson(addPerson([], '가'), '나'), '다');
		expect(people.map((person) => person.color)).toEqual([0, 1, 2]);
	});

	it('지웠다 다시 넣으면 비어 있던 색이 돌아온다', () => {
		const three = addPerson(addPerson(addPerson([], '가'), '나'), '다');
		const without = three.filter((person) => person.name !== '나');
		expect(nextColor(without)).toBe(1);
	});

	it('이름이 공백뿐이면 추가하지 않는다', () => {
		expect(addPerson([], '   ')).toHaveLength(0);
	});

	it('이름 양끝 공백은 떼고 저장한다', () => {
		expect(addPerson([], '  하빈 ')[0].name).toBe('하빈');
	});

	it('색을 바꾸면 팔레트 범위 안으로 감는다', () => {
		const people = addPerson([], '가');
		const changed = updatePerson(people, people[0].id, { color: PALETTE_SIZE + 3 });
		expect(changed[0].color).toBe(3);
	});

	it('인원을 지우면 그 사람의 막대도 사라진다', () => {
		const table = sample();
		const gone = table.people[0];
		const next = removePerson(table, gone.id);
		expect(next.people.map((person) => person.id)).not.toContain(gone.id);
		expect(next.blocks.every((entry) => entry.personId !== gone.id)).toBe(true);
		// 남은 사람의 막대는 건드리지 않는다.
		expect(next.blocks).toHaveLength(1);
	});
});

describe('막대 병합', () => {
	it('겹치는 막대는 하나로 합쳐진다', () => {
		const merged = mergeBlocks([block({ start: 2, end: 8 }), block({ start: 6, end: 12 })]);
		expect(merged).toHaveLength(1);
		expect(merged[0]).toMatchObject({ start: 2, end: 12 });
	});

	it('맞닿은 막대(끝==시작)도 하나로 합쳐진다', () => {
		const merged = mergeBlocks([block({ start: 2, end: 6 }), block({ start: 6, end: 9 })]);
		expect(merged).toHaveLength(1);
		expect(merged[0]).toMatchObject({ start: 2, end: 9 });
	});

	it('한 칸이라도 떨어져 있으면 그대로 둘이다', () => {
		const merged = mergeBlocks([block({ start: 2, end: 6 }), block({ start: 7, end: 9 })]);
		expect(merged).toHaveLength(2);
	});

	it('안에 완전히 들어가는 막대를 삼켜도 길이가 줄지 않는다', () => {
		const merged = mergeBlocks([block({ start: 0, end: 20 }), block({ start: 5, end: 8 })]);
		expect(merged).toHaveLength(1);
		expect(merged[0]).toMatchObject({ start: 0, end: 20 });
	});

	it('사슬처럼 이어진 셋을 한 번에 합친다', () => {
		const merged = mergeBlocks([
			block({ start: 0, end: 3 }),
			block({ start: 3, end: 6 }),
			block({ start: 5, end: 11 })
		]);
		expect(merged).toHaveLength(1);
		expect(merged[0]).toMatchObject({ start: 0, end: 11 });
	});

	it('요일이 다르면 겹쳐 보여도 합치지 않는다', () => {
		const merged = mergeBlocks([
			block({ start: 2, end: 8, day: 0 }),
			block({ start: 2, end: 8, day: 1 })
		]);
		expect(merged).toHaveLength(2);
	});

	it('사람이 다르면 같은 시간이어도 합치지 않는다', () => {
		const merged = mergeBlocks([
			block({ start: 2, end: 8, personId: 'p1' }),
			block({ start: 2, end: 8, personId: 'p2' })
		]);
		expect(merged).toHaveLength(2);
	});

	it('합쳐진 막대의 무늬는 더 긴 쪽을 따른다', () => {
		const merged = mergeBlocks([
			block({ start: 0, end: 10, pattern: 'hatch' }),
			block({ start: 9, end: 12, pattern: 'solid' })
		]);
		expect(merged[0].pattern).toBe('hatch');
	});

	it('새 막대를 놓을 때 이미 병합까지 끝난다', () => {
		const first = addBlock([], { personId: 'p1', day: 0, range: { start: 2, end: 6 } });
		const second = addBlock(first, { personId: 'p1', day: 0, range: { start: 4, end: 10 } });
		expect(second).toHaveLength(1);
		expect(second[0]).toMatchObject({ start: 2, end: 10 });
	});

	it('끌어 늘여 이웃에 닿으면 그 자리에서 합쳐진다', () => {
		let blocks = addBlock([], { personId: 'p1', day: 0, range: { start: 0, end: 4 } });
		blocks = addBlock(blocks, { personId: 'p1', day: 0, range: { start: 8, end: 12 } });
		const target = blocks[0].id;
		const grown = setBlockRange(blocks, target, { start: 0, end: 8 });
		expect(grown).toHaveLength(1);
		expect(grown[0]).toMatchObject({ start: 0, end: 12 });
	});
});

describe('막대 편집', () => {
	it('무늬는 실선과 빗금을 오간다', () => {
		const blocks = addBlock([], { personId: 'p1', day: 0, range: { start: 0, end: 4 } });
		expect(blocks[0].pattern).toBe('solid');
		const hatched = togglePattern(blocks, blocks[0].id);
		expect(hatched[0].pattern).toBe('hatch');
		expect(togglePattern(hatched, blocks[0].id)[0].pattern).toBe('solid');
	});

	it('막대 하나만 지운다', () => {
		const table = sample();
		const next = removeBlock(table.blocks, table.blocks[0].id);
		expect(next).toHaveLength(table.blocks.length - 1);
	});

	it('레인별로 시작 시각 순서로 읽힌다', () => {
		const table = sample();
		const lane = laneBlocks(table.blocks, table.people[0].id, 0);
		expect(lane).toHaveLength(1);
		expect(lane[0].start).toBe(0);
	});
});

describe('JSON 왕복', () => {
	it('내보낸 뒤 다시 가져오면 같은 데이터다', () => {
		const table = sample();
		const restored = fromJson(serialize(table));
		expect(restored).toEqual(table);
	});

	it('빈 시간표도 왕복한다', () => {
		expect(fromJson(serialize(emptyTimetable()))).toEqual(emptyTimetable());
	});

	it('JSON 이 아니면 null 이다', () => {
		expect(fromJson('시간표 아님')).toBeNull();
		expect(fromJson('{"title":"x"}')).toBeNull();
	});

	it('주인 없는 막대는 버린다', () => {
		const restored = fromJson(
			JSON.stringify({
				title: '남의 파일',
				people: [{ id: 'p1', name: '가', color: 0 }],
				blocks: [
					{ id: 'b1', personId: 'p1', day: 0, start: 0, end: 4, pattern: 'solid' },
					{ id: 'b2', personId: 'ghost', day: 0, start: 0, end: 4, pattern: 'solid' }
				]
			})
		);
		expect(restored?.blocks).toHaveLength(1);
	});

	it('범위를 벗어난 막대와 이상한 요일은 버린다', () => {
		const restored = fromJson(
			JSON.stringify({
				title: 'x',
				people: [{ id: 'p1', name: '가', color: 0 }],
				blocks: [
					{ id: 'b1', personId: 'p1', day: 9, start: 0, end: 4, pattern: 'solid' },
					{ id: 'b2', personId: 'p1', day: 0, start: 20, end: 99, pattern: 'solid' },
					{ id: 'b3', personId: 'p1', day: 0, start: 6, end: 6, pattern: 'solid' }
				]
			})
		);
		expect(restored?.blocks).toHaveLength(0);
	});

	it('제목이 없으면 기본 제목을 쓴다', () => {
		const restored = fromJson(JSON.stringify({ people: [], blocks: [] }));
		expect(restored?.title).toBe(DEFAULT_TITLE);
	});
});
