<script lang="ts">
	/*
		폰트를 툴이 직접 싣는다. 호스트에서 빌려 쓰면 툴박스 안에서와 단독 배포에서
		다른 글꼴로 뜬다. @typography-and-language
	*/
	import '@fontsource-variable/noto-sans-kr';
	import './ui/theme.css';

	import { onMount } from 'svelte';

	import ImageIcon from '@lucide/svelte/icons/image';

	import { renderTimetablePng, type PngTheme } from './png';
	import {
		DEFAULT_TITLE,
		PALETTE_SIZE,
		addBlock,
		addPerson,
		removeBlock,
		removePerson,
		setBlockRange,
		togglePattern,
		updatePerson,
		type Block,
		type Person
	} from './schedule';
	import { loadTimetable, saveTimetable } from './storage';
	import type { TimeRange } from './time';
	import Button from './ui/Button.svelte';
	import PersonRoster from './ui/PersonRoster.svelte';
	import TimetableGrid from './ui/TimetableGrid.svelte';

	let title = $state(DEFAULT_TITLE);
	let people = $state<Person[]>([]);
	let blocks = $state<Block[]>([]);
	let notice = $state('');

	/** 저장된 값을 읽기 전에 빈 상태를 덮어쓰지 않기 위한 빗장. */
	let restored = $state(false);
	let root: HTMLDivElement | undefined = $state();

	onMount(() => {
		const stored = loadTimetable();
		if (stored !== null) {
			title = stored.title;
			people = stored.people;
			blocks = stored.blocks;
		}
		restored = true;
	});

	/*
		저장 버튼을 두지 않는다는 결정이 이 한 줄이다 — 바뀔 때마다 조용히 쓴다.
		복원 전에는 돌지 않는다. 그렇지 않으면 빈 초기 상태가 저장된 내용을 지운다.
	*/
	$effect(() => {
		if (!restored) return;
		saveTimetable({ title, people, blocks });
	});

	/**
	 * `.tool-root` 에 걸린 토큰을 실제 색값으로 읽는다.
	 *
	 * PNG 는 CSS 를 모르므로 값을 넘겨야 하는데, 값을 두 번 적는 대신 화면이 쓰는 것을
	 * 그대로 읽는다 — 호스트가 테마를 덮어써도 PNG 가 같이 따라간다. @theme-contract
	 *
	 * @param element `.tool-root` 요소.
	 * @returns PNG 에 넘길 색·서체.
	 */
	function readTheme(element: HTMLElement): PngTheme {
		const style = getComputedStyle(element);
		const token = (name: string): string => style.getPropertyValue(name).trim();
		return {
			people: Array.from({ length: PALETTE_SIZE }, (_, index) => token(`--person-${index}`)),
			ink: token('--ink'),
			inkMuted: token('--ink-muted'),
			line: token('--line'),
			lineStrong: token('--line-strong'),
			accent: token('--accent'),
			onAccent: token('--on-accent'),
			surface: token('--surface'),
			font: token('--font')
		};
	}

	/**
	 * 파일 이름을 만든다. 제목을 그대로 쓰되 파일 이름에 못 쓰는 글자만 턴다.
	 *
	 * @param extension 확장자.
	 * @returns 내려받을 파일 이름.
	 */
	function fileName(extension: string): string {
		const base = title.replace(/[\\/:*?"<>|]/g, '').trim();
		return `${base === '' ? 'timetable' : base}.${extension}`;
	}

	function download(blob: Blob, name: string): void {
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = name;
		link.click();
		URL.revokeObjectURL(url);
	}

	async function exportPng(): Promise<void> {
		if (root === undefined) return;
		notice = '';
		try {
			download(
				await renderTimetablePng({ title, people, blocks }, readTheme(root)),
				fileName('png')
			);
		} catch {
			notice = 'PNG 를 만들지 못했습니다.';
		}
	}

	function dropPerson(id: string): void {
		const next = removePerson({ title, people, blocks }, id);
		people = next.people;
		blocks = next.blocks;
	}

	function create(seed: { personId: string; day: number; range: TimeRange }): void {
		blocks = addBlock(blocks, seed);
	}
</script>

<!--
	본문만 그린다. 제목·설명·뒤로가기는 호스트(툴박스 또는 단독 앱)의 몫이다.
	여기 있는 제목은 화면 크롬이 아니라 시간표 자체의 이름이다 — PNG 배너로 나간다.
-->
<div class="tool-root" bind:this={root}>
	<div class="bar">
		<input class="title" bind:value={title} aria-label="시간표 제목" placeholder={DEFAULT_TITLE} />

		<div class="actions">
			<!--
				인원이 없으면 내보낼 것이 없다. 숨기지 않고 비활성으로 두어 기능이
				있다는 것은 남긴다 — 왜 눌리지 않는지는 아래 빈 상태 안내가 말한다.
				@tool-ux-principles §2
			-->
			<Button
				variant="filled"
				compact
				disabled={people.length === 0}
				title={people.length === 0 ? '인원을 추가하면 내보낼 수 있습니다' : undefined}
				onclick={exportPng}
			>
				<ImageIcon size={15} strokeWidth={1.75} />
				PNG 내보내기
			</Button>
		</div>
	</div>

	<PersonRoster
		{people}
		onadd={(name) => (people = addPerson(people, name))}
		onrename={(id, name) => (people = updatePerson(people, id, { name }))}
		onrecolor={(id, color) => (people = updatePerson(people, id, { color }))}
		onremove={dropPerson}
	/>

	{#if notice !== ''}
		<p class="notice">{notice}</p>
	{/if}

	{#if people.length === 0}
		<div class="empty">
			<p>인원을 추가하세요.</p>
			<p class="sub">이름을 넣으면 요일마다 그 사람의 세로 레인이 생깁니다.</p>
		</div>
	{:else}
		<TimetableGrid
			{people}
			{blocks}
			oncreate={create}
			onmoveend={(id, range) => (blocks = setBlockRange(blocks, id, range))}
			ontoggle={(id) => (blocks = togglePattern(blocks, id))}
			onremove={(id) => (blocks = removeBlock(blocks, id))}
		/>

		<p class="legend">
			<span class="key solid"></span>고정 일정
			<span class="key hatch"></span>그 밖의 일정 — 막대를 누르면 서로 바뀝니다. 끌어서 만들고, 끝을
			잡아 늘이고, 몸통을 잡아 옮깁니다.
		</p>
	{/if}
</div>

<style>
	.tool-root {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: var(--space-16);
	}

	/* 컨트롤 줄은 카드가 아니라 헤어라인 띠 — 캔버스 위에 면을 하나 더 얹지 않는다. */
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-16);
		padding-bottom: var(--space-16);
		border-bottom: 1px solid var(--line);
	}

	/*
		제목은 입력칸처럼 보이지 않는다. 여기 적은 글자가 그대로 PNG 배너로 나가므로,
		테두리 없이 결과에 가까운 모습으로 둔다.
	*/
	.title {
		flex: 1;
		min-width: 12ch;
		border: 0;
		border-bottom: 1px solid transparent;
		background: transparent;
		padding: 0 0 var(--space-4);
		font-family: var(--font);
		font-size: var(--text-title);
		font-weight: 600;
		color: var(--ink);
	}

	.title:hover {
		border-bottom-color: var(--line);
	}

	.title:focus {
		border-bottom-color: var(--accent);
		outline: none;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-8);
	}

	.notice {
		margin: 0;
		font-size: var(--text-body-sm);
		color: var(--warning);
	}

	.empty {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		min-height: 40vh;
		border: 1px dashed var(--line);
		border-radius: var(--radius-panel);
		color: var(--ink-muted);
	}

	.empty p {
		margin: 0;
	}

	.empty .sub {
		font-size: var(--text-body-sm);
		color: var(--ink-faint);
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4);
		margin: 0;
		font-size: var(--text-caption);
		color: var(--ink-muted);
	}

	.key {
		display: inline-block;
		width: 22px;
		height: 12px;
		border-radius: 3px;
		margin-right: var(--space-2);
	}

	.key.solid {
		background-color: var(--ink-faint);
	}

	.key.hatch {
		margin-left: var(--space-12);
		background-color: color-mix(in srgb, var(--ink-faint) 22%, transparent);
		background-image: repeating-linear-gradient(45deg, var(--ink-faint) 0 3px, transparent 3px 8px);
	}
</style>
