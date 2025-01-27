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
		/** @type {WebGL2RenderingContext} */
		this.gl = this.glCanvas.getContext('webgl2', {
			antialias: false,
		});
		
		this.gl.enable(this.gl.BLEND);
		
		let vertBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), this.gl.STATIC_DRAW);
		
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertBuffer);
		
		let vertSource = `#version 300 es
			in vec2 position;
			
			void main() {
				gl_Position = vec4(position, 0, 1);
			}
		`;
		this.showProgram = this.compileProgram(vertSource, document.querySelector('#show-shader').textContent);
		this.accumProgram = this.compileProgram(vertSource, document.querySelector('#accum-shader').textContent);
		
		this.targBuffer = this.gl.createFramebuffer();
		this.accumBuffer = this.gl.createFramebuffer();
		
		this.startTime = new Date().getTime() / 1000;
		this.drawIsolines = true;
		this.accumFrames = 0;
		this.randomizeSeed();
		
		this.fixSize(true);
	}
	
	compileProgram(vertSource, fragSource) {
		let vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
		this.gl.shaderSource(vertShader, vertSource);
		this.gl.compileShader(vertShader);
		if (!this.gl.getShaderParameter(vertShader, this.gl.COMPILE_STATUS)) {
			const errorLog = this.gl.getShaderInfoLog(fragShader);
			console.error('Vertex Shader:', errorLog);
			return null;
		}
		let fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		this.gl.shaderSource(fragShader, fragSource);
		this.gl.compileShader(fragShader);
		
		if (!this.gl.getShaderParameter(fragShader, this.gl.COMPILE_STATUS)) {
			const errorLog = this.gl.getShaderInfoLog(fragShader);
			console.error('Fragment Shader:', errorLog);
			return null;
		}
		
		let program = this.gl.createProgram();

		this.gl.attachShader(program, vertShader);
		this.gl.attachShader(program, fragShader);
		this.gl.linkProgram(program);
		
		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			console.log('Program Creation:', this.gl.getProgramInfoLog(program));
			return null;
		}
		
		let pos = this.gl.getAttribLocation(program, 'position');
		this.gl.vertexAttribPointer(pos, 2, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(pos);
		
		return program;
	}
	
	randomizeSeed() {
		this.randomSeed = Math.floor(Math.random() * 4294967296);
		this.accumFrames = 0;
	}
	
	makeShaderProgram(equaContent) {
		let vertSource = `#version 300 es
			in vec2 position;
			
			void main() {
				gl_Position = vec4(position, 0, 1);
			}
		`;
		let source = document.querySelector('#plot-shader').textContent;
		let method;
		[source, method] = this.compiler.compile(equaContent, source);
		
		let program = this.compileProgram(vertSource, source);
		if(program === null) return [null, null];
		
		return [program, method];
	}
	
	genBufferTexture(framebuffer, intform, format, type) {
		let tex = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, intform, this.display.width, this.display.height, 0, format, type, null);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, tex, 0);
		return tex;
	}
	
	fixSize(force = false) {
		if(!force && this.glCanvas.width == this.display.width && this.glCanvas.height == this.display.height) 
			return;
		this.glCanvas.width = this.display.width;
		this.glCanvas.height = this.display.height;
		this.glCanvas.style.width = this.display.canvas.offsetWidth + 'px';
		this.glCanvas.style.height = this.display.canvas.offsetHeight + 'px';
		this.targTex = this.genBufferTexture(this.targBuffer, this.gl.RGBA8, this.gl.RGBA, this.gl.UNSIGNED_BYTE);
		this.accumTex = this.genBufferTexture(this.accumBuffer, this.gl.RGBA16UI, this.gl.RGBA_INTEGER, this.gl.UNSIGNED_SHORT);
		this.accumTexSwap = this.genBufferTexture(this.accumBuffer, this.gl.RGBA16UI, this.gl.RGBA_INTEGER, this.gl.UNSIGNED_SHORT);
	}
	
	renderFrame() {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.targBuffer);
		this.gl.blendFuncSeparate(this.gl.ONE, this.gl.ONE, this.gl.ONE, this.gl.ONE);
		this.gl.blendEquationSeparate(this.gl.FUNC_ADD, this.gl.MAX);
		this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
		this.gl.clearColor(0, 0, 0, 0);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		if(this.compiler.forceRecompile) {
			this.compiler.compileFunctions(this.equaTable);
			this.accumFrames = 0;
		}
		let renderAfter = [];
		for(let id in this.equaTable.equations) {
			let equa = this.equaTable.equations[id];
			if(equa.isFunction) continue;
			if(equa.isModified || this.compiler.forceRecompile) {
				equa.isModified = false;
				this.accumFrames = 0;
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
		this.gl.blendEquation(this.gl.FUNC_ADD);
	}
	
	accumulateFrame() {
		this.gl.blendFunc(this.gl.ONE, this.gl.ZERO);
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.accumBuffer);
		this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
		this.gl.useProgram(this.accumProgram);
		
		let tmp = this.accumTexSwap;
		this.accumTexSwap = this.accumTex;
		this.accumTex = tmp;
		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.accumTex, 0);
		
		let uResolution = this.gl.getUniformLocation(this.accumProgram, 'resolution');
		this.gl.uniform2f(uResolution, this.display.width, this.display.height);
		
		let uAccum = this.gl.getUniformLocation(this.accumProgram, 'accum');
		this.gl.activeTexture(this.gl.TEXTURE0);	
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.accumTexSwap);
		this.gl.uniform1i(uAccum, 0);
		
		let uFrame = this.gl.getUniformLocation(this.accumProgram, 'frame');
		this.gl.activeTexture(this.gl.TEXTURE1);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.targTex);
		this.gl.uniform1i(uFrame, 1);
		
		let uOpacity = this.gl.getUniformLocation(this.accumProgram, 'opacity');
		let opacity = 1 / (this.accumFrames + 1);
		this.gl.uniform1f(uOpacity, opacity);
		
		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
		this.accumFrames++;
	}
	
	showAccumulatedGraph() {
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
		this.gl.useProgram(this.showProgram);
		
		let uResolution = this.gl.getUniformLocation(this.showProgram, 'resolution');
		this.gl.uniform2f(uResolution, this.display.width, this.display.height);
		
		let uImage = this.gl.getUniformLocation(this.showProgram, 'image');
		this.gl.activeTexture(this.gl.TEXTURE0);	
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.accumTex);
		this.gl.uniform1i(uImage, 0);
		
		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
	}
	
	render(dt) {
		if(this.display.camera.hasChanged()) {
			this.accumFrames = 0;
		}
		this.fixSize();
		this.renderFrame();
		this.accumulateFrame();
		this.showAccumulatedGraph();
		this.display.camera.updateOldBounds();
	}
	
	renderEquation(equa) {
		this.gl.useProgram(equa.program);
		let uBounds = this.gl.getUniformLocation(equa.program, '_bounds');
		this.gl.uniform4f(uBounds, this.display.camera.minX, this.display.camera.minY, this.display.camera.maxX, this.display.camera.maxY);
		let uResolution = this.gl.getUniformLocation(equa.program, '_resolution');
		this.gl.uniform2f(uResolution, this.display.width, this.display.height);
		let uColor = this.gl.getUniformLocation(equa.program, '_color');
		this.gl.uniform3f(uColor, Math.pow(equa.r / 255, 2.2), Math.pow(equa.g / 255, 2.2), Math.pow(equa.b / 255, 2.2));
		let uInvColor = this.gl.getUniformLocation(equa.program, '_invColor');
		this.gl.uniform3f(uInvColor, Math.pow(equa.ir / 255, 2.2), Math.pow(equa.ig / 255, 2.2), Math.pow(equa.ib / 255, 2.2));
		let uSeed = this.gl.getUniformLocation(equa.program, '_seed');
		this.gl.uniform1ui(uSeed, this.randomSeed);
		let uDrawIsolines = this.gl.getUniformLocation(equa.program, '_drawIsolines');
		this.gl.uniform1ui(uDrawIsolines, this.drawIsolines);
		let uCurTime = this.gl.getUniformLocation(equa.program, '_curTime');
		this.gl.uniform1f(uCurTime, new Date().getTime() / 1000 - this.startTime);
		let uUseJitter = this.gl.getUniformLocation(equa.program, '_useJitter');
		this.gl.uniform1ui(uUseJitter, this.accumFrames > 0);
		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
	}
}