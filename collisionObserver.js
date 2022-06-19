import { dispatchEvent } from './utils.js';

function areRectanglesInCollision(rectangle1, rectangle2) {
	return !(
		(rectangle1.x >= rectangle2.x + rectangle2.width) ||
		(rectangle1.x + rectangle1.width <= rectangle2.x) ||
		(rectangle1.y >= rectangle2.y + rectangle2.height) ||
		(rectangle1.y + rectangle1.height <= rectangle2.y)
	);
}

class CollisionObserver {
	constructor({ interval = 1000, root = document.body } = {}) {
		this.interval = interval;
		
		this._observedElements = new Map();
		this._collidedElements = new Map();
		this._clock = null;
		
		this._loop = () => {
			this._observedElements.forEach((selectors, observedElement) => {
				for (let elementToCheck of root.querySelectorAll(Array.from(selectors).join(','))) {
					if (elementToCheck === observedElement || !this._collidedElements.has(observedElement)) {
						continue;
					}

					const didElementsCollide = this._collidedElements.get(observedElement).has(elementToCheck);
					const doElementsCollideNow = areRectanglesInCollision(observedElement, elementToCheck);

					const collisionEventOptions = {
						detail: {
							otherElement: elementToCheck,
						},
					};

					if (doElementsCollideNow) {
						if (!didElementsCollide) {
							this._collidedElements.get(observedElement).add(elementToCheck);
							dispatchEvent(observedElement, 'jsglib:collisionStart', collisionEventOptions);
						}
					} else if (didElementsCollide) {
						this._collidedElements.get(observedElement).delete(elementToCheck);
						dispatchEvent(observedElement, 'jsglib:collisionEnd', collisionEventOptions);
					}
				}
			});
		};
	}
	
	_start() {
		if (this._clock) {
			return;
		}
		
		this._clock = window.setInterval(this._loop, this.interval);
	}
	
	observe(elem, selector = '*') {
		const selectors = this._observedElements.has(elem) ? this._observedElements.get(elem) : new Set();
		
		if (selectors.has(selector)) {
			return;
		}
		
		selectors.add(selector);
		this._observedElements.set(elem, selectors);

		const collidedElements = this._collidedElements.has(elem) ? this._collidedElements.get(elem) : new Set();
		this._collidedElements.set(elem, collidedElements);
		
		if (!this._clock) {
			this._start();
		}
	}
	
	unobserve(elem, selector) {
		if (!this._observedElements.has(elem)) {
			return false;
		}
		
		if (!selector) {
			this._observedElements.delete(elem);
			this._collidedElements.delete(elem);
			return true;
		}
		
		const selectors = this._observedElements.get(elem);
		selectors.delete(selector);
		
		if (selectors.size === 0) {
			this._observedElements.delete(elem);
			this._collidedElements.delete(elem);
		} else {
			this._observedElements.set(elem, selectors);
		}

		return true;
	}
	
	disconnect() {
		this._observedElements.clear();
		this._collidedElements.clear();
		
		if (this._clock) {
			window.clearInterval(this._clock);
		}
	}
}

export default CollisionObserver;