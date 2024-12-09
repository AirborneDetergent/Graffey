class EquationTable {
	constructor() {
		this.table = document.getElementById('equation-table').children[0];
		this.nextId = 0;
		this.equations = {};
	}
	
	newEquation(r, g, b) {
		let equa = document.getElementById('equation').content.cloneNode(true);
		let button = equa.getElementById('equation-button');
		button.style = `color: rgb(${r}, ${g}, ${b});`;
		return equa;
	}
	
	addEquation() {
		let r = Math.floor(Math.random() * 128 + 128);
		let g = Math.floor(Math.random() * 128 + 128);
		let b = Math.floor(Math.random() * 128 + 128);
		if(r === undefined) {
			r = 255;
			g = 255;
			b = 255;
		}
		if(g === undefined) {
			g = r;
			b = r;
		}
		let equa = this.newEquation(r, g, b);
		this.table.appendChild(equa);
		equa = this.table.children[this.table.children.length - 1];
		equa.id = `equation-${this.nextId++}`;
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
		this.equations[equa.id] = {r, g, b, content: '', isModified: false};
	}
}