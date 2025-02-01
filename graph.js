function toColor(gray) {
	return `rgb(${gray}, ${gray}, ${gray})`;
}

function clamp(n, min, max) {
	return Math.min(Math.max(n, min), max);
}

const MOUSE_LEFT = 0
const MOUSE_MIDDLE = 1

const DRAG_PAN = 1
const DRAG_SCALE = 2

class Display {
	constructor() {
		this.hasResized = false;
		/** @type {HTMLCanvasElement} */
		this.canvas = document.getElementById('display');
		/** @type {CanvasRenderingContext2D} */
		this.ctx = this.canvas.getContext('2d');
		this.width = this.canvas.clientWidth;
		this.height = this.canvas.clientHeight;
		let observer = new ResizeObserver((entries) => this.updateCanvasSize(entries[0]));
		observer.observe(this.canvas);
		this.camera = new Camera(this);
		this.formatter = new Intl.NumberFormat(undefined, {
			notation: 'scientific'
		});
	}
	
	numDisplay(n /** @type {Number} */) {
		let a = Math.abs(n);
		if(a >= 1e5 || a <= 1e-5) {
			return this.formatter.format(n).replace('E', 'e');
		}
		return Math.round(n * 100000) / 100000;
	}
	
	resetCamera() {
		this.camera.reset(false);
		this.camera.updateResized(this.height, this.width, false);
	}
	
	updateCanvasSize(entry) {
		let oldWidth = this.width;
		this.width = entry.devicePixelContentBoxSize[0].inlineSize;
		this.height = entry.devicePixelContentBoxSize[0].blockSize;
		if(this.hasResized) {
			this.camera.updateResized(oldWidth, this.width);
		} else {
			// Handle initial resizing by assuming the aspect ratio was 1:1 before
			this.camera.updateResized(this.height, this.width);
		}
		this.hasResized = true;
	}
	
	render(dt) {
		if(this.canvas.width != this.width || this.canvas.height != this.height) {;
			this.canvas.width = this.width;
			this.canvas.height = this.height;
		}
		this.camera.updateSmoothZoom(dt);
		this.ctx.clearRect(0, 0, this.width, this.height);
		this.drawGraphBackground();
	}
	
	drawGraphBackground() {
		const shades = [12, 24, 48, 96, 192];
		this.ctx.translate(0.5, 0.5);
		// max 5
		const GRID_COUNT = 3;
		for(let i = shades.length - GRID_COUNT; i < shades.length; i++) {
			this.ctx.strokeStyle = toColor(shades[i]);
			this.ctx.lineWidth = 1;
			this.drawGrid(8 - i, i == shades.length - 1);
		}
		this.ctx.strokeStyle = toColor(255);
		this.ctx.lineWidth = 4;
		this.ctx.beginPath();
		this.ctx.moveTo(this.camera.ssx(0), 0);
		this.ctx.lineTo(this.camera.ssx(0), this.height + 1);
		this.ctx.moveTo(0, this.camera.ssy(0));
		this.ctx.lineTo(this.width + 1, this.camera.ssy(0));
		this.ctx.stroke();
		this.ctx.translate(-0.5, -0.5);
	}
	
