/**
 * 시간표 도메인.
 *
 * 사람·막대·제목이 전부다. Svelte 도 DOM 도 모른다 — 화면과 PNG 와 JSON 이
 * 같은 규칙을 따르도록, 규칙은 전부 여기 순수 함수로 둔다.
 */

import { SLOT_COUNT, normalizeRange, type TimeRange } from './time';

/** 주간 시간표라 월~금 다섯 열로 고정한다. */
export const DAYS = ['월', '화', '수', '목', '금'] as const;
export const DAY_COUNT = DAYS.length;

/**
 * 팔레트 칸 수.
 *
 * 사람은 색 하나를 가지므로, 이 수가 곧 "색만으로 구분되는 인원"의 상한이다.
 * 실제 색값은 `ui/theme.css` 의 `--person-0 … --person-11` 에만 적는다 —
 * 도메인은 몇 번 칸인지만 안다. @theme-contract
 */
export const PALETTE_SIZE = 12;

/** 실선은 고정 일정, 빗금은 그 밖의 것. 뜻은 쓰는 사람이 정한다. */
export type Pattern = 'solid' | 'hatch';

export interface Person {
	id: string;
	name: string;
	/** 팔레트 칸 번호(0 … PALETTE_SIZE-1). 색값이 아니다. */
	color: number;
}

export interface Block {
	id: string;
	personId: string;
	/** 0=월 … 4=금. */
	day: number;
	start: number;
	end: number;
	pattern: Pattern;
}

export interface Timetable {
	title: string;
	people: Person[];
	blocks: Block[];
}

export const DEFAULT_TITLE = 'Time table';

/** 내보낸 JSON 을 나중에 알아보기 위한 표식. 구조가 바뀌면 올린다. */
export const SCHEMA_VERSION = 1;

let sequence = 0;

/**
 * 새 식별자를 만든다.
 *
 * `crypto.randomUUID` 를 쓰지 않는 이유: 이 모듈은 node 테스트에서도 그대로 돌아야 한다.
 *
 * @param prefix 사람은 `p`, 막대는 `b`.
 * @returns 이 세션 안에서 유일한 문자열.
 */
export function newId(prefix: string): string {
	sequence += 1;
	return `${prefix}${Date.now().toString(36)}${sequence.toString(36)}`;
}

/**
 * 빈 시간표.
 *
 * @returns 제목만 있는 시간표.
 */
export function emptyTimetable(): Timetable {
	return { title: DEFAULT_TITLE, people: [], blocks: [] };
}

/**
 * 다음 사람에게 줄 팔레트 칸을 고른다.
 *
 * 앞에서부터 비어 있는 칸을 준다 — 사람을 지웠다 다시 넣으면 그 색이 돌아온다.
 * 열두 명을 넘기면 색이 겹치는데, 그때는 이름표로 읽을 수밖에 없다.
 *
 * @param people 지금 있는 사람들.
 * @returns 팔레트 칸 번호.
 */
export function nextColor(people: Person[]): number {
	const used = new Set(people.map((person) => person.color));
	for (let index = 0; index < PALETTE_SIZE; index += 1) {
		if (!used.has(index)) return index;
	}
	return people.length % PALETTE_SIZE;
}

/**
 * 사람을 더한다.
 *
 * @param people 지금 있는 사람들.
 * @param name 입력된 이름.
 * @returns 새 배열. 이름이 비어 있으면 원래 배열을 그대로 돌려준다.
 */
export function addPerson(people: Person[], name: string): Person[] {
	const trimmed = name.trim();
	if (trimmed === '') return people;
	return [...people, { id: newId('p'), name: trimmed, color: nextColor(people) }];
}

/**
 * 사람과 그 사람의 막대를 함께 지운다.
 *
 * 막대는 사람에 딸린 것이라, 주인이 없어진 막대를 남기면 색을 해석할 수 없다.
 *
 * @param table 시간표.
 * @param personId 지울 사람.
 * @returns 새 시간표.
 */
