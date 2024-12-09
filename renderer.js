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
			antialias: false
		});
		console.log(this.gl);
		let vertBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-0.9, -0.9, 0.9, -0.9, 0.9, 0.9]), this.gl.STATIC_DRAW);
		
		let program = this.makeShaderProgram();
		this.gl.useProgram(program);
		
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertBuffer);
		
		let pos = this.gl.getAttribLocation(program, 'position');
		this.gl.vertexAttribPointer(pos, 2, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(pos);
	}
	
	makeShaderProgram() {
		let vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
		this.gl.shaderSource(vertShader, `
			#pragma vscode_glsllint_stage: VERTEX
			attribute vec2 position;
			
			void main() {
				gl_Position = vec4(position, 0, 1);
			}
		`);
		this.gl.compileShader(vertShader);
		
		let fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		this.gl.shaderSource(fragShader, `
			#pragma vscode_glsllint_stage: FRAGMENT
			
			void main() {
				gl_FragColor = vec4(0.5, 0.2, 0.8, 1);
			}
		`);
		this.gl.compileShader(fragShader);
		
		let program = this.gl.createProgram();
		this.gl.attachShader(program, vertShader);
		this.gl.attachShader(program, fragShader);
		this.gl.linkProgram(program);
		return program;
	}
	
	render() {
		this.glCanvas.width = this.display.width;
		this.glCanvas.height = this.display.height;
		this.glCanvas.style.width = this.display.canvas.offsetWidth + 'px';
		this.glCanvas.style.height = this.display.canvas.offsetHeight + 'px';
		this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
		for(let id in this.equaTable.equations) {
			this.equaTable.equations[id].isModified = false;
		}
		this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
	}
}