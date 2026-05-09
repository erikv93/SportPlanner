<script lang="ts">
	type Activity = 'Hardlopen' | 'Bovenlichaam' | 'Onderlichaam' | 'Rustdag';

	interface ActivityInfo {
		emoji: string;
		label: string;
		color: string;
	}

	let officeDays = $state(new Set<number>());

	// Week selection: defaults to current ISO week
	let selectedWeekStart = $state(startOfISOWeek(new Date()));

	let selectedWeekStartISO = $state('');

	// Reactive updates using runes-compatible helpers
	$effect(() => {
		if (selectedWeekStartISO) selectedWeekStart = startOfISOWeek(new Date(selectedWeekStartISO));
	});

	// Keep ISO string synced to the selected week start
	$effect(() => {
		const iso = selectedWeekStart.toISOString();
		if (selectedWeekStartISO !== iso) selectedWeekStartISO = iso;
	});

	let weekOptions = $state<Date[]>([]);
	$effect(() => {
		weekOptions = generateWeekOptions(selectedWeekStart, 4);
	});

	const daysOfWeek: string[] = [
		"Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"
	];

	const activityMap: Record<Activity, ActivityInfo> = {
		Hardlopen: { emoji: "🏃‍♂️", label: "Hardlopen", color: "#0984e3" },
		Bovenlichaam: { emoji: "💪", label: "Bovenlichaam", color: "#d63031" },
		Onderlichaam: { emoji: "🦵", label: "Onderlichaam", color: "#d63031" },
		Rustdag: { emoji: "😴", label: "Rustdag", color: "#b2bec3" }
	};

	const schedule = $derived.by(() => {
		const newSchedule: (Activity | null)[] = new Array(7).fill(null);
		let strengthPool: Activity[] = ["Bovenlichaam", "Bovenlichaam", "Onderlichaam"];
		let runCount = 3;

		newSchedule[4] = "Hardlopen";
		runCount--;

		const runPriority = [0, 1, 2, 3, 5, 6].sort((a, b) => {
			const aOffice = officeDays.has(a) ? 1 : 0;
			const bOffice = officeDays.has(b) ? 1 : 0;
			return aOffice - bOffice;
		});

		for (const day of runPriority) {
			if (runCount > 0 && !newSchedule[day]) {
				newSchedule[day] = "Hardlopen";
				runCount--;
			}
		}

		const possibleLegDays = [0, 1, 2, 3, 5, 6];
		for (const day of possibleLegDays) {
			if (!newSchedule[day]) {
				const prev = (day - 1 + 7) % 7;
				const next = (day + 1) % 7;
				if (newSchedule[prev] !== "Hardlopen" && newSchedule[next] !== "Hardlopen") {
					newSchedule[day] = "Onderlichaam";
					strengthPool = strengthPool.filter(a => a !== "Onderlichaam");
					break;
				}
			}
		}

		strengthPool.forEach(workout => {
			for (let i = 0; i < 7; i++) {
				if (!newSchedule[i]) {
					newSchedule[i] = workout;
					break;
				}
			}
		});

		return newSchedule;
	});

	function toggleOfficeDay(idx: number): void {
		if (officeDays.has(idx)) {
			officeDays.delete(idx);
		} else {
			officeDays.add(idx);
		}
		officeDays = new Set(officeDays);
	}

	function startOfISOWeek(d: Date): Date {
		const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
		const day = (date.getDay() + 6) % 7; // Monday=0
		date.setDate(date.getDate() - day);
		date.setHours(0,0,0,0);
		return date;
	}

	function endOfISOWeek(start: Date): Date {
		const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
		d.setDate(d.getDate() + 6);
		d.setHours(23,59,59,999);
		return d;
	}

	function getISOWeekNumber(d: Date): number {
		const target = new Date(d.valueOf());
		const dayNr = (target.getDay() + 6) % 7;
		target.setDate(target.getDate() - dayNr + 3);
		const firstThursday = new Date(target.getFullYear(), 0, 4);
		const diff = target.getTime() - firstThursday.getTime();
		return 1 + Math.round(diff / 604800000);
	}

	function formatDayShort(d: Date | null): string {
		if (!d) return '';
		const weekday = new Intl.DateTimeFormat('nl-NL', { weekday: 'short' }).format(d);
		const dayMonth = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(d);
		return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${dayMonth}`;
	}

	function formatRange(start: Date, end: Date): string {
		const s = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(start);
		const e = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(end);
		return `${s} - ${e}`;
	}

	function generateWeekOptions(centerStart: Date, radius = 4): Date[] {
		const opts: Date[] = [];
		for (let i = -radius; i <= radius; i++) {
			const d = new Date(centerStart.getFullYear(), centerStart.getMonth(), centerStart.getDate());
			d.setDate(d.getDate() + i * 7);
			opts.push(startOfISOWeek(d));
		}
		return opts;
	}

	function dateForIndex(i: number): Date | null {
		if (!selectedWeekStart) return null;
		const d = new Date(selectedWeekStart.getFullYear(), selectedWeekStart.getMonth(), selectedWeekStart.getDate());
		d.setDate(d.getDate() + i);
		return d;
	}
</script>

<main class="container">
	<div class="card">
		<header class="no-print">
			<h1>Live Sport Planner</h1>
			<div class="week-select">
				<label for="week">Selecteer week:</label>
				<select id="week" bind:value={selectedWeekStartISO}>
					{#each weekOptions as w}
						<option value={w.toISOString()}>{`Wk ${getISOWeekNumber(w)} — ${formatRange(w, endOfISOWeek(w))}`}</option>
					{/each}
				</select>
			</div>
		</header>

		<div class="office-selector no-print">
			{#each daysOfWeek.slice(0, 5) as day, i}
				<button
					type="button"
					class="day-btn"
					class:active={officeDays.has(i)}
					onclick={() => toggleOfficeDay(i)}
				>
					{day.substring(0, 2)}
				</button>
			{/each}
		</div>

		<div class="table-wrapper">
			<h2 class="print-only">Mijn Sportschema
                {#if selectedWeekStart}
                <span>- week {getISOWeekNumber(selectedWeekStart)} ({formatRange(selectedWeekStart, endOfISOWeek(selectedWeekStart))})</span>
                 {/if}
            </h2>
			<table>
				<thead>
					<tr>
						<th>Dag</th>
						<th class="no-print">Locatie</th>
						<th>Activiteit</th>
					</tr>
				</thead>
				<tbody>
					{#each schedule as activity, i}
						{@const current = activity || 'Rustdag'}
							<tr class:is-weekend={i > 4}>
								{#if selectedWeekStart}
									<td>{formatDayShort(dateForIndex(i))}</td>
								{:else}
									<td>{daysOfWeek[i]}</td>
								{/if}
							<td class="no-print">
								<span class={officeDays.has(i) ? 'tag office' : 'tag home'}>
									<span class="no-print">{officeDays.has(i) ? '🏢' : '🏠'}</span>
									{officeDays.has(i) ? 'Kantoor' : 'Thuis'}
								</span>
							</td>
							<td class="activity-cell" style="--act-color: {activityMap[current].color}">
								<span class="emoji no-print">{activityMap[current].emoji}</span>
								<span class="label">{activityMap[current].label}</span>
							</td>
							</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<footer class="hint no-print">
			<div class="rules">
				<strong>Regels</strong>
				<ul>
					<li>Klik op je kantoordagen om de locatie te wisselen.</li>
					<li>Selecteer een week om dag en maand in de 'Dag' kolom te tonen.</li>
					<li>Gebruik Ctrl/Cmd+P om te printen — de print toont weeknummer en datums.</li>
					<li>Weekenden zijn visueel gemarkeerd.</li>
				</ul>
			</div>
		</footer>
	</div>
</main>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		background-color: #e6e6e6;
		font-family: Arial, Helvetica, sans-serif;
		color: #222;
		font-size: 13px;
	}

	@media print {
		:global(body) {
			background-color: white !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		
		.no-print {
			display: none !important;
		}
		
		.print-only {
			display: block !important;
			margin-bottom: 20px;
			font-size: 20pt;
		}

		.container {
			padding: 0 !important;
			display: block !important;
		}

		.card {
			box-shadow: none !important;
			border: none !important;
			width: 100% !important;
			padding: 0 !important;
		}

		table {
			width: 100%;
			border: 1.5pt solid #000 !important; /* Buitenste dikke rand */
			border-collapse: collapse !important;
		}

		th, td {
			/* Verticale en horizontale lijnen voor het rooster-effect */
			border: 1pt solid #000 !important; 
			color: black !important;
			padding: 8pt !important;
			background-color: transparent !important;
		}

		th {
			background-color: #f2f2f2 !important;
			text-transform: uppercase;
			font-size: 10pt;
		}

		/* Haal badge-styling weg voor print */
		.tag {
			background: transparent !important;
			border: none !important;
			padding: 0 !important;
			color: black !important;
			font-weight: normal !important;
			font-size: medium !important;
		}

		.activity-cell {
			color: black !important;
			font-weight: normal !important;
		}

		.is-weekend {
			background-color: transparent !important;
		}
	}

	/* Web-only styles (old-school business look) */
	.print-only { display: none; }

	.container { display: flex; justify-content: center; padding: 1rem; }

	.card {
		background: #fff;
		width: 100%;
		max-width: 800px;
		padding: 1rem;
		border: 1px solid #a7a7a7;
		box-shadow: none;
	}

	header { margin-bottom: 1rem; text-align: center; }
	h1 { margin: 0; color: #1a202c; font-size: 1.25rem; }

	.office-selector { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }

	.day-btn {
		flex: 1;
		padding: 0.6rem;
		border: 1px solid #7f8c8d;
		background: linear-gradient(#ffffff, #dfe7eb);
		border-radius: 2px;
		cursor: pointer;
		font-weight: 700;
		box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.05);
	}

	.day-btn.active { background: #c5c8ca; color: #000; border-color: #6b6f72; }

	table { width: 100%; border-collapse: collapse; border:1px solid #777; }
	th {
		padding: 0.5rem 0.75rem; text-align: left; font-size: 12px; text-transform: uppercase; color: #000;
		background: linear-gradient(#d0d7de, #f6f8f9); border-bottom: 1px solid #777; box-shadow: inset 0 -1px 0 rgba(255,255,255,0.6);
	}

	td { padding: 0.75rem; border-bottom: 1px solid #ddd; }
	.is-weekend { background-color: #fffaf0; }

	.activity-cell { color: var(--act-color); font-weight: bold; }

	.tag { padding: 0.25rem 0.5rem; border-radius: 2px; font-size: 0.8rem; font-weight: 600; }
	.tag.office { background: #edf2f7; color: #4a5568; }
	.tag.home { background: #c6f6d5; color: #22543d; }

	/* Footer rules (web only, light grey) */
	.rules { color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.5rem; text-align: left; margin-top: 1rem; }
	.rules strong { display: block; margin-bottom: 0.25rem; color: #64748b; }
	.rules ul { margin: 0; padding-left: 1.1rem; }
	.rules li { margin: 0.15rem 0; }
</style>
