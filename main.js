function render() {
	display.render();
	renderer.render();
	requestAnimationFrame(render);
}

let equaTable = new EquationTable();
equaTable.addEquation();

let display = new Display();

let renderer = new Renderer(display, equaTable);

requestAnimationFrame(render);