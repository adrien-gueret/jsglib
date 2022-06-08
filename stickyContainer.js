const template = document.createElement('template');
		
template.innerHTML = `
	<style>			
		:host {
			display: block;
			position: sticky;
			width: 100%;
			height: 100%;
			left: 0;
			top: 0;
			right: 0;
			bottom: 0;
			overflow: hidden;
			pointer-events: none;
		}
	</style>
	<slot></slot>
`;

class JSGLibStickyContainer extends HTMLElement {
	constructor() {
		super();
		
		const shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRoot.appendChild(template.content.cloneNode(true));
	}
	
	connectedCallback() {
		this.setAttribute('data-jsglib-sticky-container', 1);
	}
}

export default JSGLibStickyContainer;