import CollisionObserver from './collisionObserver.js';
import JSGLibGame from './game.js';
import JSGLibStickyContainer from './stickyContainer.js';
import JSGLibImageText from './imageText.js';
import JSGLibTransform from './transform.js';
import JSGLibElement from './element.js';
import * as utils from './utils.js';

window._jsglibCustomClasses = window._jsglibCustomClasses || {};

const define = (callback) => {
	if (!callback.name || callback.name === 'anonymous') {
		throw new Error(`[JSGLib] function sent to JSGLib.define must have a name. Received: ${callback.toString()}`);
	}
	
	window._jsglibCustomClasses[callback.name] = callback;
};

const initElements = () => {
	customElements.define('jsglib-game', JSGLibGame);
	customElements.define('jsglib-sticky-container', JSGLibStickyContainer);
	customElements.define('jsglib-image-text', JSGLibImageText);
	customElements.define('jsglib-transform', JSGLibTransform);
	customElements.define('jsglib-element', JSGLibElement);
};

export default {
	define,
	initElements,
	Game: JSGLibGame,
	Element: JSGLibElement,
	ImageText: JSGLibImageText,
	StickyContainer: JSGLibStickyContainer,
	Transform: JSGLibTransform,
	CollisionObserver,
	...utils,
};
