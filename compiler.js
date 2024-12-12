class Compiler {
	constructor() {
		
	}
	
	compile(/** @type {String} */equa) {
		if(equa.indexOf('=') == -1) {
			return this.compile(`y=${equa}`);
		}
		equa = this.floatifyInts(equa);
		let ind = equa.indexOf('=');
		let side1 = equa.substring(0, ind);
		let side2 = equa.substring(ind + 1);
		return `(${side1}) - (${side2})`;
	}
	
	floatifyInts(/** @type {String} */equa) {
		return equa.replaceAll(/(?<![a-zA-Z]|\.)\d+(?!\.)/g, (m) => `${m}.0`);
	}
}