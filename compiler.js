class Compiler {
	constructor() {
		
	}
	
	compile(/** @type {String} */equa, /** @type {String} */source) {
		// Replaces newlines with spaces, enable later if newlines cause errors
		//equa.replaceAll(/(\r\n)|\n/g, ' ');
		equa = this.floatifyInts(equa);
		let method;
		if(equa.indexOf('=') == -1) {
			//return this.compile(`y=${equa}`, source);
			method = 'valuePlotMethod';
		} else {
			let ind = equa.indexOf('=');
			let side1 = equa.substring(0, ind);
			let side2 = equa.substring(ind + 1);
			equa = `(${side1}) - (${side2})`;
			method = 'gridSampleMethod';
		}
		source = source.replace('FUNCTION', equa);
		source = source.replace('METHOD', method);
		return [source, method];
	}
	
	floatifyInts(/** @type {String} */equa) {
		return equa.replaceAll(/(?<!\w)[\d\.]+/g, (num) => {
			if(num.match(/\d/) && !num.match(/[a-zA-Z]/) && num.indexOf('.') == -1){
				return `${num}.0`;
			}
			return num;
		});
	}
}