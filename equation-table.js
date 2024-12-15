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
	
	randomColor() {
		let dists = new Array(512);
		dists.fill(512);
		let preExisting = false;
		for(let id in this.equations) {
			dists[Math.floor(this.equations[id].angle * 512)] = 0;
			preExisting = true;
		}
		let angle;
		let theta;
		if(preExisting) {
			for(let i = 0; i < dists.length * 2; i++) {
				let wave = dists[(i - 1 + dists.length * 2) % dists.length] + 1;
				if(dists[i % dists.length] > wave) dists[i % dists.length] = wave;
			}
			for(let i = dists.length * 2 - 1; i >= 0; i--) {
				let wave = dists[(i + 1 + dists.length * 2) % dists.length] + 1;
				if(dists[i % dists.length] > wave) dists[i % dists.length] = wave;
			}
			let angInd = 0;
			for(let i = 0; i < dists.length; i++) {
				if(dists[i] > dists[angInd]) angInd = i;
			}
			angle = angInd / dists.length;
			console.log(angle);
			theta = angle * Math.PI * 2;
			console.log(dists);
		} else {
			angle = Math.random();
			theta = angle * Math.PI * 2;
		}
		let A = Math.cos(theta) / Math.sqrt(2) * 0.61;
		let B = Math.sin(theta) / Math.sqrt(6) * 0.61;
		let r = 0.5 - B + A;
		let g = 0.5 - B - A;
		let b = 0.5 + 2 * B;
		let e = 1 / 2.2;
		r = r ** e;
		g = g ** e;
		b = b ** e;
		return [r * 255, g * 255, b * 255, angle];
	}
	
	addEquation() {
		let [r, g, b, angle] = this.randomColor();
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
		this.equations[equa.id] = {r, g, b, angle,
			content: '', 
			isModified: true};
	}
}