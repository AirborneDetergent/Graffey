class Renderer {
	constructor(display, equaTable) {
		/** @type {Display} */
		this.display = display;
		/** @type {EquationTable} */
		this.equaTable = equaTable;
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
		
		this.compiler = new Compiler();
	}
	
	makeShaderProgram(id, equaContent) {
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
			console.error('Vertex Shader Compilation Error:', errorLog);
			return null;
		}
		
		let fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		let source = document.getElementById('plot-shader').textContent;
		source = source.replace('FUNCTION', this.compiler.compile(equaContent));
		this.gl.shaderSource(fragShader, source);
		this.gl.compileShader(fragShader);
		
		if (!this.gl.getShaderParameter(fragShader, this.gl.COMPILE_STATUS)) {
			const errorLog = this.gl.getShaderInfoLog(fragShader);
			console.error('Fragment Shader Compilation Error:', errorLog);
			return null;
		}
		
		let program = this.gl.createProgram();

		this.gl.attachShader(program, vertShader);
		this.gl.attachShader(program, fragShader);
		this.gl.linkProgram(program);
		
		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			console.log('Program Creation Error:', this.gl.getProgramInfoLog(program));
			return null;
		}
		
		let pos = this.gl.getAttribLocation(program, 'position');
		this.gl.vertexAttribPointer(pos, 2, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(pos);
		
		return program;
	}
	
	render() {
		this.glCanvas.width = this.display.width;
		this.glCanvas.height = this.display.height;
		this.glCanvas.style.width = this.display.canvas.offsetWidth + 'px';
		this.glCanvas.style.height = this.display.canvas.offsetHeight + 'px';
		this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
		this.gl.clearColor(0, 0, 0, 0);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		for(let id in this.equaTable.equations) {
			let equa = this.equaTable.equations[id];
			if(equa.isModified) {
				equa.isModified = false;
				let wasNull = equa.program === null;
				equa.program = this.makeShaderProgram(id, this.equaTable.equations[id].content);
				console.log(id);
				let button = document.getElementById(id).querySelector('#equation-button');
				let space = button.className.indexOf(' ');
				if(equa.program === null && !wasNull) {
					equa.icon = button.className.substring(0, space);
					button.className = button.className.replace(equa.icon, 'bi-exclamation-diamond')
				} else if(wasNull) {
					button.className = button.className.replace('bi-exclamation-diamond', equa.icon);
				}
			}
			if(equa.program !== null && !equa.isHidden) {
				this.gl.useProgram(equa.program);
				let uBounds = this.gl.getUniformLocation(equa.program, '_bounds');
				let uResolution = this.gl.getUniformLocation(equa.program, '_resolution');
				let uColor = this.gl.getUniformLocation(equa.program, '_color');
				this.gl.uniform4f(uBounds, this.display.camera.minX, this.display.camera.minY, this.display.camera.maxX, this.display.camera.maxY);
				this.gl.uniform2f(uResolution, this.display.width, this.display.height);
				this.gl.uniform3f(uColor, equa.r / 255, equa.g / 255, equa.b / 255);
				this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
			}
		}
	}
}