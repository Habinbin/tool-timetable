<script lang="ts">
	import { untrack } from 'svelte';

	import XIcon from '@lucide/svelte/icons/x';

	import { PALETTE_SIZE, type Person } from '../schedule';

	interface Props {
		person: Person;
		/** 방금 만들어진 칩이면 이름 입력 상태로 뜬다. */
		autoEdit?: boolean;
		/** 이름 입력이 끝났다 — 확정이든 취소든 한 번만 부른다. */
		oneditdone?: () => void;
		onrename: (name: string) => void;
		onrecolor: (color: number) => void;
		onremove: () => void;
	}

	let { person, autoEdit = false, oneditdone, onrename, onrecolor, onremove }: Props = $props();

	/*
		이름은 평소 글자로 있다가 눌렀을 때만 입력칸이 된다 — 칩이 폼처럼 보이지 않게.

		막 만들어진 칩은 입력 상태로 시작한다. 칩은 `person.id` 로 키가 걸려 있어
		사람이 생길 때 새로 마운트되므로, 초기값으로 잡으면 충분하다 — 나중에 켜고
		끄는 효과를 걸면 이름을 고치는 중에 다시 열리는 일이 생긴다.
	*/
	let editing = $state(untrack(() => autoEdit));
	/** 방금 만들어진 칩인가. 들어오는 순간만 부드럽게 나타나게 하는 데 쓴다. */
	const fresh = untrack(() => autoEdit);
	let picking = $state(false);
	let draft = $state(untrack(() => (autoEdit ? person.name : '')));

	const slots = Array.from({ length: PALETTE_SIZE }, (_, index) => index);

	function beginEdit(): void {
		draft = person.name;
		editing = true;
	}

	function commit(): void {
		if (!editing) return;
		editing = false;
		if (draft.trim() !== '' && draft.trim() !== person.name) onrename(draft);
		oneditdone?.();
	}

	function cancel(): void {
		editing = false;
		oneditdone?.();
	}

	function onKey(event: KeyboardEvent): void {
		if (event.key === 'Enter') commit();
		if (event.key === 'Escape') cancel();
	}

	/**
	 * 입력칸을 잡고 글자를 전부 고른다.
	 *
	 * 갓 만든 사람의 이름은 `인원 1` 같은 임시값이라, 지우고 쓰게 하지 않고 바로
	 * 덮어쓸 수 있어야 한다.
	 *
	 * @param node 이름 입력칸.
	 */
	function takeFocus(node: HTMLInputElement): void {
		node.focus();
		node.select();
	}
</script>

<div class="chip" class:editing class:fresh style:--c="var(--person-{person.color})">
	<div class="swatch-wrap">
		<button
			class="swatch"
			aria-label="{person.name} 색 바꾸기"
			aria-expanded={picking}
			onclick={() => (picking = !picking)}
		></button>

		{#if picking}
			<!-- 팔레트 밖의 색은 고르게 하지 않는다. 여덟 칸이면 충분하고,
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
		<input
			class="name-input"
			bind:value={draft}
			size={Math.max(3, draft.length)}
			aria-label="이름"
			onkeydown={onKey}
			onblur={commit}
			use:takeFocus
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
		transition:
			border-color 0.15s ease,
			background-color 0.15s ease;
	}

	/*
		이름을 고치는 동안의 표시는 **칩 전체**가 맡는다.

		입력칸에 초점 테두리를 두르면 알약 안에 각진 네모가 겹쳐 그려져, 한 칩 안에서
		모양 언어가 둘로 갈린다. 테두리 색과 옅은 면으로 대신하면 알약의 윤곽을 그대로
		쓰면서 "지금 여기를 고치는 중"이 읽힌다.
	*/
	.chip.editing {
		border-color: var(--accent);
		background-color: color-mix(in srgb, var(--accent) 5%, var(--surface));
	}

	/*
		막 만들어진 칩은 조용히 나타난다. 사람이 생겼다는 것은 색 칸과 레인이 이미
		말하고 있으므로, 눈길을 끄는 것이 아니라 갑자기 튀어나오지 않게만 한다.
	*/
	.chip.fresh {
		animation: chip-in 0.16s ease-out;
	}

	@keyframes chip-in {
		from {
			opacity: 0;
			transform: translateY(-2px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.chip.fresh {
			animation: none;
		}

		.chip {
			transition: none;
		}
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
		grid-template-columns: repeat(4, 20px);
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

	/* 칩이 상태를 보여 주므로 입력칸은 아무 테두리도 갖지 않는다. */
	.name-input {
		min-width: 3ch;
	}

	.name-input:focus,
	.name-input:focus-visible {
		outline: none;
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
