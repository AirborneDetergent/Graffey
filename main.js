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
			if(renderer.usesTime) {
				this.element.textContent += `\r\n${Math.round(renderer.getCurTime())}s`;
			} else {
				this.element.textContent += `\r\n${renderer.accumFrames}/${renderer.maxAccumFrames}`;
			}
			this.frameCount = 0;
			this.peak = 0;
		}
		this.frameCount++;
		return elapsed;
	}
}

function getSavedGraphs() {
	let tbody = document.querySelector('#io-modal-tbody');
	let rowTemplate = document.querySelector('#io-table-row');
	let input = document.querySelector('#io-modal-input');
	tbody.innerHTML = '';
	for(let i = 0; i < window.localStorage.length; i++) {
		let entry = window.localStorage.key(i);
		let row = rowTemplate.content.cloneNode(true);
		tbody.appendChild(row);
		row = tbody.lastElementChild;
		row.querySelector('td').textContent = entry;
		row.addEventListener('click', () => {
			input.value = entry;
		});
	}
}

function save(name) {
	if(!name) return false;
	let data = {
		equations: equaTable.equations,
		minX: display.camera.minX,
		maxX: display.camera.maxX,
		minY: display.camera.minY,
		maxY: display.camera.maxY,
		drawIsolines: renderer.drawIsolines,
		randomSeed: renderer.randomSeed,
		drawBackground: display.drawBackground
	}
	window.localStorage.setItem(name, JSON.stringify(data));
	return true;
}

function unsave(name) {
	if(name) {
		window.localStorage.removeItem(name);
		return true;
	}
	return false;
}

function load(name) {
	if(!name) return false;
	let json = window.localStorage.getItem(name);
	if(!json) return false;
	for(let i = equaTable.table.children.length - 1; i >= 0; i--) {
		let equa = equaTable.table.children[i];
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
		equaTable.addEquation(e.r, e.g, e.b, e.ir, e.ig, e.ib, e.angle, e.secAngle, e.content, id);
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
	display.drawBackground = data.drawBackground !== undefined ? data.drawBackground : true;
	renderer.drawIsolines = data.drawIsolines;
	renderer.randomSeed = data.randomSeed;
	let button = document.querySelector('#toggle-isolines');
	button.classList.toggle('opacity-25', !renderer.drawIsolines);
	button = document.querySelector('#toggle-grid');
	button.classList.toggle('opacity-25', !display.drawBackground);
	compiler.forceRecompile = true;
	return true;
}

let prevEnterHandler = null;

function initModal(text, callback, buttonType) {
	getSavedGraphs();
	let title = document.querySelector('#io-modal-title');
	title.textContent = `${text} Graph`;
	let button = document.querySelector('#io-modal-button');
	button.textContent = text;
	let input = document.querySelector('#io-modal-input');
	button.classList.remove('btn-primary', 'btn-danger', 'btn-warning');
	button.classList.add(`btn-${buttonType}`);
	button.onclick = () => {
		callback(input.value);
	}
	let modal = new bootstrap.Modal(document.querySelector('#io-modal'));
	let enterHandler = (e) => {
		if(e.key == 'Enter') {
			e.preventDefault();
			callback(input.value);
			modal.hide();
		}
	}
	if(prevEnterHandler) {
		input.removeEventListener('keypress', prevEnterHandler);
	}
	input.addEventListener('keypress', enterHandler);
	prevEnterHandler = enterHandler;
	modal.show();
	input.focus();
}

function toggleIsolines() {
	let button = document.querySelector('#toggle-isolines');
	renderer.drawIsolines = !renderer.drawIsolines;
	button.classList.toggle('opacity-25', !renderer.drawIsolines);
	renderer.resetAccumulation();
}

function toggleGrid() {
	let button = document.querySelector('#toggle-grid');
	display.drawBackground = !display.drawBackground;
	button.classList.toggle('opacity-25', !display.drawBackground);
}

function render() {
	let dt = perfMeter.tick() / 1000;
	display.render(dt);
	renderer.render(dt);
	requestAnimationFrame(render);
}

let compiler = new Compiler();

let equaTable = new EquationTable(compiler);
let configModal = new ConfigModal(equaTable);
equaTable.configModal = configModal;
equaTable.makeEquation(true);
let display = new Display();
let renderer = new Renderer(display, equaTable, compiler);
let perfMeter = new PerfMeter();
configModal.renderer = renderer;

equaTable.renderer = renderer;

render();