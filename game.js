import { dispatchEvent, getFromAttributeAsInt, applyIsAttribute } from './utils.js';
import CollisionObserver from './collisionObserver.js';

const template = document.createElement('template');
		
template.innerHTML = `
	<style>			
		:host {
			display: block;
			position: relative;
			margin: auto;
			background-color: #000;
			overflow: hidden;
			box-sizing: border-box;
			transform-origin: top center;
			touch-action: manipulation;
			image-rendering: optimizeSpeed;
			image-rendering: -moz-crisp-edges;
			image-rendering: -o-crisp-edges;
			image-rendering: -webkit-optimize-contrast;
			image-rendering: pixelated;
			image-rendering: optimize-contrast;
			-ms-interpolation-mode: nearest-neighbor;
		}
	</style>
	<slot></slot>
`;

class JSGLibGame extends HTMLElement {
	constructor() {
		super();
		
		const shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRoot.appendChild(template.content.cloneNode(true));
		
		this.frameIndex = 0;
		this.fps = 0;
		this.mouse = {
			x: 0,
			y: 0,
		};
		
		this.cachedBoundingClientRect = null;
		this.intersectionObserver = null;
		this.attachedViewElement = null;
		this.viewPositionDelta = {};
		this.scrollMaxLeft = Infinity;
		this.scrollMaxTop = Infinity;
		this.scrollMinLeft = 0;
		this.scrollMinTop = 0;
	}
	
	connectedCallback() {
		this.setAttribute('tabindex', 0);
		this.setAttribute('data-jsglib-game', 1);
		
		this.fps = getFromAttributeAsInt(this, 'fps', 60);
		this.width = getFromAttributeAsInt(this, 'width', 480);
		this.height = getFromAttributeAsInt(this, 'height', 340);
		this.zoom = getFromAttributeAsInt(this, 'zoom', 1);
		
		this.collisionObserver = new CollisionObserver({
			root: this,
			interval: 1000 / this.fps,
		});
		/*
		this.intersectionObserver = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				const intersectionRatioToEvent = ['jsglib:leaveView', 'jsglib:enterView'];
				const eventToDispatch = intersectionRatioToEvent[entry.intersectionRatio] || 'intersectView';
				const doesIntersectHorizontally = entry.intersectionRect.width < entry.target._jsglibElement.width;
				const doesIntersectVertically = entry.intersectionRect.height < entry.target._jsglibElement.height;
				
				dispatchEvent(entry.target._jsglibElement, eventToDispatch, { detail: {
					intersectionEntry: entry,
					doesIntersectHorizontally,
					doesIntersectVertically,
				}});
			});
		}, { root: this, threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]});
		*/
		
		this.addEventListener('mousemove', (e) => {
			this.mouse.x = e.clientX - this.x;
			this.mouse.y = e.clientY - this.y;
		});

		this.addEventListener('keydown', (e) => {
			if (e.key === ' ' || e.key === 'Enter') {
				this.click();
			}
		});
		
		this.__resetCachedBoundingClientRect = () => this.cachedBoundingClientRect = null;
		
		window.addEventListener('resize', this.__resetCachedBoundingClientRect);
		window.addEventListener('scroll', this.__resetCachedBoundingClientRect);
		
		applyIsAttribute(this);
	}
	
	disconnectedCallback() {
		window.removeEventListener('resize', this.__resetCachedBoundingClientRect);
		window.removeEventListener('scroll', this.__resetCachedBoundingClientRect);
		this.collisionObserver.disconnect();

		// this.intersectionObserver.disconnect();
	}
	
	getBoundingClientRect() {
		if (!this.cachedBoundingClientRect) {
			const rect = super.getBoundingClientRect();
			const computedStyle = window.getComputedStyle(this);
			
			if (this._zoom === 0) {
				this.cachedBoundingClientRect = {
					width: 0,
					height: 0,
					left: Math.floor(rect.left),
					top: Math.floor(rect.top),
				};
			} else {
				const zoom = Math.abs(this._zoom);
				this.cachedBoundingClientRect = {
					width: rect.width / zoom,
					height: rect.height / zoom,
					left: Math.floor(rect.left / zoom) + parseInt(computedStyle.borderLeftWidth, 10),
					top: Math.floor(rect.top / zoom) + parseInt(computedStyle.borderTopWidth, 10),
				};
			}
		}
		
		return this.cachedBoundingClientRect;
	}
	
	createElement({ name, attributes, disableAppend, nextTo } = {}) {
		const isCustomElement = !!customElements.get(name);
		const elementTagName = isCustomElement ? name : 'jsglib-element';
		
		const element = document.createElement(elementTagName);
		element.game = this;
		
		if (attributes) {
			for (let [attributeName, attributeValue] of Object.entries(attributes)) {
				element.setAttribute(attributeName, attributeValue);
			}
		}
		
		if (!isCustomElement && Boolean(name)) {
			element.setAttribute('is', name);
		}
		
		if (!disableAppend) {
			if (!nextTo) {
				this.appendChild(element);
			} else {
				nextTo.parentNode.insertBefore(element, nextTo);
			}
		}
		
		return element;
	}
	
	
	_viewLoop() {
		if (!this.attachedViewElement) {
			return;
		}
		
		const { x, y } = this.attachedViewElement.getCenter();
		const { x: deltaX = 0, y: deltaY = 0 } = this.viewPositionDelta;
		
		this.scrollLeft = Math.floor(Math.min(this.scrollMaxLeft, Math.max(this.scrollMinLeft, (x + deltaX) - this.width / 2)));
		this.scrollTop = Math.floor(Math.min(this.scrollMaxTop, Math.max(this.scrollMinTop, (y + deltaY) - this.height / 2)));
		
		window.setTimeout(this._viewLoop.bind(this), 1000 / this.fps);
	}
	
	attachViewToElement(elementToAttach, positionDelta = {}) {
		this.attachedViewElement = elementToAttach;
		this.viewPositionDelta = positionDelta;
		this._viewLoop(positionDelta);
	}
	
	detachViewElement() {
		this.attachedViewElement = null;
	}
	
	get x() {
		return this.getBoundingClientRect().left;
	}
	
	get y() {
		return this.getBoundingClientRect().top;
	}
	
	get width() {
		return this.getBoundingClientRect().width;
	}
	
	set width(value) {
		this.cachedBoundingClientRect = null;
		this.style.width = `${value}px`;
	}
	
	get height() {
		return this.getBoundingClientRect().height;
	}
	
	set height(value) {
		this.cachedBoundingClientRect = null;
		this.style.height = `${value}px`;
	}
	
	get state() {
		return this.getAttribute('state');
	}
	
	set state(nextState) {
		const prevState = this.state;
		this.setAttribute('state', nextState);
		
		dispatchEvent(this, 'jsglib:stateChange', {
			detail: { prevState, nextState },
			cancelable: false,
			bubbles: false,
		});
	}
	
	get zoom() {
		return this._zoom;
	}
	
	set zoom(value) {
		if (this._zoom === value) {
			return;
		}
		
		this._zoom = value;
		this.style.transform = `scale(${value})`;
	}	
}

export default JSGLibGame;