class Display {
	constructor() {
		this.canvas = document.getElementById('display');
		/** @type {CanvasRenderingContext2D} */
		this.ctx = this.canvas.getContext('2d');
		this.width = this.canvas.clientWidth;
		this.height = this.canvas.clientHeight;
		let observer = new ResizeObserver((entries) => this.updateCanvasSize(entries[0]));
		observer.observe(this.canvas);
	}
	
	render() {
		this.ctx.fillRect(0, 0, this.width, this.height);
		this.ctx.strokeStyle = '#0000FF';
		this.ctx.beginPath();
		for(let i = 0; i < this.width / 2; i++) {
			this.ctx.moveTo(i * 2, 0);
			this.ctx.lineTo(i * 2, this.height + 1);
		}
		this.ctx.stroke();
		this.ctx.strokeStyle = '#FF0000';
		this.ctx.beginPath();
		for(let i = 0; i < this.height / 2; i++) {
			this.ctx.moveTo(0, i * 2);
			this.ctx.lineTo(this.width, i * 2);
		}
		this.ctx.stroke();
	}
	
	updateCanvasSize(entry) {
		this.width = entry.devicePixelContentBoxSize[0].inlineSize;
		this.height = entry.devicePixelContentBoxSize[0].blockSize;
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		console.log(this.canvas.width, this.canvas.height);
	}
}