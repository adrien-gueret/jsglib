import { dispatchEvent, cleanDuration, getDurationUnit } from './utils.js';

const template = document.createElement('template');
		
template.innerHTML = `
	<style>			
		:host {
			display: block;
			position: absolute;
			inset: 0;
			transform-origin: center;
		}
	</style>
	<slot></slot>
`;

function get(transformElement, scope, property) {
	return transformElement[scope][property];
};

function set(transformElement, scope, property, value) {
	transformElement[scope][property] = value;
};

class JSGLibTransform extends HTMLElement {
	constructor() {
		super();
		
		const shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRoot.appendChild(template.content.cloneNode(true));
		
		this._transition = {};
		this._transform = {};
	}
	
	connectedCallback() {
		this.property = this.hasAttribute('property') ? this.getAttribute('property') : 'translateX';
		this.value = this.hasAttribute('value') ? this.getAttribute('value') : 0;
		this.prevValue = this.value;
		this.duration = this.hasAttribute('duration') ? this.getAttribute('duration') : 0;
		this.timingFunction = this.hasAttribute('timing-function') ? this.getAttribute('timing-function') : 'linear';
		
		this.applyTransform();
		
		this.addEventListener('transitionend', (e) => {
			if (e.target !== this) {
				return;
			}

			dispatchEvent(e.target, 'jsglib:transformationEnd', {
				detail: { prevValue: parseInt(this.prevValue, 10), nextValue: parseInt(this.value, 10), fullPrevValue: this.prevValue, fullNextValue: this.value },
				bubbles: false,
			});
		});
	}
	
	get value() {
		return get(this, '_transform', 'value');
	};
	
	set value(newValue) {
		this.prevValue = this.value;
		set(this, '_transform', 'value', newValue);
	}
	
	get property() {
		return get(this, '_transform', 'property');
	};
	
	set property(newValue) {
		set(this, '_transform', 'property', newValue);
	}
	
	get duration() {
		return get(this, '_transition', 'duration');
	};
	
	set duration(newValue) {		
		set(this, '_transition', 'duration', cleanDuration(newValue));
	}
	
	get timingFunction() {
		return get(this, '_transition', 'timingFunction');
	};
	
	set timingFunction(newValue) {
		set(this, '_transition', 'timingFunction', newValue);
	}
	
	get speed() {
		const { prevValue, value, duration } = this;
		
		let durationAsNumber = parseInt(duration, 10);
		
		if (!durationAsNumber) {
			return 0;
		}
		
		const pixels = parseInt(value, 10) - parseInt(prevValue, 10);
		const durationUnit = getDurationUnit(duration);
		
		if (durationUnit !== 's') {
			durationAsNumber /= 1000;
		}
		
		return pixels / durationAsNumber;
	}
	
	applyTransform() {
		this.style.transition = `transform ${this.duration} ${this.timingFunction}`;
		this.style.transform = `${this.property}(${this.value})`;
	}
}

export default JSGLibTransform;