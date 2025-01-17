class Renderer {
	constructor(display, equaTable, compiler) {
		/** @type {Display} */
		this.display = display;
		/** @type {EquationTable} */
		this.equaTable = equaTable;
		/** @type {Compiler} */
		this.compiler = compiler;
		/** @type {HTMLCanvasElement} */
		this.glCanvas = document.getElementById('gl-canvas');
		/** @type {WebGLRenderingContext} */
		this.gl = this.glCanvas.getContext('webgl2', {
			antialias: false,
		});
		
		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
		
		let vertBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), this.gl.STATIC_DRAW);
		
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertBuffer);
	}
	
	makeShaderProgram(equaContent) {
		let vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
		this.gl.shaderSource(vertShader, `#version 300 es
			in vec2 position;
			
			void main() {
				gl_Position = vec4(position, 0, 1);
			}
		`);
		this.gl.compileShader(vertShader);
		if (!this.gl.getShaderParameter(vertShader, this.gl.COMPILE_STATUS)) {
			const errorLog = this.gl.getShaderInfoLog(fragShader);
			console.error('Vertex Shader:', errorLog);
			return [null, null];
		}
		
		let fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		let source = document.getElementById('plot-shader').textContent;
		let method;
		[source, method] = this.compiler.compile(equaContent, source);
		this.gl.shaderSource(fragShader, source);
		this.gl.compileShader(fragShader);
		
		if (!this.gl.getShaderParameter(fragShader, this.gl.COMPILE_STATUS)) {
			const errorLog = this.gl.getShaderInfoLog(fragShader);
			console.error('Fragment Shader:', errorLog);
			return [null, null];
		}
		
		let program = this.gl.createProgram();

		this.gl.attachShader(program, vertShader);
		this.gl.attachShader(program, fragShader);
		this.gl.linkProgram(program);
		
		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			console.log('Program Creation:', this.gl.getProgramInfoLog(program));
			return [null, null];
		}
		
		let pos = this.gl.getAttribLocation(program, 'position');
		this.gl.vertexAttribPointer(pos, 2, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(pos);
		
		return [program, method];
	}
	
	render(dt) {
		this.glCanvas.width = this.display.width;
		this.glCanvas.height = this.display.height;
		this.glCanvas.style.width = this.display.canvas.offsetWidth + 'px';
		this.glCanvas.style.height = this.display.canvas.offsetHeight + 'px';
		this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
		this.gl.clearColor(0, 0, 0, 0);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		if(this.compiler.forceRecompile) {
			this.compiler.compileFunctions(this.equaTable);
		}
		let renderAfter = [];
		for(let id in this.equaTable.equations) {
			let equa = this.equaTable.equations[id];
			if(equa.isFunction) continue;
			if(equa.isModified || this.compiler.forceRecompile) {
				equa.isModified = false;
				[equa.program, equa.method] = this.makeShaderProgram(this.equaTable.equations[id].content);
				if(equa.program === null) {
					equaTable.changeIcon(id, 'bi-exclamation-diamond');
				} else {
					equaTable.resetIcon(id);
				}
			}
			if(equa.program !== null && !equa.isHidden) {
				if(equa.method == 'valuePlotMethod') {
					this.renderEquation(equa);
				} else {
					renderAfter.push(equa);
				}
			}
		}
		for(let equa of renderAfter) {
			this.renderEquation(equa);
		}
		this.compiler.forceRecompile = false;
	}
	
	renderEquation(equa) {
		this.gl.useProgram(equa.program);
		let uBounds = this.gl.getUniformLocation(equa.program, '_bounds');
		this.gl.uniform4f(uBounds, this.display.camera.minX, this.display.camera.minY, this.display.camera.maxX, this.display.camera.maxY);
		let uResolution = this.gl.getUniformLocation(equa.program, '_resolution');
		this.gl.uniform2f(uResolution, this.display.width, this.display.height);
		let uColor = this.gl.getUniformLocation(equa.program, '_color');
		this.gl.uniform3f(uColor, equa.r / 255, equa.g / 255, equa.b / 255);
		let uInvColor = this.gl.getUniformLocation(equa.program, '_invColor');
		this.gl.uniform3f(uInvColor, equa.ir / 255, equa.ig / 255, equa.ib / 255);
		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
	}
}