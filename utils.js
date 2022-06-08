export const dispatchEvent =(target, eventType, options = {}) => {
	const eventToDispach = new CustomEvent(eventType, {
		detail: options.detail || {},
		bubbles: !!options.bubbles,
		cancelable: !!options.cancelable,
		composed: options.composed === undefined ? !!options.bubbles : !!options.composed,
	});
	
	target.dispatchEvent(eventToDispach);
	
	return eventToDispach;
}

export const random = (min, max) => Math.floor(Math.random() * (max-min+1)) + min;

const DEFAULT_DURATION_UNIT = 's';

export const cleanDuration = (duration) => {
	if (typeof duration === 'number') {
		duration += DEFAULT_DURATION_UNIT;
	}
	
	return duration;
}

export const getDurationUnit = (duration) => {
	if (typeof duration === 'number') {
		return DEFAULT_DURATION_UNIT;
	}
	
	if (typeof duration === 'string') {
		const stringLength = duration.length;
		
		if (!stringLength) {
			return DEFAULT_DURATION_UNIT;
		}
		
		let i = stringLength;
		
		while (i--) {
			if (/\d/.test(duration[i])) {
				return duration.slice(i + 1, stringLength) || DEFAULT_DURATION_UNIT;
			}
		}
	}
	
	return DEFAULT_DURATION_UNIT;
}

export const getFromAttribute = (jsglibElement, attributeName, defaultValue) => {
	return jsglibElement.hasAttribute(attributeName) ? jsglibElement.getAttribute(attributeName) : defaultValue;
};

export const getFromAttributeAsInt = (jsglibElement, attributeName, defaultValue) => {
	const value = getFromAttribute(jsglibElement, attributeName, null);
	
	if (value === null) {
		return defaultValue;
	}
	
	return parseInt(value, 10);
};

export const applyIsAttribute = (jsglibObject) => {
	if (!jsglibObject.hasAttribute('is')) {
		return;
	}
		
	const callbackName = jsglibObject.getAttribute('is');
	const callback = window._jsglibCustomClasses[callbackName];
		
	if (!callback) {
		throw new Error(`[JSGLib] "is" attribute "${callbackName}" of <${jsglibObject.tagName.toLowerCase()}> has not been registered via JSGLib.define`);
	}
	
	const extraTemplateContent = callback(jsglibObject);
	
	if (!extraTemplateContent) {
		return;
	}
	
	const template = document.createElement('template');
	template.innerHTML = extraTemplateContent;
	
	jsglibObject.shadowRoot.querySelector('slot').parentNode.appendChild(template.content.cloneNode(true));
};
