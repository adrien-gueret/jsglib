import { dispatchEvent, cleanDuration, getFromAttributeAsInt, applyIsAttribute } from './utils.js';

const template = document.createElement('template');
		
template.innerHTML = `
	<style>			
		:host {
			display: block;
			position: absolute;
			padding: 0;
			left: 0;
			top: 0;
			z-index: 0;
		}
		
		slot, ::slotted(*) {
			display: block;
			position: absolute;
			inset: 0;
			transform-origin: center;
		}
	</style>
		
	<jsglib-transform property="translateY">
		<jsglib-transform property="translateX">
			<slot></slot>
		</jsglib-transform>
	</jsglib-transform>
`;

function getBoundedX(jsglibElement, x) {
	return Math.floor(Math.max(jsglibElement.xmin, Math.min(jsglibElement.xmax, x)));
}

function getBoundedY(jsglibElement, y) {
	return Math.floor(Math.max(jsglibElement.ymin, Math.min(jsglibElement.ymax, y)));
}

class JSGLibElement extends HTMLElement {
	constructor() {
		super();
		
		const shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRoot.appendChild(template.content.cloneNode(true));
		
		this.game = null;
		this._transformContainers = {};
		this._content = null;
		
		this._cachedGame = null;
		this._cachedBoundingClientRect = null;
		this.clearCachedBoundingClientRectClock = null;
		
		this._observers = {};
		
		this._onEndX = null;
		this._onEndY = null;
	}
	
	connectedCallback() {
		this.game = this.closest('[data-jsglib-game]');
		
		if (!this.game) {
			throw new Error(`[JSGLib] Element <${this.tagName.toLowerCase()}> is not wrapped into a <jsglib-game> element.`);
		}
		
		this.stickyContainer = this.closest('[data-jsglib-sticky-container]');
		
		this.setAttribute('data-jsglib-element', 1);
		
		this._transformContainers = {
			translateX: this.shadowRoot.querySelector('jsglib-transform[property="translateX"]'),
			translateY: this.shadowRoot.querySelector('jsglib-transform[property="translateY"]'),
		};
		this._content = this.shadowRoot.querySelector('slot');
		this._content._jsglibElement = this;
		
		this.xmin = getFromAttributeAsInt(this, 'xmin', -Infinity);
		this.ymin = getFromAttributeAsInt(this, 'ymin', -Infinity);
		this.xmax = getFromAttributeAsInt(this, 'xmax', Infinity);
		this.ymax = getFromAttributeAsInt(this, 'ymax', Infinity)
		this.width = getFromAttributeAsInt(this, 'width', 16);
		this.height = getFromAttributeAsInt(this, 'height', 16);	

		this.x = getFromAttributeAsInt(this, 'x', 0);
		this.y = getFromAttributeAsInt(this, 'y', 0);
		this.hspeed = getFromAttributeAsInt(this, 'hspeed', 0);
		this.vspeed = getFromAttributeAsInt(this, 'vspeed', 0);

		applyIsAttribute(this);
		
		// this.game.intersectionObserver.observe(this._content);
	}
	
	disconnectedCallback() {
		if (this.clearCachedBoundingClientRectClock) {
			window.clearTimeout(this.clearCachedBoundingClientRectClock);
		}
		
		this.game.intersectionObserver.unobserve(this._content);
		this.unobserveAllCollisions();
		dispatchEvent(this, 'jsglib:destroy');
	}
	
	getBoundingClientRect() {
		if (!this._cachedBoundingClientRect) {
			const rect = this._content.getBoundingClientRect();
			
			const zoom = Math.abs(this.game._zoom);
			
			const isSticky = Boolean(this.stickyContainer);
			const scrollDelta = isSticky ? {
				x: 0,
				y: 0,
			} : {
				x: this.game.scrollLeft,
				y: this.game.scrollTop,
			}
			
			
			if (zoom === 0) {
				this._cachedBoundingClientRect = {
					width: 0,
					height: 0,
					left: Math.floor(rect.left) + scrollDelta.x,
					top: Math.floor(rect.top) + scrollDelta.y,
				};
			} else {
				this._cachedBoundingClientRect = {
					width: rect.width / zoom,
					height: rect.height / zoom,
					left: Math.floor(rect.left / zoom) + scrollDelta.x,
					top: Math.floor(rect.top / zoom) + scrollDelta.y,
				};
			}
			
			this.clearCachedBoundingClientRectClock = window.setTimeout(() => {
				this._cachedBoundingClientRect = null;
			}, 1000 / this.game.fps);
		}
		
		return this._cachedBoundingClientRect;
	}
	
