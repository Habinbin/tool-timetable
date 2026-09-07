<script lang="ts">
	/*
		인원 줄.

		"인원 추가"를 누르면 **사람이 먼저 생기고** 그 칩 안에서 이름을 받는다. 버튼이
		입력칸으로 변하지 않는다 — 버튼이 사라지면 방금 무엇을 눌렀는지, 지금 무엇을
		하는 중인지가 화면에서 없어진다. 색 칸을 차지한 칩이 먼저 보여야 "이 사람"이
		생겼다는 것이 눈에 남는다.
	*/
	import PlusIcon from '@lucide/svelte/icons/plus';

	import type { Person } from '../schedule';
	import PersonChip from './PersonChip.svelte';

	interface Props {
		people: Person[];
		/** 사람을 하나 만든다. 이름은 그 뒤 칩에서 받는다. */
		onadd: () => void;
		/** 방금 만들어져 이름을 기다리는 사람. 그 칩만 입력 상태로 뜬다. */
		pendingId?: string;
		/** 이름 입력이 끝났다(확정이든 취소든). */
		onnamed: () => void;
		onrename: (id: string, name: string) => void;
		onrecolor: (id: string, color: number) => void;
		onremove: (id: string) => void;
	}

	let { people, onadd, pendingId = '', onnamed, onrename, onrecolor, onremove }: Props = $props();
</script>

<div class="roster">
	{#each people as person (person.id)}
		<PersonChip
			{person}
			autoEdit={person.id === pendingId}
			oneditdone={onnamed}
			onrename={(name) => onrename(person.id, name)}
			onrecolor={(color) => onrecolor(person.id, color)}
			onremove={() => onremove(person.id)}
		/>
	{/each}

	<button class="add" onclick={onadd}>
		<PlusIcon size={15} strokeWidth={2} />
		인원 추가
	</button>
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
</style>
