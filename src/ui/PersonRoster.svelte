<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';

	import type { Person } from '../schedule';
	import PersonChip from './PersonChip.svelte';

	interface Props {
		people: Person[];
		onadd: (name: string) => void;
		onrename: (id: string, name: string) => void;
		onrecolor: (id: string, color: number) => void;
		onremove: (id: string) => void;
	}

	let { people, onadd, onrename, onrecolor, onremove }: Props = $props();

	let adding = $state(false);
	let draft = $state('');
	let field: HTMLInputElement | undefined = $state();

	function open(): void {
		adding = true;
		// 입력칸은 아직 DOM 에 없다 — 렌더 다음 틱에 잡는다.
		queueMicrotask(() => field?.focus());
	}

	function submit(): void {
		if (draft.trim() === '') {
			adding = false;
			return;
		}
		onadd(draft);
		draft = '';
		// 한 명만 넣는 경우가 드물다. 입력칸을 열어 둔 채 다음 이름을 받는다.
		field?.focus();
	}

	function onKey(event: KeyboardEvent): void {
		if (event.key === 'Enter') submit();
		if (event.key === 'Escape') {
			draft = '';
			adding = false;
		}
	}
</script>

<div class="roster">
	{#each people as person (person.id)}
		<PersonChip
			{person}
			onrename={(name) => onrename(person.id, name)}
			onrecolor={(color) => onrecolor(person.id, color)}
			onremove={() => onremove(person.id)}
		/>
	{/each}

	{#if adding}
		<div class="add-field">
			<input
				bind:this={field}
				bind:value={draft}
				placeholder="이름"
				aria-label="추가할 인원 이름"
				onkeydown={onKey}
				onblur={() => (adding = draft.trim() !== '')}
			/>
		</div>
	{:else}
		<button class="add" onclick={open}>
			<PlusIcon size={15} strokeWidth={2} />
			인원 추가
		</button>
	{/if}
</div>

<style>
	.roster {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-8);
	}

	/*
		인원을 넣기 전에는 이 화면에서 할 수 있는 일이 이것뿐이다. 그래서 주 행동의
		처리를 쓴다 — 채운 면에 글자가 음각처럼 뚫린다. 점선 테두리는 "여기에 무언가
		놓아야 한다"로 읽혀 눌러야 하는 버튼과 어긋났다. @tool-ux-principles §2

		높이 30px 은 인원 칩과 같은 값이다. 한 줄에 나란히 서므로 어긋나면 눈에 띈다.
	*/
	.add {
		display: inline-flex;
		align-items: center;
		gap: var(--space-4);
		height: 30px;
		padding: 0 var(--space-12);
		border: 1px solid transparent;
		border-radius: var(--radius-pill);
		background-color: var(--accent);
		font-family: var(--font);
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--on-accent);
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.add:hover {
		background-color: var(--accent-hover);
	}

	.add-field {
		display: flex;
		align-items: center;
		height: 30px;
		padding: 0 var(--space-12);
		border: 1px solid var(--accent);
		border-radius: var(--radius-pill);
	}

	input {
		width: 8ch;
		border: 0;
		background: transparent;
		padding: 0;
		font-family: var(--font);
		font-size: var(--text-body-sm);
		color: var(--ink);
	}

	input:focus,
	input:focus-visible {
		outline: none;
	}

	input::placeholder {
		color: var(--ink-faint);
	}
</style>
