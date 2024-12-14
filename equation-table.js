class EquationTable {
	constructor() {
		this.table = document.getElementById('equation-table').children[0];
		this.nextId = 0;
		this.equations = {};
		this.theta = Math.random() * 2 * Math.PI;
	}
	
	newEquation(r, g, b) {
		let equa = document.getElementById('equation').content.cloneNode(true);
		let button = equa.getElementById('equation-button');
		button.style = `color: rgb(${r}, ${g}, ${b});`;
		return equa;
	}
	
	randomColor() {
		this.theta += (Math.random() * 0.5 + 1) * Math.PI * 2 / 8;
		let A = Math.cos(this.theta) / Math.sqrt(2) / 2;
		let B = Math.sin(this.theta) / Math.sqrt(6) / 2;
		let r = 0.5 - B + A;
		let g = 0.5 - B - A;
		let b = 0.5 + 2 * B;
		let e = 1 / 2.2;
		r = r ** e;
		g = g ** e;
		b = b ** e;
		return [r * 255, g * 255, b * 255];
	}
	
	addEquation() {
		let [r, g, b] = this.randomColor();
		let equa = this.newEquation(r, g, b);
		this.table.appendChild(equa);
		equa = this.table.children[this.table.children.length - 1];
		equa.id = `equation${this.nextId++}`;
		let delButton = equa.querySelector('#equation-delete');
		delButton.onclick = () => {
			equa.remove();
			delete this.equations[equa.id];
		};
		let content = equa.querySelector('#equation-content');
		content.oninput = (e) => {
			let id = e.target.parentElement.parentElement.id;
			this.equations[id].content = e.target.value;
			this.equations[id].isModified = true;
		}
		this.equations[equa.id] = {r, g, b, content: '', isModified: true};
	}
}