const BLANK_PATTERN = /^\s+$/;
const TAG_NAME_PATTERN = /^<\/?([^\s\/>]+).*/;

interface Converter {
	inAttributeValue: boolean;
	inComment: boolean;
	inTag: boolean;
	previous: string;
	result: string
	tags: any[];

	closeComment(): void;
	closeTag(char: string): void;
	convert(literals: string[], values: any[]): any[];
	openComment(): void;
	openTag(char: string): void;
	processChar(char: string): void;
	reset(): void;
}

// Step 1 of the template processing: convert each HTML tag/comment/string/other
// value into a flat array of parts. For example,
// `<div class="class1 class2">
//		Some text
//		${someObject}
//		<span>More text</span>
//	</div>`
//
//	is converted to:
//	[ '<div class="class1 class2">', 'Some text', {}, '<span>', 'More text',
//		'</span>', '</div>' ]
const converter = <Converter> {
	closeComment(): void {
		this.inComment = false;
		this.result = '';
	},

	closeTag(char: string): void {
		const result = this.result + char;

		this.inTag = false;
		this.tags.push(result);
		this.result = '';
	},

	convert(literals: string[], values: any[]): any[] {
		this.reset();

		literals.forEach((literal) => {
			let index = 0;

			while (index < literal.length) {
				const char = literal.charAt(index);
				const inAttributeValue = this.inAttributeValue;
				const inComment = this.inComment;
				const inTag = this.inTag;
				const previous = this.previous;

				if (char === '<' && !inAttributeValue) {
					this.openTag(char);
				}
				else if (inTag && char === '>' && !inAttributeValue) {
					this.closeTag(char);
				}
				else if (char === '/' && previous === '/') {
					this.openComment();
				}
				else if (inComment && char === '\n') {
					this.closeComment();
				}
				else if (!inComment) {
					this.processChar(char);
				}

				this.previous = char;
				index += 1;
			}

			if (values.length && !this.inComment) {
				const nextValue: any = values.shift();
				this.tags.push(mapTaggedValue(nextValue));
			}
		});

		return this.tags;
	},

	openComment(): void {
		this.inComment = true;
	},

	openTag(char: string): void {
		let result = this.result;

		if (result) {
			if (!isWhitespace(result)) {
				if (typeof result === 'string') {
					result = result.trim();
				}
				this.tags.push(result);
			}
			this.result = '';
		}

		this.inTag = true;
		this.result += char;
	},

	processChar(char: string): void {
		const inAttributeValue = this.inAttributeValue;
		const previous = this.previous;
		this.result += char;

		if (!this.inTag) {
			return;
		}

		if (char === '"') {
			this.inAttributeValue = previous === '=' || (inAttributeValue && previous === '\\');
		}

		if (previous === '<' && !inAttributeValue && isCharWhitespace(char)) {
			this.inTag = false;
		}
	},

	reset() {
		this.inAttributeValue = false;
		this.inComment = false;
		this.inTag = false;
		this.result = '';
		this.tags = [];
	}
};

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

function identity(value: any): any {
	return value;
}

function isCharWhitespace(value: string): boolean {
	return value === '' || value === ' ' || value === '\t' || value === '\n';
}

// TODO: This functionality could likely be handled during the `nestNodeArray`
// operations, which would remove the additional traverse. `nestNodeArray` could be
// updated to accept an additional function that converts values in-place to their
// final format.
function mapArrayToNode(parts: any[]): HtmlMap {
	const first: any = parts[0];
	if (!isHtmlTag(first)) {
		throw new SyntaxError('The root value must be an HTML element.');
	}

	const root = mapHtmlTagToArray(first);

	if (parts.length === 1) {
		return root;
	}

	root.children = [];
	for (let i = 1; i < parts.length; i += 1) {
		const item: any = parts[i];
		let result: any;

		if (Array.isArray(item)) {
			result = mapArrayToNode(item);
			root.children.push(result);
		}
		else if (typeof item !== 'string' || isWhitespace(item)) {
			root.children.push(item);
		}
		else if (isHtmlTag(item)) {
			result = mapHtmlTagToArray(item);
			root.children.push(result);
		}
		else {
			root.children.push(item);
		}
	}

	return root;
}

function mapTaggedValue(value: any): string | TypeMap {
	if (typeof value === 'string') {
		if (isInterpolationValue(value)) {
			return {
				type: ValueTypes.Interpolation,
				value: value
			};
		}

		return value;
	}
	else if (typeof value === 'number') {
		return String(value);
	}
	else if (Array.isArray(value)) {
		return {
			type: ValueTypes.Array,
			value: value
		};
	}
	else if (typeof value === 'symbol') {
		return value.toString();
	}
	else if (typeof value === 'function') {
		return {
			type: ValueTypes.Function,
			value: value
		};
	}
	else if (typeof value === 'undefined') {
		return {
			type: ValueTypes.Undefined,
			value: value
		};
	}
	else {
		return {
			type: ValueTypes.Object,
			value: value
		};
	}
}

