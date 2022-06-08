class CollisionObserver {
	constructor(callback, { interval = 1000, root = document.body } = {}) {
		this.callback = callback;
		this.interval = interval;
		
		this._observedElements = new Map();
		this._clock = null;
		
		this._loop = () => {
			this._observedElements.forEach((selectors, observedElement) => {
				for (let elementToCheck of root.querySelectorAll(Array.from(selectors).join(','))) {
					if (elementToCheck === observedElement) {
						console.log('ok');
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
		
		if (!this._clock) {
			this._start();
		}
	}
	
	unobserve(elem, selector) {
		if (!this._observedElements.has(elem)) {
			return false;
		}
		
		if (!selector) {
			return this._observedElements.delete(elem);
		}
		
		const selectors = this._observedElements.get(elem);
		selectors.delete(selector);
		
		if (selectors.size === 0) {
			this._observedElements.delete(elem)
		} else {
			this._observedElements.set(elem, selectors);
		}
	}
	
	disconnect() {
		this._observedElements.clear();
		
		if (this._clock) {
			window.clearInterval(this._clock);
		}
	}
}

export default CollisionObserver;