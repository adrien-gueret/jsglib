import { dispatchEvent, cleanDuration, getDurationUnit } from './utils.js';

const template = document.createElement('template');
		
template.innerHTML = `
	<style>			
		:host {
			display: inline-block;
			line-height: 0;
		}
	</style>
	<span></span>
`;

const DEFAULT_REFERENCE = '0123456789';

class JSGLibImageText extends HTMLElement {
	constructor() {
		super();
		
		const shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRoot.appendChild(template.content.cloneNode(true));
		
		this.container = null;
		this.styleSheet = null;
	}
	
	connectedCallback() {
		this.container = this.shadowRoot.querySelector('span');
		this.styleSheet = this.shadowRoot.querySelector('style').sheet;
		
		const imageSrc = this.getAttribute('image');
		
		if (!imageSrc) {
			throw new Error('[JSGLib] Element <jsglib-image-text> requires an "image" attribute.');
		}
		
		this.styleSheet.insertRule(`
		span span {
			display: inline-block;
			background-image: url(${imageSrc});
			width: ${this.characterWidth}px;
			height: ${this.characterHeight}px;
		}
		`);
		
		if (this.hasAttribute('text')) {
			this.text = this.getAttribute('text');
			this.removeAttribute('text');
		}
		
		this._render();
	}
	
	_render() {
		this.container.innerHTML = '';
		
		const reference = this.reference;
		const fragment = document.createDocumentFragment();
		const cleanText = this.text.trim();
		
		for (let i = 0, l = cleanText.length; i < l; i++) {
			const character = cleanText[i];
			
			if (character === '\\' && cleanText[i + 1] === 'n') {
				i++;
				fragment.appendChild(document.createElement('br'));
				continue;
			}
			
			const characterNode = document.createElement('span');
			fragment.appendChild(characterNode);
			
			const referenceIndex = reference.indexOf(character);
			
			if (referenceIndex === -1) {
				characterNode.style.backgroundImage = 'none';
				characterNode.style.width = `${this.characterWidth/2}px`;
			} else {
				characterNode.style.backgroundPosition = `-${referenceIndex * this.characterWidth}px`;
			}
		}
		
		this.container.appendChild(fragment);
	}
	
	get characterWidth() {
		return parseInt(this.getAttribute('characterWidth') || 12, 10);
	}
	
	get characterHeight() {
		return parseInt(this.getAttribute('characterHeight') || 12, 10);
	}
	
	get reference() {
		return this.getAttribute('reference') || DEFAULT_REFERENCE;
	}
	
	set reference(newReference) {
		this.setAttribute('reference', newReference);
		this._render();
	}
	
	get text () {
		return this.getAttribute('aria-label') || '';
	}
	
	set text(newText) {
		this.setAttribute('aria-label', newText.toString().trim());
		this._render();
	}
}

export default JSGLibImageText;