	_clearOnEndX() {
		if (this._onEndX) {
			this._transformContainers.translateX.removeEventListener('jsglib:transformationEnd', this._onEndX);
			this._onEndX = null;
		}
	}
	
	_clearOnEndY() {
		if (this._onEndY) {
			this._transformContainers.translateY.removeEventListener('jsglib:transformationEnd', this._onEndY);
			this._onEndY = null;
		}
	}
	
	get x() {
		return this.getBoundingClientRect().left - this.game.x;
	}
	
	set x(value) {
		this._transformContainers.translateX.value = `${getBoundedX(this, value)}px`;
		this._transformContainers.translateX.applyTransform();
	}
	
	get y() {
		return this.getBoundingClientRect().top - this.game.y;
	}
	
	set y(value) {
		this._transformContainers.translateY.value = `${getBoundedY(this, value)}px`;
		this._transformContainers.translateY.applyTransform();
	}
	
	get width() {
		return this.getBoundingClientRect().width;
	}
	
	set width(value) {
		this.style.width = `${value}px`;
	}
	
	get height() {
		return this.getBoundingClientRect().height;
	}
	
	set height(value) {
		this.style.height = `${value}px`;
	}
	
	get hspeed() {
		return this._transformContainers.translateX.speed;
	}
	
	set hspeed(pixelByMilliseconds) {
		if (this.hspeed === pixelByMilliseconds && parseFloat(this._transformContainers.translateX.duration) === 0) {
			return;
		}
		
		if (pixelByMilliseconds === 0) {
			this._clearOnEndX();
			this._transformContainers.translateX.duration = 0;
			this.x = this.x;
		} else {
			const speedDirection = Math.sign(pixelByMilliseconds);
			this.moveX(this.x + (9999 * speedDirection), { speed: Math.abs(pixelByMilliseconds), timingFunction: 'linear', behavior: 'repeat' });
		}
	}
	
	get vspeed() {
		return this._transformContainers.translateY.speed;
	}
	
	set vspeed(pixelByMilliseconds) {
		if (this.vspeed === pixelByMilliseconds && parseFloat(this._transformContainers.translateY.duration) === 0) {
			return;
		}
		
		if (pixelByMilliseconds === 0) {
			this._clearOnEndY();
			this._transformContainers.translateY.duration = 0;
			this.y = this.y;
		} else {
			const speedDirection = Math.sign(pixelByMilliseconds);
			this.moveY(this.y + (9999 * speedDirection), { speed: Math.abs(pixelByMilliseconds), timingFunction: 'linear', behavior: 'repeat' });
		}
	}
	
	getCenter() {
		return {
			x: this.x + this.width/2,
			y: this.y + this.height/2,
		};
	};
	
