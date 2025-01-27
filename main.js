class PerfMeter {
	constructor() {
		this.element = document.getElementById('perf-meter');
		this.lastTick = Date.now();
		this.lastUpdate = this.lastTick;
		this.frameCount = 0;
		this.peak = 0;
	}
	
	tick() {
		let now = Date.now();
		let elapsed = now - this.lastTick;
		this.lastTick = now;
		let sinceUpdate = now - this.lastUpdate;
		this.peak = Math.max(this.peak, elapsed);
		if(sinceUpdate >= 1000) {
			let fps = this.frameCount / sinceUpdate * 1000;
			this.lastUpdate = now;
			this.element.textContent = `${fps.toFixed(2)} FPS\r\n${this.peak}ms peak`;
			this.frameCount = 0;
			this.peak = 0;
		}
		this.frameCount++;
		return elapsed;
	}
}

function getSavedGraphs() {
	let saved = '';
	for(let i = 0; i < window.localStorage.length; i++) {
		let entry = window.localStorage.key(i);
		saved += entry + '\n';
	}
	if(saved !== '') {
		saved = 'Saved Graphs:\n' + saved;
	}
	return saved;
}

function save() {
	let saved = getSavedGraphs();
	let name = prompt(saved + 'Graph Name:');
	if(name) {
		let data = {
			equations: equaTable.equations,
			minX: display.camera.minX,
			maxX: display.camera.maxX,
			minY: display.camera.minY,
			maxY: display.camera.maxY,
			drawIsolines: renderer.drawIsolines,
			randomSeed: renderer.randomSeed,
		}
		window.localStorage.setItem(name, JSON.stringify(data));
	}
}

function unsave() {
	let saved = getSavedGraphs();
	if(saved == '') {
		alert('You can\'t unsave what hasn\'t been saved.');
	} else {
		let name = prompt(saved + 'Graph to Unsave:');
		if(name) {
			window.localStorage.removeItem(name);
		}
	}
}

function load() {
	let saved = getSavedGraphs();
	let name = prompt(saved + 'Graph to Load:');
	if(name == null) return;
	let json = window.localStorage.getItem(name);
	if(!json) return;
	for(let i = equaTable.table.children.length - 1; i >= 0; i--) {
		let equa = equaTable.table.children[i];
		console.log(equa.id);
		if(equa.id == 'ignore') continue;
		equa.remove();
		delete equaTable.equations[equa.id];
	}
	equaTable.nextId = 0;
	let data = JSON.parse(json);
	equaTable.equations = data.equations;
	for(let id in equaTable.equations) {
		let idInt = Number(id.replace('equation', ''));
		equaTable.nextId = Math.max(idInt, equaTable.nextId);
		let e = equaTable.equations[id];
		e.program = null;
		equaTable.addEquation(e.r, e.g, e.b, e.ir, e.ig, e.ib, e.angle, e.content, id);
	}
	equaTable.nextId++;
	display.camera.tarMinX = data.minX;
	display.camera.tarMaxX = data.maxX;
	display.camera.tarMinY = data.minY;
	display.camera.tarMaxY = data.maxY;
	display.camera.minX = data.minX;
	display.camera.maxX = data.maxX;
	display.camera.minY = data.minY;
	display.camera.maxY = data.maxY;
	renderer.drawIsolines = data.drawIsolines;
	renderer.randomSeed = data.randomSeed;
	let button = document.querySelector('#toggle-isolines');
	button.classList.toggle('opacity-25', !renderer.drawIsolines);
	compiler.forceRecompile = true;
}

function toggleIsolines() {
	let button = document.querySelector('#toggle-isolines');
	renderer.drawIsolines = !renderer.drawIsolines;
	button.classList.toggle('opacity-25', !renderer.drawIsolines);
	renderer.accumFrames = 0;
}

function render() {
	let dt = perfMeter.tick() / 1000;
	display.render(dt);
	renderer.render(dt);
	requestAnimationFrame(render);
}

let compiler = new Compiler();

let equaTable = new EquationTable(compiler);
equaTable.makeEquation();

let display = new Display();

let renderer = new Renderer(display, equaTable, compiler);

let perfMeter = new PerfMeter();

equaTable.renderer = renderer;

render();