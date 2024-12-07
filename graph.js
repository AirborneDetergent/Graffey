function toColor(gray) {
	return `rgb(${gray}, ${gray}, ${gray})`;
}

// Max 5
const GRID_COUNT = 5;

class Display {
	constructor() {
		this.hasResized = false;
		this.canvas = document.getElementById('display');
		/** @type {CanvasRenderingContext2D} */
		this.ctx = this.canvas.getContext('2d');
		this.width = this.canvas.clientWidth;
		this.height = this.canvas.clientHeight;
		let observer = new ResizeObserver((entries) => this.updateCanvasSize(entries[0]));
		observer.observe(this.canvas);
		this.camera = new Camera(this);
	}
	
	updateCanvasSize(entry) {
		let oldWidth = this.width;
		let oldHeight = this.height;
		this.width = entry.devicePixelContentBoxSize[0].inlineSize;
		this.height = entry.devicePixelContentBoxSize[0].blockSize;
		if(this.hasResized) {
			this.camera.updateResized(oldWidth, this.width);
		} else {
			// Handle initial resizing by assuming the aspect ratio was 1:1 before
			this.camera.updateResized(this.height, this.width);
		}
		console.log(this.canvas.width, this.canvas.height);
		this.hasResized = true;
	}
	
	render() {
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.ctx.fillRect(0, 0, this.width, this.height);
		const shades = [16, 32, 64, 96, 128];
		for(let i = shades.length - GRID_COUNT; i < shades.length; i++) {
			this.ctx.strokeStyle = toColor(shades[i]);
			this.drawGrid(7 - i);
		}
		this.ctx.strokeStyle = toColor(255);
		this.ctx.beginPath();
		this.ctx.moveTo(this.camera.ssx(0), 0);
		this.ctx.lineTo(this.camera.ssx(0), this.height + 1);
		this.ctx.moveTo(0, this.camera.ssy(0));
		this.ctx.lineTo(this.width + 1, this.camera.ssy(0));
		this.ctx.stroke();
	}
	
	drawGrid(granularity) {
		this.ctx.beginPath();
		let scale = this.camera.maxX - this.camera.minX;
		scale = 2 ** Math.ceil(Math.log2(scale) - granularity);
		for(let i = Math.round(this.camera.minX / scale) * scale; i <= Math.round(this.camera.maxX / scale) * scale; i+= scale) {
			this.ctx.moveTo(this.camera.ssx(i), 0);
			this.ctx.lineTo(this.camera.ssx(i), this.height + 1);
		}
		scale = this.camera.maxY - this.camera.minY;
		scale = 2 ** Math.ceil(Math.log2(scale) - granularity);
		for(let i = Math.round(this.camera.minY / scale) * scale; i <= Math.round(this.camera.maxY / scale) * scale; i+= scale) {
			this.ctx.moveTo(0, this.camera.ssy(i));
			this.ctx.lineTo(this.width + 1, this.camera.ssy(i));
		}
		this.ctx.stroke();
	}
}

class Camera {
	constructor(display) {
		this.display = display;
		this.minX = -10;
		this.minY = -10;
		this.maxX = 10;
		this.maxY = 10;
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
		return Math.round(this.ssRemap(this.display.height, this.minY, this.maxY, y));
	}
}