	moveX(x, options = {}) {
		const prevX = this.x;
		const nextX = getBoundedX(this, x);
		const deltaX = nextX - prevX;
		
		const timingFunction = options.timingFunction || 'linear';
		const behavior = options.behavior || null;
		
		let duration = 0;
		
		if (options.duration || options.speed) {
			if (options.duration && options.speed) {
				throw new Error(`[JSGLib] Trying to call <${this.tagName.toLowerCase()}>.moveX(${x}) with duration ${options.duration} AND speed ${options.speed}: "duration" and "speed" options cannot be both set in the same call.`);
			}
			
			if (options.duration) {
				duration = cleanDuration(options.duration);
			} else {
				duration = cleanDuration(Math.abs(deltaX) / options.speed);
			}
		}
		
		const eventDetail = {
			prevX, nextX, duration, timingFunction, behavior,
		};
		
		const beforeMoveEvent = dispatchEvent(this, 'jsglib:beforeMoveX', {
			detail: eventDetail,
			cancelable: true,
		});
		
		if (beforeMoveEvent.defaultPrevented) {
			return false;
		}
		
		this._clearOnEndX();
			
		this._onEndX = () => {
			const afterMoveEvent = dispatchEvent(this, 'jsglib:afterMoveX', {
				detail: eventDetail,
				cancelable: true,
				bubbles: false,
			});
			
			if (afterMoveEvent.defaultPrevented) {
				return false;
			}
			
			if (behavior === 'reverse') {
				this.moveX(prevX, options);
			} else if (behavior === 'repeat') {
				this.moveX(this.x + deltaX, options);
			}
		};
		
		this._transformContainers.translateX.addEventListener('jsglib:transformationEnd', this._onEndX, { once: true });
		
		this._transformContainers.translateX.duration = duration;
		this._transformContainers.translateX.timingFunction = timingFunction;
		this.x = nextX;
	}
	
	moveY(y, options = {}) {
		const prevY = this.y;
		const nextY = getBoundedY(this, y);
		const deltaY = nextY - prevY;	
		
		const timingFunction = options.timingFunction || 'linear';
		const behavior = options.behavior || null;
		
		let duration = 0;
		
		if (options.duration || options.speed) {
			if (options.duration && options.speed) {
				throw new Error(`[JSGLib] Trying to call <${this.tagName.toLowerCase()}>.moveY(${y}) with duration ${options.duration} AND speed ${options.speed}: "duration" and "speed" options cannot be both set in the same call.`);
			}
			
			if (options.duration) {
				duration = cleanDuration(options.duration);
			} else {
				duration = cleanDuration(Math.abs(deltaY) / options.speed);
			}
		}
		
		const eventDetail = {
			prevY, nextY, duration, timingFunction, behavior,
		};
		
		const beforeMoveEvent = dispatchEvent(this, 'jsglib:beforeMoveY', {
			detail: eventDetail,
			cancelable: true,
		});
		
		if (beforeMoveEvent.defaultPrevented) {
			return false;
		}
		
		this._clearOnEndY();
			
		this._onEndY = () => {
			const afterMoveEvent = dispatchEvent(this, 'jsglib:afterMoveY', {
				detail: eventDetail,
				cancelable: true,
				bubbles: false,
			});
			
			if (afterMoveEvent.defaultPrevented) {
				return false;
			}
			
			if (behavior === 'reverse') {
				this.moveY(prevY, options);
			} else if (behavior === 'repeat') {
				this.moveY(this.y + deltaY, options);
			}
		};
		
		this._transformContainers.translateY.addEventListener('jsglib:transformationEnd', this._onEndY, { once: true });
		
		this._transformContainers.translateY.duration = duration;
		this._transformContainers.translateY.timingFunction = timingFunction;
		this.y = nextY;
	}
	
	stop() {
		this._clearOnEndX();
		this._clearOnEndY();
		this._transformContainers.translateX.duration = 0;
		this._transformContainers.translateY.duration = 0;
		this.x = this.x;
		this.y = this.y;
	}
	
	observeCollisions(selector, callback) {
		if (!callback) {
			throw new Error(`[JSGLib] Can't observe collisions of <${this.tagName.toLowerCase()}> on "${selector}" without any callback.`);
		}
		
		this.unobserveCollisions(selector);
		
		this._observers[selector] = window.setInterval(() => {
			for (let elem of this.game.querySelectorAll(selector)) {
				console.log(elem);
			}
		}, 1000/this.game.fps);
	}
	
	unobserveCollisions(selector) {
		if (!this._observers[selector]) {
			return;
		}
		
		window.clearInterval(this._observers[selector]);
		delete this._observers[selector];
	}
	
	unobserveAllCollisions() {
		Object.keys(this._observers).forEach((observerSelector) => {
			this.unobserveCollisions(observerSelector);
		});
	}
}

export default JSGLibElement;