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
		this.compiler.gl = this.gl;
		
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
		this.showProgram = this.compiler.compileProgram(vertSource, document.querySelector('#show-shader').textContent);
		this.accumProgram = this.compiler.compileProgram(vertSource, document.querySelector('#accum-shader').textContent);
		
		this.targBuffer = this.gl.createFramebuffer();
		this.accumBuffer = this.gl.createFramebuffer();
		
		this.startTime = new Date().getTime() / 1000;
		this.drawIsolines = true;
		this.accumFrames = 0;
		this.randomizeSeed();
		this.wipeAccum = false;
		
		this.fixSize(true);
	}
	
	resetAccumulation() {
		this.accumFrames = 0;
		this.wipeAccum = true;
	}
	
	randomizeSeed() {
		this.randomSeed = Math.floor(Math.random() * 4294967296);
		this.resetAccumulation();
	}
	
	makeShaderProgram(equaContent) {
		let vertSource = `#version 300 es
			in vec2 position;
			
			void main() {
				gl_Position = vec4(position, 0, 1);
			}
		`;
		let source = document.querySelector('#color-map-shader').textContent;
		let method;
		[source, method] = this.compiler.compile(equaContent, source);
		
		let program = this.compiler.compileProgram(vertSource, source);
		
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
		this.accumTex = this.genBufferTexture(this.accumBuffer, this.gl.RGBA32UI, this.gl.RGBA_INTEGER, this.gl.UNSIGNED_INT);
		this.accumTexSwap = this.genBufferTexture(this.accumBuffer, this.gl.RGBA32UI, this.gl.RGBA_INTEGER, this.gl.UNSIGNED_INT);
	}
	
	updateCompiledShaders() {
		if(this.compiler.forceRecompile) {
			this.compiler.compileFunctions(this.equaTable);
			this.resetAccumulation();
		}
		for(let id in this.equaTable.equations) {
			let equa = this.equaTable.equations[id];
			if(equa.isFunction) continue;
			if(equa.isModified || this.compiler.forceRecompile) {
				equa.isModified = false;
				this.resetAccumulation();
				[equa.program, equa.method] = this.makeShaderProgram(this.equaTable.equations[id].content);
				if(typeof equa.program == 'string') {
					equaTable.changeIcon(id, 'bi-exclamation-diamond', equa.program);
				} else {
					equaTable.resetIcon(id);
				}
			}
		}
		this.compiler.forceRecompile = false;
	}
	
	renderFrame() {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.targBuffer);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
		this.gl.blendEquation(this.gl.FUNC_ADD);
		this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
		this.gl.clearColor(0, 0, 0, 0);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		
		let renderAfter = [];
		for(let id in this.equaTable.equations) {
			let equa = this.equaTable.equations[id];
			if(equa.isFunction) continue;
			if(typeof equa.program != 'string' && !equa.isHidden) {
				if(equa.method == 'colorMapMethod') {
					this.renderEquation(equa);
				} else {
					renderAfter.push(equa);
				}
			}
		}
		for(let equa of renderAfter) {
			this.renderEquation(equa);
		}
	}
	
	accumulateFrame() {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.accumBuffer);
		this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
		this.gl.useProgram(this.accumProgram);
		
		if(this.wipeAccum) {
			this.gl.clearBufferuiv(this.gl.COLOR, 0, new Uint32Array([0, 0, 0, 0]));
			this.wipeAccum = false;
		}
		
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
		let uSamples = this.gl.getUniformLocation(this.showProgram, 'samples');
		this.gl.uniform1f(uSamples, this.accumFrames);
		
		let uImage = this.gl.getUniformLocation(this.showProgram, 'image');
		this.gl.activeTexture(this.gl.TEXTURE0);	
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.accumTex);
		this.gl.uniform1i(uImage, 0);
		
		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
	}
	
	render(dt) {
		if(this.display.camera.hasChanged()) {
			this.resetAccumulation();
		}
		this.updateCompiledShaders();
		if(this.accumFrames < 1024) {
			this.fixSize();
			this.renderFrame();
			this.accumulateFrame();
			this.showAccumulatedGraph();
			this.display.camera.updateOldBounds();
		}
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