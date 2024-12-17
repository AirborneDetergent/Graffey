function toColor(gray) {
	return `rgb(${gray}, ${gray}, ${gray})`;
}

function numDisplay(n, s) {
	return n;
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
	}
	
	resetCamera() {
		this.camera.reset();
		this.camera.updateResized(this.height, this.width);
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
	
	render() {
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.ctx.fillStyle = toColor(0);
		this.ctx.fillRect(0, 0, this.width, this.height);
		this.drawGraphBackground();
	}
	
	drawGraphBackground() {
		const shades = [8, 16, 32, 64, 128];
		this.ctx.translate(-0.5, -0.5);
		// max 5
		const GRID_COUNT = 3;
		for(let i = shades.length - GRID_COUNT; i < shades.length; i++) {
			this.ctx.strokeStyle = toColor(shades[i]);
			this.ctx.lineWidth = 1;
			this.drawGrid(8 - i, i == shades.length - 1);
		}
		this.ctx.strokeStyle = toColor(255);
		this.ctx.lineWidth = 2;
		this.ctx.beginPath();
		this.ctx.moveTo(this.camera.ssx(0), 0);
		this.ctx.lineTo(this.camera.ssx(0), this.height + 1);
		this.ctx.moveTo(0, this.camera.ssy(0));
		this.ctx.lineTo(this.width + 1, this.camera.ssy(0));
		this.ctx.stroke();
		this.ctx.translate(0.5, 0.5);
	}
	
	drawGrid(granularity, numbers = false) {
		this.ctx.beginPath();
		let aspect = this.width / this.height;
		let scaleX = (this.camera.maxX - this.camera.minX) / aspect;
		scaleX = 2 ** Math.ceil(Math.log2(scaleX) - granularity);
		let scaleY = this.camera.maxY - this.camera.minY;
		scaleY = 2 ** Math.ceil(Math.log2(scaleY) - granularity);
		for(let i = Math.round(this.camera.minX / scaleX) * scaleX; i <= Math.round(this.camera.maxX / scaleX) * scaleX; i+= scaleX) {
			this.ctx.moveTo(this.camera.ssx(i), 0);
			this.ctx.lineTo(this.camera.ssx(i), this.height + 1);
		}
		for(let i = Math.round(this.camera.minY / scaleY) * scaleY; i <= Math.round(this.camera.maxY / scaleY) * scaleY; i+= scaleY) {
			this.ctx.moveTo(0, this.camera.ssy(i));
			this.ctx.lineTo(this.width + 1, this.camera.ssy(i));
		}
		this.ctx.stroke();
		if(numbers) {
			this.ctx.textBaseline = 'middle';
			this.ctx.textAlign = 'center';
			this.ctx.font = '20px arial';
			this.ctx.fillStyle = 'white';
			this.ctx.strokeStyle = 'black';
			this.ctx.lineWidth = 5;
			for(let i = Math.round(this.camera.minX / scaleX) * scaleX; i <= Math.round(this.camera.maxX / scaleX) * scaleX; i+= scaleX) {
				if(i == 0) continue;
				let x = this.camera.ssx(i);
				let y = clamp(this.camera.ssy(0) + 12, 12, this.height - 9);
				let disp = numDisplay(i, scaleX);
				this.ctx.strokeText(disp, x, y);
				this.ctx.fillText(disp, x, y);
			}
			this.ctx.textAlign = 'right';
			for(let i = Math.round(this.camera.minY / scaleY) * scaleY; i <= Math.round(this.camera.maxY / scaleY) * scaleY; i+= scaleY) {
				if(i == 0) continue;
				let disp = numDisplay(i, scaleY);
				let x = clamp(this.camera.ssx(0) - 2, 2 + this.ctx.measureText(disp).width, this.width - 2);
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
	}
	
	reset() {
		this.minX = -10;
		this.minY = -10;
		this.maxX = 10;
		this.maxY = 10;
	}
	
	fixAspectRatio() {
		let aspect = this.display.width / this.display.height;
		let curAspect = (this.maxX - this.minX) / (this.maxY - this.minY);
		let zoom = Math.sqrt(aspect / curAspect);
		this.zoomCentered(zoom, 1 / zoom);
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
			let sx = this.maxX - this.minX;
			let sy = this.maxY - this.minY;
			switch(this.dragState) {
				case DRAG_PAN:
					this.minX += dx * sx;
					this.maxX += dx * sx;
					this.minY += dy * sy;
					this.maxY += dy * sy;
					break;
				case DRAG_SCALE:
					if(Math.abs(event.x - this.scaleCenterX) < Math.abs(event.y - this.scaleCenterY)) {
						dx = 0;
					} else {
						dy = 0;
					}
					this.zoom(this.scaleCenterX, this.scaleCenterY, 256 ** dx, 256 ** dy);
					break;
			}
			this.oldMX = event.x;
			this.oldMY = event.y;
		}
	}
	
	zoomCentered(zx, zy) {
		let mx = (this.minX + this.maxX) / 2;
		let my = (this.minY + this.maxY) / 2;
		this.minX = (this.minX - mx) * zx + mx;
		this.maxX = (this.maxX - mx) * zx + mx;
		this.minY = (this.minY - my) * zy + my;
		this.maxY = (this.maxY - my) * zy + my;
	}
	
	zoom(cx, cy, zx, zy) {
		let mx = (cx - this.display.canvas.offsetLeft) * window.devicePixelRatio / this.display.width;
		let my = 1 - (cy - this.display.canvas.offsetTop) * window.devicePixelRatio / this.display.height;
		mx = mx * (this.maxX - this.minX) + this.minX;
		my = my * (this.maxY - this.minY) + this.minY;
		this.minX = (this.minX - mx) * zx + mx;
		this.maxX = (this.maxX - mx) * zx + mx;
		this.minY = (this.minY - my) * zy + my;
		this.maxY = (this.maxY - my) * zy + my;
	}
	
	handleWheel(event) {
		let ratio = 1.15 ** (event.deltaY / 100);
		this.zoom(event.x, event.y, ratio, ratio);
	}
	
	updateResized(oldWidth, width) {
		let ratio = oldWidth / width;
		let mid = (this.maxX + this.minX) / 2;
		this.minX = (this.minX - mid) / ratio + mid;
		this.maxX = (this.maxX - mid) / ratio + mid;
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