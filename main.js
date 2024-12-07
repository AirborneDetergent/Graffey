function render() {
	display.render();
	requestAnimationFrame(render);
}

let equaTable = new EquationTable();
equaTable.addEquation();

let display = new Display();

requestAnimationFrame(render);