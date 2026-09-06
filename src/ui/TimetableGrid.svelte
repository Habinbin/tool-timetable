<script lang="ts">
	import XIcon from '@lucide/svelte/icons/x';

	import { minGridWidth } from '../layout';
	import { DAYS, laneBlocks, type Block, type Person } from '../schedule';
	import {
		SLOT_COUNT,
		boundaryAt,
		normalizeRange,
		rangeLabel,
		resizeRange,
		shiftRange,
		slotLabel,
		type Edge,
		type TimeRange
	} from '../time';

	interface Props {
		people: Person[];
		blocks: Block[];
		oncreate: (seed: { personId: string; day: number; range: TimeRange }) => void;
		onmoveend: (id: string, range: TimeRange) => void;
		ontoggle: (id: string) => void;
		onremove: (id: string) => void;
	}

	let { people, blocks, oncreate, onmoveend, ontoggle, onremove }: Props = $props();

	/**
	 * 진행 중인 조작.
	 *
	 * 확정은 손을 뗄 때 한 번만 한다. 끄는 동안 병합까지 해 버리면 막대가 남의 id 로
	 * 흡수되면서 내가 잡고 있던 대상이 사라진다 — 그래서 미리보기와 확정을 나눈다.
	 */
	type Gesture =
		| { kind: 'create'; personId: string; day: number; anchor: number; range: TimeRange }
		| { kind: 'edge'; id: string; edge: Edge; origin: TimeRange; range: TimeRange }
		| { kind: 'move'; id: string; grab: number; origin: TimeRange; range: TimeRange };

	let gesture = $state<Gesture | null>(null);
	/** 손을 뗐을 때 그것이 드래그였는지 클릭이었는지 가른다. */
	let dragged = false;

	const hours = Array.from({ length: SLOT_COUNT / 2 + 1 }, (_, index) => index * 2);

	/** 픽셀이 도메인으로 들어오는 유일한 지점. 나머지는 전부 경계 번호로 이야기한다. */
	function boundaryIn(event: PointerEvent, lane: HTMLElement): number {
		const rect = lane.getBoundingClientRect();
		return boundaryAt((event.clientY - rect.top) / rect.height);
	}

	function onDown(event: PointerEvent, lane: HTMLElement, personId: string, day: number): void {
		if (event.button !== 0) return;
		const target = event.target as HTMLElement;
		// 삭제 버튼 위에서 시작한 누름은 드래그가 아니다.
		if (target.closest('.kill') !== null) return;

		dragged = false;
		const cursor = boundaryIn(event, lane);
		const held = target.closest<HTMLElement>('.block');

		if (held === null) {
			gesture = {
				kind: 'create',
				personId,
				day,
				anchor: cursor,
				range: normalizeRange(cursor, cursor)
			};
		} else {
			const block = blocks.find((entry) => entry.id === held.dataset.id);
			if (block === undefined) return;
			const origin: TimeRange = { start: block.start, end: block.end };
			const edge = target.closest<HTMLElement>('[data-edge]')?.dataset.edge;
			gesture =
				edge === 'start' || edge === 'end'
					? { kind: 'edge', id: block.id, edge, origin, range: origin }
					: { kind: 'move', id: block.id, grab: cursor, origin, range: origin };
		}

		lane.setPointerCapture(event.pointerId);
		// 드래그 중 텍스트 선택을 막는다.
		event.preventDefault();
	}

	function onMove(event: PointerEvent, lane: HTMLElement): void {
		if (gesture === null) return;
		const cursor = boundaryIn(event, lane);
		const next =
			gesture.kind === 'create'
				? normalizeRange(gesture.anchor, cursor)
				: gesture.kind === 'edge'
					? resizeRange(gesture.origin, gesture.edge, cursor)
					: shiftRange(gesture.origin, cursor - gesture.grab);
		if (next.start !== gesture.range.start || next.end !== gesture.range.end) dragged = true;
		gesture = { ...gesture, range: next };
	}

	function onUp(): void {
		const current = gesture;
		gesture = null;
		if (current === null) return;
		if (current.kind === 'create') {
			oncreate({ personId: current.personId, day: current.day, range: current.range });
			return;
		}
		// 움직이지 않았으면 누른 것이다 — 무늬를 뒤집는다.
		if (dragged) onmoveend(current.id, current.range);
		else ontoggle(current.id);
	}

	/** 미리보기가 있으면 그것을, 없으면 저장된 범위를 그린다. */
	function shown(block: Block): TimeRange {
		if (gesture !== null && gesture.kind !== 'create' && gesture.id === block.id) {
			return gesture.range;
		}
		return { start: block.start, end: block.end };
	}

	function percent(value: number): string {
		return `${(value / SLOT_COUNT) * 100}%`;
	}
</script>

<!--
	가로 스크롤은 그리드에만 건다. 인원이 늘면 레인을 더 좁히는 대신 넘치게 두는
	결정(`layout.ts`)이 여기서 화면으로 드러난다.
