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
	}
}

function render() {
	perfMeter.tick();
	display.render();
	renderer.render();
	requestAnimationFrame(render);
}

let equaTable = new EquationTable();
equaTable.addEquation();

let display = new Display();

let renderer = new Renderer(display, equaTable);

let perfMeter = new PerfMeter();

render();