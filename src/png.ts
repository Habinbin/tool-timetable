/**
 * PNG 내보내기.
 *
 * canvas 에 직접 그린다. 화면을 캡처하는 라이브러리를 들이지 않는 이유는 두 가지다:
 * 이 시간표는 사각형과 선뿐이라 직접 그리는 편이 정확하고, 의존이 0 이면 툴박스가
 * 이 툴을 실을 때 따라오는 짐도 없다.
 *
 * 가로 배치는 화면과 같은 `layout.ts` 규칙을, 세로 좌표는 같은 `time.ts` 눈금을 쓴다.
 * 두 그림이 겹쳐 보이는 것은 그 때문이지 우연이 아니다.
 */

import { DAY_GAP, LANE_GAP, MIN_DAY_WIDTH, TIME_GUTTER_WIDTH, pngLaneWidth } from './layout';
import { DAYS, DAY_COUNT, laneBlocks, type Person, type Timetable } from './schedule';
import { SLOT_COUNT, slotLabel } from './time';

/** `.tool-root` 에서 읽어 온 색과 서체. 호스트가 테마를 덮어써도 PNG 가 따라간다. */
export interface PngTheme {
	/** 팔레트 칸 순서대로의 색값. */
	people: string[];
	ink: string;
	inkMuted: string;
	line: string;
	lineStrong: string;
	accent: string;
	onAccent: string;
	surface: string;
	font: string;
}

/** 화면 CSS 픽셀 기준 치수. 마지막에 SCALE 배로 확대해 굽는다. */
const PAD = 28;
const BANNER_H = 76;
const LEGEND_ROW_H = 22;
const LEGEND_SWATCH = 12;
const LEGEND_ITEM_GAP = 22;
const HEAD_H = 30;
const SLOT_H = 22;

/** 레티나에서 글자가 뭉개지지 않을 만큼만 키운다. */
const SCALE = 2;

interface LegendItem {
	name: string;
	color: string;
	x: number;
	row: number;
}

/**
 * 이름표를 왼쪽부터 채우고 폭이 모자라면 다음 줄로 넘긴다.
 *
 * @param ctx 폭 측정을 위한 컨텍스트(서체가 이미 설정되어 있어야 한다).
 * @param people 사람들.
 * @param palette 팔레트 색값.
 * @param maxWidth 한 줄에 쓸 수 있는 폭.
 * @returns 항목 위치와 줄 수.
 */
function planLegend(
	ctx: CanvasRenderingContext2D,
	people: Person[],
	palette: string[],
	maxWidth: number
): { items: LegendItem[]; rows: number } {
	const items: LegendItem[] = [];
	let x = 0;
	let row = 0;
	for (const person of people) {
		const width = LEGEND_SWATCH + 6 + ctx.measureText(person.name).width;
		if (x > 0 && x + width > maxWidth) {
			x = 0;
			row += 1;
		}
		items.push({
			name: person.name,
			color: palette[person.color] ?? palette[0],
			x,
			row
		});
		x += width + LEGEND_ITEM_GAP;
	}
	return { items, rows: people.length === 0 ? 0 : row + 1 };
}

/**
 * 막대 하나를 그린다.
 *
 * 빗금은 화면 CSS 와 같은 기하(45도, 3px 획, 8px 주기)를 쓴다 — 두 그림에서 같은
 * 무늬로 읽혀야 하기 때문이다.
 *
 * @param ctx 컨텍스트.
 * @param rect 막대 자리.
 * @param color 사람 색.
 * @param hatched 빗금 여부.
 */
function drawBlock(
	ctx: CanvasRenderingContext2D,
	rect: { x: number; y: number; w: number; h: number },
	color: string,
	hatched: boolean
): void {
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 3);
	if (!hatched) {
		ctx.fillStyle = color;
		ctx.fill();
		ctx.restore();
		return;
	}
	ctx.clip();
	ctx.globalAlpha = 0.22;
	ctx.fillStyle = color;
	ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
	ctx.globalAlpha = 1;
	ctx.strokeStyle = color;
	ctx.lineWidth = 3;
	for (let offset = -rect.h; offset < rect.w + rect.h; offset += 8) {
		ctx.beginPath();
		ctx.moveTo(rect.x + offset, rect.y + rect.h);
		ctx.lineTo(rect.x + offset + rect.h, rect.y);
		ctx.stroke();
	}
	ctx.restore();
}

/**
 * 시간표를 canvas 에 그린다.
 *
 * @param canvas 그릴 대상.
 * @param table 시간표.
 * @param theme 색과 서체.
 */
