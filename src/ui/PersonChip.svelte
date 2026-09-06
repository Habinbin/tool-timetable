<script lang="ts">
	import XIcon from '@lucide/svelte/icons/x';

	import { PALETTE_SIZE, type Person } from '../schedule';

	interface Props {
		person: Person;
		onrename: (name: string) => void;
		onrecolor: (color: number) => void;
		onremove: () => void;
	}

	let { person, onrename, onrecolor, onremove }: Props = $props();

	/** 이름은 평소 글자로 있다가 눌렀을 때만 입력칸이 된다 — 칩이 폼처럼 보이지 않게. */
	let editing = $state(false);
	let picking = $state(false);
	let draft = $state('');

	const slots = Array.from({ length: PALETTE_SIZE }, (_, index) => index);

	function beginEdit(): void {
		draft = person.name;
		editing = true;
	}

	function commit(): void {
		editing = false;
		if (draft.trim() !== '' && draft.trim() !== person.name) onrename(draft);
	}

	function onKey(event: KeyboardEvent): void {
		if (event.key === 'Enter') commit();
		if (event.key === 'Escape') editing = false;
	}
</script>

<div class="chip" style:--c="var(--person-{person.color})">
	<div class="swatch-wrap">
		<button
			class="swatch"
			aria-label="{person.name} 색 바꾸기"
			aria-expanded={picking}
			onclick={() => (picking = !picking)}
		></button>

		{#if picking}
			<!-- 팔레트 밖의 색은 고르게 하지 않는다. 열두 칸이면 충분하고,
			     색값을 theme.css 한 곳에만 두는 계약도 지켜진다. @theme-contract -->
			<div class="palette">
				{#each slots as slot (slot)}
					<button
						class="slot"
						class:current={slot === person.color}
						style:--s="var(--person-{slot})"
						aria-label="{slot + 1}번 색"
						onclick={() => {
							onrecolor(slot);
							picking = false;
						}}
					></button>
				{/each}
			</div>
		{/if}
	</div>

	{#if editing}
		<!-- svelte-ignore a11y_autofocus -->
		<input
			class="name-input"
			bind:value={draft}
			autofocus
			size={Math.max(3, draft.length)}
			onkeydown={onKey}
			onblur={commit}
		/>
	{:else}
		<button class="name" onclick={beginEdit}>{person.name}</button>
	{/if}

	<button class="remove" aria-label="{person.name} 삭제" onclick={onremove}>
		<XIcon size={13} strokeWidth={2} />
	</button>
</div>

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-8);
		padding: var(--space-4) var(--space-8) var(--space-4) var(--space-4);
		border: 1px solid var(--line);
		border-radius: var(--radius-pill);
		background-color: var(--surface);
	}

	.swatch-wrap {
		position: relative;
		display: flex;
	}

	.swatch {
		width: 20px;
		height: 20px;
		border: 0;
		border-radius: 50%;
		padding: 0;
		background-color: var(--c);
		cursor: pointer;
	}

	/* 칩 흐름에서 띄워야 옆 칩들이 밀리지 않는다. */
	.palette {
		position: absolute;
		z-index: 2;
		top: calc(100% + var(--space-8));
		left: 0;
		display: grid;
		grid-template-columns: repeat(6, 20px);
		gap: var(--space-4);
		padding: var(--space-8);
		border: 1px solid var(--line);
		border-radius: var(--radius-control);
		background-color: var(--surface);
		box-shadow: 0 6px 20px rgb(0 0 0 / 12%);
	}

	.slot {
		width: 20px;
		height: 20px;
		border: 0;
		border-radius: 50%;
		padding: 0;
		background-color: var(--s);
		cursor: pointer;
	}

	.slot.current {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	.name,
	.name-input {
		border: 0;
		background: transparent;
		padding: 0;
		font-family: var(--font);
		font-size: var(--text-body-sm);
		color: var(--ink);
	}

	.name {
		cursor: text;
	}

	.name-input {
		min-width: 3ch;
		border-bottom: 1px solid var(--accent);
	}

	.remove {
		display: grid;
		place-items: center;
		border: 0;
		background: transparent;
		padding: 0;
		color: var(--ink-faint);
		cursor: pointer;
	}

	.remove:hover {
		color: var(--danger);
	}
</style>
