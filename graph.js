function toColor(gray) {
	return `rgb(${gray}, ${gray}, ${gray})`;
}

function numDisplay(n, s) {
	return n;
}

function clamp(n, min, max) {
	return Math.min(Math.max(n, min), max);
}

// Max 5
const GRID_COUNT = 4;

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
		this.drawGraphBackground();
	}
	
	drawGraphBackground() {
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.ctx.fillRect(0, 0, this.width, this.height);
		const shades = [8, 16, 32, 64, 128];
		for(let i = shades.length - GRID_COUNT; i < shades.length; i++) {
			this.ctx.strokeStyle = toColor(shades[i]);
			this.drawGrid(7 - i, i == shades.length - 1);
		}
		this.ctx.strokeStyle = toColor(255);
		this.ctx.lineWidth = 2;
		this.ctx.beginPath();
		this.ctx.moveTo(this.camera.ssx(0), 0);
		this.ctx.lineTo(this.camera.ssx(0), this.height + 1);
		this.ctx.moveTo(0, this.camera.ssy(0));
		this.ctx.lineTo(this.width + 1, this.camera.ssy(0));
		this.ctx.stroke();
	}
	
	drawGrid(granularity, numbers = false) {
		this.ctx.beginPath();
		let aspect = this.width / this.height;
		let scaleX = (this.camera.maxX - this.camera.minX) / aspect;
		scaleX = 2 ** Math.ceil(Math.log2(scaleX) - granularity);
		if(numbers) console.log(scaleX);
		for(let i = Math.round(this.camera.minX / scaleX) * scaleX; i <= Math.round(this.camera.maxX / scaleX) * scaleX; i+= scaleX) {
			this.ctx.moveTo(this.camera.ssx(i), 0);
			this.ctx.lineTo(this.camera.ssx(i), this.height + 1);
		}
		let scaleY = this.camera.maxY - this.camera.minY;
		scaleY = 2 ** Math.ceil(Math.log2(scaleY) - granularity);
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
				let y = clamp(this.camera.ssy(0) + 12, 12, this.height - 12);
				let disp = numDisplay(i, scaleX);
				this.ctx.strokeText(disp, x, y);
				this.ctx.fillText(disp, x, y);
			}
			if(this.camera.ssx(0) <= 10) {
				this.ctx.textAlign = 'left';
			} else {
				this.ctx.textAlign = 'right';
			}
			for(let i = Math.round(this.camera.minY / scaleY) * scaleY; i <= Math.round(this.camera.maxY / scaleY) * scaleY; i+= scaleY) {
				if(i == 0) continue;
				let x = clamp(this.camera.ssx(0) - 2, 2, this.width - 2);
				let y = this.camera.ssy(i);
				let disp = numDisplay(i, scaleY);
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