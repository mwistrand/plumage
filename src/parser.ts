const BLANK_PATTERN = /^\s+$/m;

function extractAttributeValue(parts: string[]): string {
	if (!parts || !parts.length) {
		throw new TypeError('Missing attribute value array.');
	}

	if (parts.length === 1) {
		return null;
	}

	let value = parts.length === 2 ? parts[1] : parts.slice(1).join('=');

	if (value.charAt(0) === '"') {
		value = value.slice(1, value.length - 1);
	}

	return value;
}

export interface HtmlMap {
	name: string;
	attributes: { [name: string]: string };
}

/**
 * Determines whether the specified string represents an HTML tag.
 *
 * @param value
 * The candidate HTML tag.
 *
 * @return
 * `true` if the value is an HTML tag; `false` otherwise.
 */
export function isHtmlTag(value: string): boolean {
	return value.length >= 3 && value.charAt(0) === '<' &&
		value.charAt(value.length - 1) === '>' && !isWhitespace(value.charAt(1));
}

/**
 * Determines whether the provided string consists only of whitespace.
 *
 * Optimized for single characters.
 *
 * @param value
 * The string to test.
 *
 * @return
 * `true` if the value is only whitespace; `false` otherwise.
 */
export function isWhitespace(value: string): boolean {
	return value === '' || value === ' ' || value === '\t' || value === '\n' ||
		BLANK_PATTERN.test(value);
}

/**
 * Converts an opening HTML tag to an object with a `name` string property
 * and an object of `attributes`.
 *
 * Currently, if an attribute does not have a value, then its value in the
 * `attributes` map is null. For example, `disabled` becomes `disabled: null`.
 *
 * For example, `<button class="someClass" disabled>` would be converted
 * to:
 * {
 *   name: 'button',
 *   attributes: {
 *     'class': 'someClass',
 *     'disabled': 'disabled'
 *   }
 * }
 *
 * @param html
 * The opening HTML tag to parse.
 *
 * @return
 * The map containing the tag name and a map of attributes.
 */
export function mapHtmlTagToArray(html: string): HtmlMap {
	const end = html.lastIndexOf('/>') === html.length - 2 ? html.length - 2 : html.length - 1;
	const stripped = html.slice(1, end);
	const reduced = stripped.replace(/\s+/g, ' ');
	const fragments: string[] = [];
	let inAttribute = false;
	let current = '';
	let previous: string;
	let char: string;
	let previousChar: string;

	for (let i = 0; i < reduced.length; i++) {
		if (char) {
			previousChar = char;
		}
		char = reduced.charAt(i);

		if (char === ' ') {
			if (inAttribute) {
				current += char;
			}
			else {
				previous && fragments.push(previous);
				previous = current;
				current = '';
			}
		}
		else {
			if (char === '"' && previousChar !== '\\') {
				inAttribute = !inAttribute;
			}
			current += char;
		}
	}

	previous && fragments.push(previous);
	current && fragments.push(current);

	const map: HtmlMap = {
		name: fragments[0],
		attributes: {},
	};

	for (let j = fragments.length - 1; j >= 1; --j) {
		let attrParts: string[] = fragments[j].split('=');
		let name = attrParts[0];
		let value = extractAttributeValue(attrParts);

		if (name in map.attributes) {
			throw new SyntaxError(`The "${name}" atrribute cannot be defined more than once.`);
		}

		map.attributes[name] = value;
	}

	return map;
}