function nestNodeArray(parts: any[]): any[] {
	const closingTags: string[] = [];
	const nested: { [key: string]: any[] } = {
		0: []
	};
	let current: any = nested[0];
	let i = parts.length - 1;
	let nestLevel = 0;

	let currentClosingTag: string;
	let part: any;

	if (parts.length > 1) {
		part = parts[i];

		if (typeof part !== 'string' || part.indexOf('</') !== 0) {
			throw new SyntaxError('The template must end with a closing tag, ' +
				'or must contain only a single tag or object.');
		}

		currentClosingTag = parseTagName(part);
		i -= 1;
	}

	while (i >= 0) {
		part = parts[i];

		if (typeof part !== 'string') {
			current.unshift(part);
		}
		else if (part.indexOf('</') === 0) {
			closingTags.push(currentClosingTag);
			nestLevel += 1;
			current = nested[nestLevel] = [];
			currentClosingTag = parseTagName(part);
		}
		else if (isHtmlTag(part)) {
			if (parseTagName(part) === currentClosingTag) {
				current.unshift(part);

				if (nestLevel > 0) {
					delete nested[nestLevel];
					nestLevel -= 1;
					nested[nestLevel].unshift(current);
					current = nested[nestLevel];
					currentClosingTag = closingTags.pop();
				}
			}
			else {
				// Assume that the tag is never closed.
				current.unshift(part);
			}
		}
		else {
			current.unshift(part);
		}

		i -= 1;
	}

	return nested[0];
}

function parseTagName(tag: string): string {
	return tag.replace(TAG_NAME_PATTERN, '$1');
}

export interface AttributeMap {
	[name: string]: string;
}

export interface HtmlMap {
	name: string;
	attributes?: AttributeMap;
	children?: any[];
}

/**
 * Escapes HTML characters to be displayed as plain text.
 *
 * @param text
 * The text to escape.
 *
 * @return
 * The escaped text.
 */
export const escapeHtml = (function () {
	const pattern = /[<>&]/g;
	const escapable: { [key: string]: string; } = {
		'<': '&lt;',
		'>': '&gt;',
		'&': '&amp;'
	};

	return function (text: string): string {
		return text.replace(pattern, function (matched: string): string {
			return escapable[matched];
		});
	};
})();

/**
 * Returns a tag function that converts an ES2015 template into a node tree.
 *
 * Returns an map representing a hierarchy of HTML node definitions. The values
 * contained within the map are not converted to DOM nodes. Instead, it is up to
 * the consuming API to correctly render the values. Each HTML tag is converted to
 * an object with a `name` property and an optional `attributes` object and `children`
 * array. Node attribute names must be unique; duplicate attribute names will cause
 * a `SyntaxError` to be thrown.
 *
 * HTML tags need not be closed; but any unclosed tag is assumed to not have any
 * children. HTML comments (`<!-- ... -->`) are preserved in the output, while line
 * comments (`// ...`) are stripped out.
 *
 * Arbitrary values included in the interpolation expressions are mapped accordingly:
 *
 * - Strings, numbers, and symbols are converted to strings.
 * - All other values are converted to an `TypeMap` object.
 *
 * Use: parseNodeTree`<div>...</div>`.
 * Example:
 *
 * const arbitraryObject = { prop: 'value' };
 * const record = {
 *	name: 'The Complete Village Vanguard Recordings',
 *	artist: 'Bill Evans'
 * };
 * parseNodeTree`<form class="class1 class2" onsubmit="methodName">
 *	${arbitraryObject}
 *	<fieldset>
 *		<input name="artist" value="${record.artist}">
 *		<input type="submit" disabled>
 *	</fieldset>
 * </form>`
 *
 * Converts to:
 *
 * {
 *	name: 'form',
 *	attributes: {
 *		'class': 'class1 class2'
 *		onsubmit: 'methodName'
 *	},
 *	children: [
 *		{
 *			type: 0, // ValueTypes.Object
 *			value: { prop: 'value' }
 *		},
 *		{
 *			name: 'fieldset',
 *			children: [
 *				{
 *					name: 'input',
 *					attributes: { name: 'artist', value: 'Bill Evans' }
 *				},
 *				{
 *					name: 'input',
 *					attributes: { type: 'submit', disabled: null }
 *				}
 *			]
 *		}
 *	]
 * }
 */
export default function getParser(callback: ParserCallback = identity): Parser {
	return function (literals: string[], ...values: any[]): HtmlMap {
		return callback(mapArrayToNode(nestNodeArray(converter.convert(literals, values))));
	};
}

/**
 * Determines whether the specified string is an HTML comment.
 *
 * @param value
 * The value to test.
 *
 * @return
 * `true` if the string is an HTML comment; `false` otherwise.
 */
export function isHtmlComment(value: string): boolean {
	return value.indexOf('<!--') === 0 && value.lastIndexOf('-->') === value.length - 3;
}

/**
 * Determines whether the specified string represents an HTML tag; HTML comments
 * are considered to not be valid HTML tags.
 *
 * @param value
 * The candidate HTML tag.
 *
 * @return
 * `true` if the value is an HTML tag; `false` otherwise.
 */
export function isHtmlTag(value: string): boolean {
	return !isHtmlComment(value) && value.length >= 3 && value.charAt(0) === '<' &&
		value.charAt(value.length - 1) === '>' && !isCharWhitespace(value.charAt(1));
}

export function isInterpolationValue(value: string): boolean {
	return Boolean(value) && (value.indexOf('$[') === 0 || value.indexOf('$![') === 0) &&
		value.lastIndexOf(']') === value.length - 1;
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
	return isCharWhitespace(value) || BLANK_PATTERN.test(value);
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

	const map: HtmlMap = { name: fragments[0] };

	if (fragments.length > 1) {
		map.attributes = {};
	}

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

export interface Parser {
	(literals: string[], ...values: any[]): any;
}

export interface ParserCallback {
	(map: HtmlMap): any;
}

/**
 * An object map representing objects, arrays, functions, and undefined values
 * included in the template via interpolation expressions.
 */
export interface TypeMap {
	type: ValueTypes,
	value: any
}

/**
 *
 * TODO: On the one hand, an enum seems appropriate as the underlying values never
 * change. On the other hand, using string representations seems much simpler.
 */
export const enum ValueTypes {
	Object,
	Array,
	Function,
	Interpolation,
	Undefined
};
