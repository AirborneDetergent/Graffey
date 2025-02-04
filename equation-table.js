class EquationTable {
	constructor(compiler) {
		this.table = document.getElementById('equation-table').children[0];
		this.nextId = 0;
		this.equations = {};
		this.compiler = compiler;
		/** @type {Renderer} */
		this.renderer = null;
		this.lastModified = 0;
		/** @type {ConfigModal} */
		this.configModal = null;
	}
	
	newEquation(r, g, b) {
		let equa = document.getElementById('equation').content.cloneNode(true);
		let button = equa.getElementById('equation-button');
		button.style = `color: rgb(${r}, ${g}, ${b});`;
		return equa;
	}
	
	randomColor() {
		let minAngle = 0.175;
		let maxAngle = 0.95;
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
			let angInd = Math.round((minAngle * dists.length + maxAngle * dists.length) / 2);
			for(let i = Math.floor(dists.length * minAngle); i < Math.ceil(dists.length * maxAngle); i++) {
				if(dists[i] > dists[angInd]) angInd = i;
			}
			console.log(angInd);
			angle = angInd / dists.length;
		} else {
			angle = Math.random() * (maxAngle - minAngle) + minAngle;
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
	
	changeIcon(id, newIcon, newTitle = null) {
		let button = document.getElementById(id).querySelector('#equation-button');
		let space = button.className.indexOf(' ');
		let prevIcon = button.className.substring(0, space);
		button.className = button.className.replace(prevIcon, newIcon);
		button.title = newTitle || button.title;
	}
	
	resetIcon(id) {
		let iconMsg = 'Left Click: Toggle Rendering\nRight Click: Open Config';
		let equa = this.equations[id];
		if(equa.content == '') {
			this.changeIcon(id, 'bi-graph-up', iconMsg);
		} else {
			if(equa.isFunction) {
				this.changeIcon(id, 'bi-braces-asterisk', iconMsg);
			} else if(equa.method == 'gridSampleMethod') {
				this.changeIcon(id, 'bi-graph-up', iconMsg);
			} else if(equa.method == 'colorMapMethod') {
				this.changeIcon(id, 'bi-grid-3x3', iconMsg);
			}
		}
	}
	
	addEquation(r, g, b, ir, ig, ib, angle, secAngle, contentString, id, focus=false) {
		let equa = this.newEquation(r, g, b);
		this.table.appendChild(equa);
		equa = this.table.lastElementChild;
		equa.id = id;
		let delButton = equa.querySelector('#equation-delete');
		delButton.onclick = () => {
			if(this.equations[equa.id].isFunction) {
				this.compiler.forceRecompile = true;
			}
			if(!this.equations[equa.id].isHidden) {
				this.renderer.resetAccumulation();
			}
			equa.remove();
			delete this.equations[equa.id];
		};
		let eqButton = equa.querySelector('#equation-button');
		eqButton.onclick = () => {
			this.equations[equa.id].isHidden = !this.equations[equa.id].isHidden;
			eqButton.classList.toggle('opacity-25', this.equations[equa.id].isHidden);
			this.renderer.resetAccumulation();
		};
		eqButton.oncontextmenu = (e) => {
			e.preventDefault();
			this.configModal.initModal(equa.id);
		}
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
			this.lastModified = Date.now();
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
		e.secAngle = secAngle;
		e.content = contentString;
		e.isModified = true;
		e.isFunction = e.content.indexOf('=>') != -1;
		this.resetIcon(id);
		if(e.isHidden) {
			eqButton.className = eqButton.className + ' opacity-25';
		}
		if(focus) {
			content.focus();
		}
	}
	
	changeColor(id, angle) {
		let [r, g, b] = this.colorFromTheta(angle * Math.PI * 2);
		this.equations[id].r = r;
		this.equations[id].g = g;
		this.equations[id].b = b;
		this.equations[id].angle = angle;
		let equa = document.getElementById(id);
		let button = equa.cells[0].firstChild;
		button.style = `color: rgb(${r}, ${g}, ${b});`;
		this.renderer.resetAccumulation();
	}
	
	changeSecondaryColor(id, angle) {
		let [r, g, b] = this.colorFromTheta(angle * Math.PI * 2);
		this.equations[id].ir = r;
		this.equations[id].ig = g;
		this.equations[id].ib = b;
		this.equations[id].secAngle = angle;
		this.renderer.resetAccumulation();
	}
	
	makeEquation(focus=false) {
		let [r, g, b, angle] = this.randomColor();
		let secAngle = (angle + 1/3) % 1;
		let [ir, ig, ib] = this.colorFromTheta(secAngle * Math.PI * 2);
		this.addEquation(r, g, b, ir, ig, ib, angle, secAngle, '', `equation${this.nextId++}`, focus);
	}
}