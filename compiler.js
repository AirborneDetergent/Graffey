class Compiler {
	constructor() {
		
	}
	
	compile(/** @type {String} */equa) {
		if(equa.indexOf('=') == -1) {
			return this.compile(`y=${equa}`);
		}
		// Replaces newlines with spaces, enable later if newlines cause errors
		//equa.replaceAll(/(\r\n)|\n/g, ' ');
		equa = this.floatifyInts(equa);
		let ind = equa.indexOf('=');
		let side1 = equa.substring(0, ind);
		let side2 = equa.substring(ind + 1);
		return `(${side1}) - (${side2})`;
	}
	
	floatifyInts(/** @type {String} */equa) {
		return equa.replaceAll(/[\d\.]+/g, (num) => {
			if(num.match(/\d/) && !num.match(/[a-zA-Z]/) && num.indexOf('.') == -1){
				return `${num}.0`;
			}
			return num;
		});
	}
}