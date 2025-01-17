class EquationTable {
	constructor(compiler) {
		this.table = document.getElementById('equation-table').children[0];
		this.nextId = 0;
		this.equations = {};
		this.compiler = compiler;
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
		} else {
			angle = Math.random();
		}
		let [r, g, b] = this.colorFromTheta(angle * Math.PI * 2);
		return [r, g, b, angle];
	}
	
	colorFromTheta(theta) {
		let A = Math.cos(theta) / Math.sqrt(2) * 0.61;
		let B = Math.sin(theta) / Math.sqrt(6) * 0.61;
		let r = 0.5 - B + A;
		let g = 0.5 - B - A;
		let b = 0.5 + 2 * B;
		let e = 1 / 2.2;
		r = r ** e;
		g = g ** e;
		b = b ** e;
		return [r * 255, g * 255, b * 255];
	}
	
	changeIcon(id, newIcon) {
		let button = document.getElementById(id).querySelector('#equation-button');
		let space = button.className.indexOf(' ');
		let prevIcon = button.className.substring(0, space);
		button.className = button.className.replace(prevIcon, newIcon);
	}
	
	resetIcon(id) {
		let equa = this.equations[id];
		if(equa.isFunction) {
			this.changeIcon(id, 'bi-braces-asterisk');
		} else if(equa.method == 'gridSampleMethod') {
			this.changeIcon(id, 'bi-graph-up');
		} else if(equa.method == 'valuePlotMethod') {
			this.changeIcon(id, 'bi-grid-3x3');
		}
	}
	
	addEquation(r, g, b, ir, ig, ib, angle, contentString, id) {
		let equa = this.newEquation(r, g, b);
		this.table.appendChild(equa);
		equa = this.table.children[this.table.children.length - 1];
		equa.id = id;
		let delButton = equa.querySelector('#equation-delete');
		delButton.onclick = () => {
			if(equa.isFunction) {
				this.compiler.forceRecompile = true;
			}
			equa.remove();
			delete this.equations[equa.id];
		};
		let eqButton = equa.querySelector('#equation-button');
		eqButton.onclick = () => {
			if(this.equations[equa.id].isHidden) {
				this.equations[equa.id].isHidden = false;
				eqButton.className = eqButton.className.replace(' opacity-25', '');
			} else {
				this.equations[equa.id].isHidden = true;
				eqButton.className = eqButton.className + ' opacity-25';
			}
		};
		let content = equa.querySelector('#equation-content');
		content.value = contentString;
		content.oninput = (e) => {
			let id = e.target.parentElement.parentElement.id;
			let equa = this.equations[id];
			equa.content = e.target.value;
			equa.isModified = true;
			let wasFunc = equa.isFunction;
			equa.isFunction = equa.content.indexOf('=>') != -1;
			if(equa.isFunction || wasFunc) {
				this.compiler.forceRecompile = true;
				this.resetIcon(id);
			}
		}
		if(!this.equations[equa.id]) this.equations[equa.id] = {};
		let e = this.equations[equa.id];
		e.r = r;
		e.g = g;
		e.b = b;
		e.ir = ir;
		e.ig = ig;
		e.ib = ib;
		e.angle = angle;
		e.content = contentString;
		e.isModified = true;
		e.isFunction = e.content.indexOf('=>') != -1;
		this.resetIcon(id);
		if(e.isHidden) {
			eqButton.className = eqButton.className + ' opacity-25';
		}
	}
	
	makeEquation() {
		let [r, g, b, angle] = this.randomColor();
		let [ir, ig, ib] = this.colorFromTheta((angle + 1/3) * Math.PI * 2);
		this.addEquation(r, g, b, ir, ig, ib, angle, '', `equation${this.nextId++}`);
	}
}