export function drawTimetable(canvas: HTMLCanvasElement, table: Timetable, theme: PngTheme): void {
	const count = table.people.length;
	const dayWidth = Math.max(
		MIN_DAY_WIDTH,
		count * pngLaneWidth(count) + Math.max(0, count - 1) * LANE_GAP
	);
	const laneWidth = count > 0 ? (dayWidth - (count - 1) * LANE_GAP) / count : dayWidth;
	const gridWidth = TIME_GUTTER_WIDTH + DAY_COUNT * dayWidth + (DAY_COUNT - 1) * DAY_GAP;
	const width = PAD * 2 + gridWidth;
	const bodyHeight = SLOT_COUNT * SLOT_H;

	const measure = canvas.getContext('2d');
	if (measure === null) throw new Error('canvas 2d 컨텍스트를 얻지 못했습니다.');
	measure.font = `13px ${theme.font}`;
	const legend = planLegend(measure, table.people, theme.people, gridWidth);
	const legendHeight = legend.rows === 0 ? 0 : legend.rows * LEGEND_ROW_H + PAD;

	const height = BANNER_H + PAD + legendHeight + HEAD_H + bodyHeight + PAD;

	// 캔버스 크기를 바꾸면 컨텍스트 상태가 초기화되므로, 여기서부터 다시 설정한다.
	canvas.width = Math.round(width * SCALE);
	canvas.height = Math.round(height * SCALE);
	const ctx = canvas.getContext('2d');
	if (ctx === null) throw new Error('canvas 2d 컨텍스트를 얻지 못했습니다.');
	ctx.scale(SCALE, SCALE);
	ctx.textBaseline = 'middle';

	ctx.fillStyle = theme.surface;
	ctx.fillRect(0, 0, width, height);

	// ── 배너 ─────────────────────────────────────────
	ctx.fillStyle = theme.accent;
	ctx.fillRect(0, 0, width, BANNER_H);
	ctx.fillStyle = theme.onAccent;
	ctx.font = `600 24px ${theme.font}`;
	ctx.textAlign = 'left';
	ctx.fillText(table.title, PAD, BANNER_H / 2 + 1);

	// ── 이름표 ───────────────────────────────────────
	const legendTop = BANNER_H + PAD;
	ctx.font = `13px ${theme.font}`;
	for (const item of legend.items) {
		const y = legendTop + item.row * LEGEND_ROW_H + LEGEND_ROW_H / 2;
		ctx.fillStyle = item.color;
		ctx.beginPath();
		ctx.roundRect(PAD + item.x, y - LEGEND_SWATCH / 2, LEGEND_SWATCH, LEGEND_SWATCH, 3);
		ctx.fill();
		ctx.fillStyle = theme.ink;
		ctx.fillText(item.name, PAD + item.x + LEGEND_SWATCH + 6, y + 1);
	}

	// ── 그리드 ───────────────────────────────────────
	const headTop = BANNER_H + PAD + legendHeight;
	const bodyTop = headTop + HEAD_H;
	const gridLeft = PAD + TIME_GUTTER_WIDTH;

	ctx.font = `12px ${theme.font}`;
	ctx.fillStyle = theme.inkMuted;
	ctx.textAlign = 'right';
	for (let boundary = 0; boundary <= SLOT_COUNT; boundary += 2) {
		ctx.fillText(slotLabel(boundary), gridLeft - 10, bodyTop + boundary * SLOT_H);
	}

	ctx.textAlign = 'center';
	ctx.font = `600 13px ${theme.font}`;
	DAYS.forEach((day, index) => {
		const x = gridLeft + index * (dayWidth + DAY_GAP);
		ctx.fillStyle = theme.ink;
		ctx.fillText(day, x + dayWidth / 2, headTop + HEAD_H / 2);

		ctx.strokeStyle = theme.line;
		ctx.lineWidth = 1;
		ctx.strokeRect(x + 0.5, bodyTop + 0.5, dayWidth - 1, bodyHeight - 1);

		for (let boundary = 1; boundary < SLOT_COUNT; boundary += 1) {
			const y = Math.round(bodyTop + boundary * SLOT_H) + 0.5;
			ctx.strokeStyle = theme.line;
			// 30분 보조선은 시각선보다 흐리게 — 화면의 --line-faint 와 같은 비율이다.
			ctx.globalAlpha = boundary % 2 === 0 ? 1 : 0.55;
			ctx.beginPath();
			ctx.moveTo(x + 1, y);
			ctx.lineTo(x + dayWidth - 1, y);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}

		table.people.forEach((person, laneIndex) => {
			const laneX = x + laneIndex * (laneWidth + LANE_GAP);
			const color = theme.people[person.color] ?? theme.people[0];
			for (const entry of laneBlocks(table.blocks, person.id, index)) {
				drawBlock(
					ctx,
					{
						x: laneX + 1,
						y: bodyTop + entry.start * SLOT_H + 1,
						w: laneWidth - 2,
						h: (entry.end - entry.start) * SLOT_H - 2
					},
					color,
					entry.pattern === 'hatch'
				);
			}
		});
	});

	if (count === 0) {
		ctx.textAlign = 'center';
		ctx.fillStyle = theme.inkMuted;
		ctx.font = `14px ${theme.font}`;
		ctx.fillText('인원이 없습니다.', PAD + gridWidth / 2, bodyTop + bodyHeight / 2);
	}
}

/**
 * 시간표를 PNG 로 굽는다.
 *
 * @param table 시간표.
 * @param theme 색과 서체.
 * @returns PNG blob.
 */
export async function renderTimetablePng(table: Timetable, theme: PngTheme): Promise<Blob> {
	// 웹폰트가 아직 안 왔으면 canvas 는 대체 글꼴로 그려 버린다. 화면과 달라진다.
	await document.fonts?.ready;
	const canvas = document.createElement('canvas');
	drawTimetable(canvas, table, theme);
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob === null) reject(new Error('PNG 를 만들지 못했습니다.'));
			else resolve(blob);
		}, 'image/png');
	});
}
