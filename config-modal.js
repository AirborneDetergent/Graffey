class ConfigModal {
	constructor(/** @type {EquationTable} */equaTable) {
		this.activeId = null;
		/** @type {Renderer} */
		this.renderer = null;
		this.equaTable = equaTable;
		this.modal = new bootstrap.Modal(document.querySelector('#config-modal'));
		this.colorRange = document.querySelector('#color-range');
		this.colorRange.addEventListener('input', () => {
			this.equaTable.changeColor(this.activeId, this.colorRange.valueAsNumber);
			this.setBackgroundColor(this.colorRange, this.colorRange.valueAsNumber);
		});
		this.secondaryColorRange = document.querySelector('#secondary-color-range');
		this.secondaryColorRange.addEventListener('input', () => {
			this.equaTable.changeSecondaryColor(this.activeId, this.secondaryColorRange.valueAsNumber);
			this.setBackgroundColor(this.secondaryColorRange, this.secondaryColorRange.valueAsNumber);
		});
	}
	
	setBackgroundColor(element, angle) {
		let [r, g, b] = this.equaTable.colorFromTheta(angle * Math.PI * 2);
		element.style = `background-color: rgb(${r}, ${g}, ${b})`;
	}
	
	initModal(id) {
		let equa = equaTable.equations[id];
		this.activeId = id;
		this.colorRange.value = equa.angle;
		this.setBackgroundColor(this.colorRange, this.colorRange.valueAsNumber);
		this.secondaryColorRange.value = equa.secAngle;
		this.setBackgroundColor(this.secondaryColorRange, this.secondaryColorRange.valueAsNumber);
		this.modal.show();
	}
}