export function removePerson(table: Timetable, personId: string): Timetable {
	return {
		...table,
		people: table.people.filter((person) => person.id !== personId),
		blocks: table.blocks.filter((block) => block.personId !== personId)
	};
}

/**
 * 사람의 필드를 바꾼다. 이름이 공백뿐이면 무시한다.
 *
 * @param people 지금 있는 사람들.
 * @param personId 대상.
 * @param patch 바꿀 값.
 * @returns 새 배열.
 */
export function updatePerson(
	people: Person[],
	personId: string,
	patch: { name?: string; color?: number }
): Person[] {
	return people.map((person) => {
		if (person.id !== personId) return person;
		const name = patch.name === undefined ? person.name : patch.name.trim();
		const color = patch.color === undefined ? person.color : patch.color;
		return {
			...person,
			name: name === '' ? person.name : name,
			color: ((color % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE
		};
	});
}

/**
 * 한 레인(같은 사람·같은 요일)의 막대를 합친다.
 *
 * 겹치는 것뿐 아니라 맞닿은 것(끝==시작)도 하나로 본다 — 화면에서 이미 한 덩어리로
 * 보이는데 데이터만 둘이면, 끝을 잡아 늘일 때 어느 쪽이 잡힐지 알 수 없다.
 *
 * 무늬는 더 긴 쪽을 따른다. 짧은 조각이 긴 일정의 성격을 바꾸면 곤란하다.
 *
 * @param lane 같은 레인의 막대들.
 * @returns 시작 시각 순으로 정렬된, 겹치지 않는 막대들.
 */
export function mergeLane(lane: Block[]): Block[] {
	const sorted = [...lane].sort((a, b) => a.start - b.start || a.end - b.end);
	const merged: Block[] = [];
	for (const block of sorted) {
		const last = merged[merged.length - 1];
		if (last !== undefined && block.start <= last.end) {
			const longer = block.end - block.start > last.end - last.start ? block : last;
			merged[merged.length - 1] = {
				...last,
				end: Math.max(last.end, block.end),
				pattern: longer.pattern
			};
			continue;
		}
		merged.push({ ...block });
	}
	return merged;
}

/**
 * 모든 레인을 합친다.
 *
 * 레인의 출현 순서를 지킨다 — 같은 입력에서 늘 같은 배열이 나와야 JSON 왕복이 안정된다.
 *
 * @param blocks 전체 막대.
 * @returns 레인별로 합쳐진 막대.
 */
export function mergeBlocks(blocks: Block[]): Block[] {
	const lanes = new Map<string, Block[]>();
	for (const block of blocks) {
		const key = `${block.personId}|${block.day}`;
		const lane = lanes.get(key);
		if (lane === undefined) lanes.set(key, [block]);
		else lane.push(block);
	}
	return [...lanes.values()].flatMap(mergeLane);
}

/**
 * 막대를 새로 놓는다.
 *
 * @param blocks 전체 막대.
 * @param seed 사람·요일·범위. 무늬는 늘 실선으로 시작한다.
 * @returns 병합까지 끝난 새 배열.
 */
export function addBlock(
	blocks: Block[],
	seed: { personId: string; day: number; range: TimeRange }
): Block[] {
	const block: Block = {
		id: newId('b'),
		personId: seed.personId,
		day: seed.day,
		start: seed.range.start,
		end: seed.range.end,
		pattern: 'solid'
	};
	return mergeBlocks([...blocks, block]);
}

/**
 * 막대의 범위를 바꾼다(끌어 늘이기·옮기기의 확정).
 *
 * @param blocks 전체 막대.
 * @param id 대상.
 * @param range 새 범위.
 * @returns 병합까지 끝난 새 배열.
 */
export function setBlockRange(blocks: Block[], id: string, range: TimeRange): Block[] {
	const next = blocks.map((block) =>
		block.id === id ? { ...block, start: range.start, end: range.end } : block
	);
	return mergeBlocks(next);
}

/**
 * 무늬를 실선 ↔ 빗금으로 바꾼다. 모양이 그대로라 병합은 다시 하지 않는다.
 *
 * @param blocks 전체 막대.
 * @param id 대상.
 * @returns 새 배열.
 */
export function togglePattern(blocks: Block[], id: string): Block[] {
	return blocks.map((block) =>
		block.id === id ? { ...block, pattern: block.pattern === 'solid' ? 'hatch' : 'solid' } : block
	);
}

/**
 * 막대 하나를 지운다.
 *
 * @param blocks 전체 막대.
 * @param id 대상.
 * @returns 새 배열.
 */
export function removeBlock(blocks: Block[], id: string): Block[] {
	return blocks.filter((block) => block.id !== id);
}

/**
 * 한 레인의 막대만 고른다. 화면과 PNG 가 같은 순서로 그리게 한다.
 *
 * @param blocks 전체 막대.
 * @param personId 사람.
 * @param day 요일.
 * @returns 시작 시각 순 막대.
 */
export function laneBlocks(blocks: Block[], personId: string, day: number): Block[] {
	return blocks
		.filter((block) => block.personId === personId && block.day === day)
		.sort((a, b) => a.start - b.start);
}

/**
 * JSON 문자열로 적는다.
 *
 * @param table 시간표.
 * @returns 들여쓴 JSON.
 */
export function serialize(table: Timetable): string {
	return JSON.stringify({ version: SCHEMA_VERSION, ...table }, null, '\t');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function parsePerson(raw: unknown): Person | null {
	if (!isRecord(raw)) return null;
	const { id, name, color } = raw;
	if (typeof id !== 'string' || id === '') return null;
	if (typeof name !== 'string') return null;
	const slot = typeof color === 'number' && Number.isFinite(color) ? Math.trunc(color) : 0;
	return { id, name, color: ((slot % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE };
}

function parseBlock(raw: unknown, knownPeople: Set<string>): Block | null {
	if (!isRecord(raw)) return null;
	const { id, personId, day, start, end, pattern } = raw;
	if (typeof id !== 'string' || id === '') return null;
	if (typeof personId !== 'string' || !knownPeople.has(personId)) return null;
	if (typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day >= DAY_COUNT) return null;
	if (typeof start !== 'number' || typeof end !== 'number') return null;
	if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
	if (start < 0 || end > SLOT_COUNT || start >= end) return null;
	return { id, personId, day, start, end, pattern: pattern === 'hatch' ? 'hatch' : 'solid' };
}

/**
 * 바깥에서 온 값을 시간표로 받아들인다.
 *
 * 가져온 파일도 localStorage 도 남이 쓴 것으로 본다 — 한 항목이라도 어긋나면 그 항목만
 * 버리고, 뼈대 자체가 아니면 null 을 준다. 주인 없는 막대는 색을 해석할 수 없으므로
 * 사람 목록에 없는 `personId` 는 그 자리에서 떨어뜨린다.
 *
 * @param raw 파싱된 JSON 값.
 * @returns 시간표. 형태가 아니면 null.
 */
export function parseTimetable(raw: unknown): Timetable | null {
	if (!isRecord(raw)) return null;
	if (!Array.isArray(raw.people) || !Array.isArray(raw.blocks)) return null;

	const people: Person[] = [];
	const seen = new Set<string>();
	for (const entry of raw.people) {
		const person = parsePerson(entry);
		if (person === null || seen.has(person.id)) continue;
		seen.add(person.id);
		people.push(person);
	}

	const blocks: Block[] = [];
	for (const entry of raw.blocks) {
		const block = parseBlock(entry, seen);
		if (block !== null) blocks.push(block);
	}

	const title =
		typeof raw.title === 'string' && raw.title.trim() !== '' ? raw.title : DEFAULT_TITLE;
	return { title, people, blocks: mergeBlocks(blocks) };
}

/**
 * JSON 텍스트에서 시간표를 읽는다.
 *
 * @param text 파일이나 저장소에서 읽은 문자열.
 * @returns 시간표. 파싱에 실패하면 null.
 */
export function fromJson(text: string): Timetable | null {
	try {
		return parseTimetable(JSON.parse(text));
	} catch {
		return null;
	}
}