-->
<div class="scroller">
	<!-- 칸 수는 `time.ts` 가 정한다. CSS 에 24 를 다시 적으면 두 곳이 갈라진다. -->
	<div class="grid" style:min-width="{minGridWidth(people.length)}px" style:--slots={SLOT_COUNT}>
		<div class="corner"></div>
		{#each DAYS as day (day)}
			<div class="head">{day}</div>
		{/each}

		<div class="gutter">
			{#each hours as hour (hour)}
				<span class="tick" style:top={percent(hour)}>{slotLabel(hour)}</span>
			{/each}
		</div>

		{#each DAYS as day, dayIndex (day)}
			<div class="lanes">
				{#each people as person (person.id)}
					<!--
						레인은 스스로 조작 대상이 아니라 막대를 담는 자리다. 이름을 붙인 group 으로
						두어야 안의 막대들이 "누구의 무슨 요일"인지와 함께 읽힌다.
					-->
					<div
						class="lane"
						role="group"
						aria-label="{person.name} {day}"
						style:--c="var(--person-{person.color})"
						onpointerdown={(event) => onDown(event, event.currentTarget, person.id, dayIndex)}
						onpointermove={(event) => onMove(event, event.currentTarget)}
						onpointerup={onUp}
						onpointercancel={() => (gesture = null)}
					>
						{#each laneBlocks(blocks, person.id, dayIndex) as block (block.id)}
							{@const range = shown(block)}
							<div
								class="block"
								class:hatch={block.pattern === 'hatch'}
								data-id={block.id}
								role="button"
								tabindex="0"
								aria-label="{person.name} {day} {rangeLabel(range)} — 눌러서 무늬 바꾸기"
								title="{person.name} · {day} {rangeLabel(range)}"
								style:top={percent(range.start)}
								style:height={percent(range.end - range.start)}
								onkeydown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										ontoggle(block.id);
									}
								}}
							>
								<span class="handle top" data-edge="start"></span>
								<span class="handle bottom" data-edge="end"></span>
								<button
									class="kill"
									aria-label="{person.name} {day} {rangeLabel(range)} 지우기"
									onclick={() => onremove(block.id)}
								>
									<XIcon size={10} strokeWidth={3} />
								</button>
							</div>
						{/each}

						{#if gesture?.kind === 'create' && gesture.personId === person.id && gesture.day === dayIndex}
							<div
								class="block ghost"
								style:top={percent(gesture.range.start)}
								style:height={percent(gesture.range.end - gesture.range.start)}
							></div>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
	</div>
</div>

<style>
	.scroller {
		overflow-x: auto;
		padding-bottom: var(--space-4);
	}

	.grid {
		display: grid;
		grid-template-columns: var(--gutter-w) repeat(5, minmax(0, 1fr));
		column-gap: var(--day-gap);
	}

	.head {
		padding-bottom: var(--space-8);
		text-align: center;
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--ink);
	}

	/*
		눈금 열도 레인과 같은 상자 모형이라야 라벨이 선과 맞는다 — 레인의 1px 테두리만큼
		투명 테두리를 둔다. 없으면 하루 전체에 걸쳐 1px 씩 어긋난다.
	*/
	.gutter {
		position: relative;
		height: calc(var(--slot-h) * var(--slots));
		border: 1px solid transparent;
	}

	.tick {
		position: absolute;
		right: var(--space-8);
		transform: translateY(-50%);
		font-size: var(--text-caption);
		color: var(--ink-muted);
		font-variant-numeric: tabular-nums;
	}

	/*
		시각선과 30분 보조선을 배경으로 그린다. 24칸에 25개의 선을 DOM 으로 두면
		요일마다 그만큼이 곱해진다 — 눈금은 배경이 할 일이다.
	*/
	.lanes {
		display: flex;
		gap: var(--lane-gap);
		height: calc(var(--slot-h) * var(--slots));
		border: 1px solid var(--line);
		background-color: var(--surface);
		background-image:
			repeating-linear-gradient(
				to bottom,
				var(--line) 0 1px,
				transparent 1px calc(var(--slot-h) * 2)
			),
			repeating-linear-gradient(to bottom, var(--line-faint) 0 1px, transparent 1px var(--slot-h));
	}

	.lane {
		position: relative;
		flex: 1;
		min-width: 0;
		/* 터치로 끌 때 페이지가 같이 스크롤되지 않게 한다. */
		touch-action: none;
		cursor: crosshair;
	}

	.block {
		position: absolute;
		left: 0;
		right: 0;
		border: 0;
		border-radius: 3px;
		padding: 0;
		background-color: var(--c);
		cursor: grab;
	}

	/*
		빗금은 PNG 와 같은 기하(45도, 3px 획, 8px 주기)로 그린다. 두 그림에서 같은
		무늬로 읽혀야 한다.
	*/
	.block.hatch {
		background-color: color-mix(in srgb, var(--c) 22%, transparent);
		background-image: repeating-linear-gradient(45deg, var(--c) 0 3px, transparent 3px 8px);
	}

	.block.ghost {
		opacity: 0.45;
		pointer-events: none;
	}

	/* 끝을 잡는 자리. 한 칸(22px)짜리 막대에서도 몸통이 남도록 6px 로 둔다. */
	.handle {
		position: absolute;
		left: 0;
		right: 0;
		height: 6px;
		cursor: ns-resize;
	}

	.handle.top {
		top: 0;
	}

	.handle.bottom {
		bottom: 0;
	}

	.kill {
		position: absolute;
		top: 2px;
		left: 0;
		right: 0;
		display: grid;
		place-items: center;
		width: 14px;
		height: 14px;
		margin: 0 auto;
		border: 0;
		border-radius: 50%;
		padding: 0;
		background-color: var(--surface);
		color: var(--ink);
		opacity: 0;
		cursor: pointer;
	}

	.block:hover .kill,
	.block:focus-within .kill {
		opacity: 0.9;
	}
</style>