	drawGrid(granularity, shouldNumbers = false) {
		this.ctx.beginPath();
		let aspect = this.width / this.height;
		let scaleX = (this.camera.maxX - this.camera.minX) / aspect;
		let scaleY = this.camera.maxY - this.camera.minY;
		scaleX = 2 ** Math.ceil(Math.log2(scaleX) - granularity + 0.5);
		scaleY = 2 ** Math.ceil(Math.log2(scaleY) - granularity + 0.5);
		for(let i = Math.round(this.camera.minX / scaleX) * scaleX; i <= Math.round(this.camera.maxX / scaleX) * scaleX; i+= scaleX) {
			if(i + scaleX == i) break;
			this.ctx.moveTo(this.camera.ssx(i), 0);
			this.ctx.lineTo(this.camera.ssx(i), this.height + 1);
		}
		for(let i = Math.round(this.camera.minY / scaleY) * scaleY; i <= Math.round(this.camera.maxY / scaleY) * scaleY; i+= scaleY) {
			if(i + scaleY == i) break;
			this.ctx.moveTo(0, this.camera.ssy(i));
			this.ctx.lineTo(this.width + 1, this.camera.ssy(i));
		}
		this.ctx.stroke();
		if(shouldNumbers) {
			this.ctx.textBaseline = 'middle';
			this.ctx.textAlign = 'center';
			this.ctx.font = '16px arial';
			this.ctx.fillStyle = 'white';
			this.ctx.strokeStyle = 'black';
			this.ctx.lineWidth = 5;
			for(let i = Math.round(this.camera.minX / scaleX) * scaleX; i <= Math.round(this.camera.maxX / scaleX) * scaleX; i+= scaleX) {
				if(i == 0) continue;
				if(i + scaleX == i) break;
				let x = this.camera.ssx(i);
				let y = clamp(this.camera.ssy(0) + 12, 12, this.height - 9);
				let disp = this.numDisplay(i);
				this.ctx.strokeText(disp, x, y);
				this.ctx.fillText(disp, x, y);
			}
			this.ctx.textAlign = 'right';
			for(let i = Math.round(this.camera.minY / scaleY) * scaleY; i <= Math.round(this.camera.maxY / scaleY) * scaleY; i+= scaleY) {
				if(i == 0) continue;
				if(i + scaleY == i) break;
				let disp = this.numDisplay(i);
				let x = clamp(this.camera.ssx(0) - 4, 4 + this.ctx.measureText(disp).width, this.width - 4);
				let y = this.camera.ssy(i);
				this.ctx.strokeText(disp, x, y);
				this.ctx.fillText(disp, x, y);
			}
			this.ctx.lineWidth = 1;
		}
	}
}

class Camera {
	constructor(display) {
		this.display = display;
		this.reset();
		this.dragState = false;
		this.oldMX = 0;
		this.oldMY = 0;
		this.display.canvas.addEventListener('pointerdown', this.handleDown.bind(this));
		window.addEventListener('pointerup', this.handleUp.bind(this));
		window.addEventListener('pointermove', this.handleDrag.bind(this));
		this.display.canvas.addEventListener('wheel', this.handleWheel.bind(this));
		this.scaleCenterX = 0;
		this.scaleCenterY = 0;
		this.updateOldBounds();
	}
	
	updateOldBounds() {
		this.oldMinX = this.minX;
		this.oldMinY = this.minY;
		this.oldMaxX = this.maxX;
		this.oldMaxY = this.maxY;
	}
	
	hasChanged() {
		return this.minX != this.oldMinX || this.minY != this.oldMinY || this.maxX != this.oldMaxX || this.maxY != this.oldMaxY;
	}
	
	reset(isInstant = true) {
		this.tarMinX = -10;
		this.tarMinY = -10;
		this.tarMaxX = 10;
		this.tarMaxY = 10;
		if(isInstant) {
			this.minX = this.tarMinX;
			this.minY = this.tarMinY;
			this.maxX = this.tarMaxX;
			this.maxY = this.tarMaxY;
		}
	}
	
	closenessToTarg(min, max, tmin, tmax) {
		let scale = max - min;
		return Math.max(Math.abs(tmin - min) / scale, Math.abs(tmax - max) / scale);
	}
	
	updateSmoothZoom(dt) {
		let w1 = 0.1 ** (dt * 10);
		let w2 = 1 - w1;
		if(Math.max(this.closenessToTarg(this.minX, this.maxX, this.tarMinX, this.tarMaxX), this.closenessToTarg(this.minY, this.maxY, this.tarMinY, this.tarMaxY)) < 0.001) {
			w1 = 0;
			w2 = 1;
		};
		this.minX = this.minX * w1 + this.tarMinX * w2;
		this.minY = this.minY * w1 + this.tarMinY * w2;
		this.maxX = this.maxX * w1 + this.tarMaxX * w2;
		this.maxY = this.maxY * w1 + this.tarMaxY * w2;
	}
	
	fixAspectRatio() {
		let aspect = this.display.width / this.display.height;
		let curAspect = (this.tarMaxX - this.tarMinX) / (this.tarMaxY - this.tarMinY);
		if(curAspect < aspect) {
			this.zoomCentered(aspect / curAspect, 1);
		} else {
			this.zoomCentered(1, curAspect / aspect);
		}
	}
	
