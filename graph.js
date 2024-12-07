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
		let aspect = this.width / this.height;
		let scale = (this.camera.maxX - this.camera.minX) / aspect;
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
		this.isDragging = false;
		this.oldMX = 0;
		this.oldMY = 0;
		this.display.canvas.addEventListener('pointerdown', this.handleDown.bind(this));
		window.addEventListener('pointerup', this.handleUp.bind(this));
		window.addEventListener('pointermove', this.handleDrag.bind(this));
		this.display.canvas.addEventListener('wheel', this.handleWheel.bind(this));
	}
	
	handleUp() {
		this.isDragging = false;
	}
	
	handleDown(event) { 
		this.oldMX = event.x;
		this.oldMY = event.y;
		this.isDragging = true;
	}
	
	handleDrag(event) {
		if(this.isDragging) {
			let dx = (this.oldMX - event.x) * window.devicePixelRatio / this.display.width;
			let dy = -((this.oldMY - event.y) * window.devicePixelRatio / this.display.height);
			let sx = this.maxX - this.minX;
			let sy = this.maxY - this.minY;
			this.minX += dx * sx;
			this.maxX += dx * sx;
			this.minY += dy * sy;
			this.maxY += dy * sy;
			this.oldMX = event.x;
			this.oldMY = event.y;
		}
	}
	
	handleWheel(event) {
		let ratio = 1.1 ** (event.deltaY / 100);
		let mx = (event.x - event.originalTarget.offsetLeft) * window.devicePixelRatio / this.display.width;
		let my = 1 -  (event.y - event.originalTarget.offsetTop) * window.devicePixelRatio / this.display.height;
		mx = mx * (this.maxX - this.minX) + this.minX;
		my = my * (this.maxY - this.minY) + this.minY;
		this.minX = (this.minX - mx) * ratio + mx;
		this.maxX = (this.maxX - mx) * ratio + mx;
		this.minY = (this.minY - my) * ratio + my;
		this.maxY = (this.maxY - my) * ratio + my;
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