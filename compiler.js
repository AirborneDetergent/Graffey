class Compiler {
	constructor() {
		this.funcsSource = '';
		this.forceRecompile = false;
		/** @type {WebGL2RenderingContext} */
		this.gl = null;
	}
	
	compileProgram(vertSource, fragSource) {
		let vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
		this.gl.shaderSource(vertShader, vertSource);
		this.gl.compileShader(vertShader);
		if (!this.gl.getShaderParameter(vertShader, this.gl.COMPILE_STATUS)) {
			let errorLog = this.gl.getShaderInfoLog(fragShader);
			console.error('Vertex Shader:', errorLog);
			return errorLog;
		}
		let fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		this.gl.shaderSource(fragShader, fragSource);
		this.gl.compileShader(fragShader);
		
		if (!this.gl.getShaderParameter(fragShader, this.gl.COMPILE_STATUS)) {
			let errorLog = this.gl.getShaderInfoLog(fragShader);
			console.error('Fragment Shader:', errorLog);
			return errorLog;
		}
		
		let program = this.gl.createProgram();

		this.gl.attachShader(program, vertShader);
		this.gl.attachShader(program, fragShader);
		this.gl.linkProgram(program);
		
		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			let errorLog = this.gl.getProgramInfoLog(program);
			console.error('Program Creation:', errorLog);
			return errorLog;
		}
		
		let pos = this.gl.getAttribLocation(program, 'position');
		this.gl.vertexAttribPointer(pos, 2, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(pos);
		
		return program;
	}
	
	compileFunctions(equaTable) {
		this.funcsSource = '';
		let declas = '';
		let defs = '';
		for(let id in equaTable.equations) {
			let equa = equaTable.equations[id];
			if(equa.isFunction) {
				let func = equa.content;
				let ind = func.indexOf('=>');
				let decla = 'float ' + func.substring(0, ind).replaceAll(' ', '');
				if(decla.indexOf(',') != -1 || decla.indexOf('()') == -1) {
					decla = decla.replace('(', '(float ');
					decla = decla.replaceAll(',', ', float ');
				}
				declas += `${decla};\n`;
				let body = func.substring(ind + 2);
				if(body.indexOf(';') == -1) {
					body = this.floatifyInts(body);
					defs += `${decla} {\n\treturn ${body};\n}\n\n`;
				} else {
					defs += `${decla} {${body}\n}\n\n`;
				}
			}
		}
		this.funcsSource = `${declas}\n\n${defs}`;
	}
	
	compile(/** @type {String} */equa, /** @type {String} */source) {
		// Replaces newlines with spaces, enable later if newlines cause errors
		//equa.replaceAll(/(\r\n)|\n/g, ' ');
		equa = this.floatifyInts(equa);
		let method;
		let ind = equa.match(/(?<!=)=(?!=)/)?.index;
		if(ind == undefined) {
			method = 'colorMapMethod';
		} else {
			let side1 = equa.substring(0, ind);
			let side2 = equa.substring(ind + 1);
			equa = `(${side1}) - (${side2})`;
			method = 'gridSampleMethod';
		}
		source = source.replace('(FUNCTION)', equa);
		source = source.replace('(METHOD)', method);
		source = source.replace('(SHARED_FUNCS)', this.funcsSource);
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