	handleUp() {
		this.dragState = false;
	}
	
	handleDown(event) {
		this.oldMX = event.x;
		this.oldMY = event.y;
		if(event.button == MOUSE_MIDDLE) {
			this.dragState = DRAG_SCALE;
			this.scaleCenterX = event.x;
			this.scaleCenterY = event.y;
		} else if(event.button == MOUSE_LEFT) {
			this.dragState = DRAG_PAN;
		}
	}
	
	handleDrag(event) {
		if(this.dragState) {
			let dx = (this.oldMX - event.x) * window.devicePixelRatio / this.display.width;
			let dy = -((this.oldMY - event.y) * window.devicePixelRatio / this.display.height);
			let sx = this.tarMaxX - this.tarMinX;
			let sy = this.tarMaxY - this.tarMinY;
			switch(this.dragState) {
				case DRAG_PAN:
					let ax = dx * sx;
					let ay = dy * sy;
					this.tarMinX += ax;
					this.tarMaxX += ax;
					this.tarMinY += ay;
					this.tarMaxY += ay;
					this.minX += ax;
					this.maxX += ax;
					this.minY += ay;
					this.maxY += ay;
					break;
				case DRAG_SCALE:
					if(Math.abs(event.x - this.scaleCenterX) < Math.abs(event.y - this.scaleCenterY)) {
						dx = 0;
					} else {
						dy = 0;
					}
					this.zoom(this.scaleCenterX, this.scaleCenterY, 256 ** dx, 256 ** dy);
					this.minX = this.tarMinX;
					this.minY = this.tarMinY;
					this.maxX = this.tarMaxX;
					this.maxY = this.tarMaxY;
					break;
			}
			this.oldMX = event.x;
			this.oldMY = event.y;
		}
	}
	
	zoomCentered(zx, zy) {
		let mx = (this.tarMinX + this.tarMaxX) / 2;
		let my = (this.tarMinY + this.tarMaxY) / 2;
		this.tarMinX = (this.tarMinX - mx) * zx + mx;
		this.tarMaxX = (this.tarMaxX - mx) * zx + mx;
		this.tarMinY = (this.tarMinY - my) * zy + my;
		this.tarMaxY = (this.tarMaxY - my) * zy + my;
	}
	
	zoom(cx, cy, zx, zy) {
		let mx = (cx - this.display.canvas.offsetLeft) * window.devicePixelRatio / this.display.width;
		let my = 1 - (cy - this.display.canvas.offsetTop) * window.devicePixelRatio / this.display.height;
		mx = mx * (this.tarMaxX - this.tarMinX) + this.tarMinX;
		my = my * (this.tarMaxY - this.tarMinY) + this.tarMinY;
		this.tarMinX = (this.tarMinX - mx) * zx + mx;
		this.tarMaxX = (this.tarMaxX - mx) * zx + mx;
		this.tarMinY = (this.tarMinY - my) * zy + my;
		this.tarMaxY = (this.tarMaxY - my) * zy + my;
	}
	
	handleWheel(event) {
		let ratio = 1.3 ** (event.deltaY / 100);
		this.zoom(event.x, event.y, ratio, ratio);
	}
	
	updateResized(oldWidth, width, isInstant = true) {
		let ratio = oldWidth / width;
		let mid = (this.tarMaxX + this.tarMinX) / 2;
		this.tarMinX = (this.tarMinX - mid) / ratio + mid;
		this.tarMaxX = (this.tarMaxX - mid) / ratio + mid;
		if(isInstant) {
			this.minX = this.tarMinX;
			this.maxX = this.tarMaxX;
		}
	}
	
	ssRemap(dim, min, max, p) {
		return (p - min) / (max - min) * dim;
	}
	
	ssx(x) {
		return Math.round(this.ssRemap(this.display.width, this.minX, this.maxX, x));
	}
	
	ssy(y) {
		return this.display.height - Math.round(this.ssRemap(this.display.height, this.minY, this.maxY, y));
	}
}