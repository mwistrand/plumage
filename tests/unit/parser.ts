import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import getParser, { escapeHtml, isHtmlTag, isWhitespace, mapHtmlTagToArray, ValueTypes } from 'src/parser';

const parse = getParser();

registerSuite({
	name: 'Plumage Template Parser',

	escapeHtml() {
		assert.strictEqual(escapeHtml('<div class="someClass">Minding my Ps & Qs</div>'),
			'&lt;div class="someClass"&gt;Minding my Ps &amp; Qs&lt;/div&gt;',
			'<, >, and & are escaped.');
	},

	isHtmlTag() {
		assert.isFalse(isHtmlTag(''));
		assert.isFalse(isHtmlTag('<>'));
		assert.isFalse(isHtmlTag('div'));
		assert.isFalse(isHtmlTag('<div'));
		assert.isFalse(isHtmlTag('div>'));
		assert.isFalse(isHtmlTag('< div>'));
		assert.isFalse(isHtmlTag('<\ndiv>'));
		assert.isFalse(isHtmlTag('<\tdiv>'));

		assert.isTrue(isHtmlTag('<div>'));
		assert.isTrue(isHtmlTag('<div class="Component-element--modifier">'));
		assert.isTrue(isHtmlTag('<random:value>'));
		assert.isTrue(isHtmlTag('<random-value>'));
	},

	isWhitespace() {
		assert.isFalse(isWhitespace('a'));
		assert.isFalse(isWhitespace(' a'));
		assert.isFalse(isWhitespace(' a\t\n'));
		assert.isFalse(isWhitespace('\ta '));
		assert.isFalse(isWhitespace('a\nb'));

		assert.isTrue(isWhitespace(''));
		assert.isTrue(isWhitespace(' '));
		assert.isTrue(isWhitespace('\t'));
		assert.isTrue(isWhitespace('\n'));
		assert.isTrue(isWhitespace('    '));
		assert.isTrue(isWhitespace(' \n  \t '));
		assert.isTrue(isWhitespace(` \n
				\t `));
	},

	mapHtmlTagToArray: {
		'assert tag with no attributes'() {
			assert.deepEqual(mapHtmlTagToArray('<input />'), {
				name: 'input'
			});

			assert.deepEqual(mapHtmlTagToArray('<div>'), {
				name: 'div'
			});

			assert.deepEqual(mapHtmlTagToArray('<random:value>'), {
				name: 'random:value'
			});

			assert.deepEqual(mapHtmlTagToArray('<random-value>'), {
				name: 'random-value'
			});
		},

		'assert tag with attributes'() {
			let tag: string = '<input type="text" name="name" value="">';
			assert.deepEqual(mapHtmlTagToArray(tag), {
				name: 'input',
				attributes: {
					type: 'text',
					name: 'name',
					value: ''
				}
			}, 'Name/value pair attributes converted.');

			tag = '<input disabled>';
			assert.deepEqual(mapHtmlTagToArray(tag), {
				name: 'input',
				attributes: {
					disabled: null
				}
			}, 'Name-only attributes converted.');

			tag = '<input value="2 + 2 = 4">';
			assert.deepEqual(mapHtmlTagToArray(tag), {
				name: 'input',
				attributes: {
					value: '2 + 2 = 4'
				}
			}, 'Attribute parsing does not choke on `=`');

			tag = '<input value="value with \"\" quotes.">';
			assert.deepEqual(mapHtmlTagToArray(tag), {
				name: 'input',
				attributes: {
					value: 'value with "" quotes.'
				}
			}, 'Attribute parsing does not choke on `"`');

			tag = `<div class="Component-element Component-element--modifier"
				data-text="The quick brown \"fox\" jumped over the lazy dog."
				data-other-text="2 + 2 = 4"
				data-plumage-id="12345" id="12345" aria-disabled="disabled" disabled>`;
			assert.deepEqual(mapHtmlTagToArray(tag), {
				name: 'div',
				attributes: {
					'class': 'Component-element Component-element--modifier',
					'data-text': 'The quick brown "fox" jumped over the lazy dog.',
					'data-other-text': '2 + 2 = 4',
					'data-plumage-id': '12345',
					id: '12345',
					'aria-disabled': 'disabled',
					disabled: null
				}
			}, 'Multiline support.');
		}
	},

	getParser: {
		errors() {
			assert['throws'](function () {
				const name = 'Bill Evans';
				parse`${name}`;
			});
			assert['throws'](function () {
				parse`<!-- comment -->`;
			});
		},

		'assert single, unclosed node'() {
			const result = parse`<input name="name" disabled>`;
			assert.deepEqual(result, {
				name: 'input',
				attributes: {
					name: 'name',
					disabled: null
				}
			});
		},

		'assert single, closed node'() {
			const result = parse`<div class="Component-element"
				data-text="The quick brown \"fox\" jumped over the lazy dog."
				data-other-text="2 + 2 = 4"
				data-plumage-id="12345" id="12345" aria-disabled="disabled" disabled></div>`;

			assert.deepEqual(result, {
				name: 'div',
				attributes: {
					'class': 'Component-element',
					'data-text': 'The quick brown "fox" jumped over the lazy dog.',
					'data-other-text': '2 + 2 = 4',
					'data-plumage-id': '12345',
					id: '12345',
					'aria-disabled': 'disabled',
					disabled: null
				}
			});
		},

		'assert text nodes'() {
			const result = parse`<div>Lorem ipsum dolor sit amet</div>`;

			assert.deepEqual(result, {
				name: 'div',
				children: [ 'Lorem ipsum dolor sit amet' ]
			});
		},

		'assert comments'() {
			let result = parse`<div><!-- html comment --></div>`;
			assert.deepEqual(result, {
				name: 'div',
				children: [ '<!-- html comment -->' ]
			}, 'HTML comments are preserved.');

			result = parse`<div>
				// line comment
			</div>`;
			assert.deepEqual(result, {
				name: 'div'
			}, 'Line comments are removed.');
		},

		'assert multiple tags'() {
			const result = parse`<div onclick="methodName">
				// HTML comment
				<span>$![someProperty]</span>
				<input name="happy">
				Some text
			</div>`;

			assert.deepEqual(result, {
				name: 'div',
				attributes: { onclick: 'methodName' },
				children: [
					{
						name: 'span',
						children: [ '$![someProperty]' ]
					},
					{
						name: 'input',
						attributes: { name: 'happy' }
					},

					'Some text'
				]
			});
		},

		'assert custom callback'() {
			assert.isNull(getParser(function () {
				return null;
			})`<div></div>`);
		},

		'replacement values': {
			'string'() {
				const name = 'Bill Evans';
				const result = parse`<div>
					${name}
				</div>`;

				assert.deepEqual(result, {
					name: 'div',
					children: [ 'Bill Evans' ]
				});
			},

			'number'() {
				const count = 42;
				const result = parse`<div>
					${count}
				</div>`;

				assert.deepEqual(result, {
					name: 'div',
					children: [ '42' ]
				});
			},

			'symbol'() {
				const sym = Symbol();
				const result = parse`<div>
					${sym}
				</div>`;

				assert.deepEqual(result, {
					name: 'div',
					children: [ sym.toString() ]
				});
			},

			'array'() {
				const array = [ 0, 1, 2 ];
				const result = parse`<div>
					${array}
				</div>`;

				assert.deepEqual(result, {
					name: 'div',
					children: [
						{ type: ValueTypes.Array, value: array }
					]
				});
			},

			'object'() {
				const object = { name: 'Bill Evans', album: 'New Jazz Conceptions' };
				const result = parse`<div>
					${object}
				</div>`;

				assert.deepEqual(result, {
					name: 'div',
					children: [
						{ type: ValueTypes.Object, value: object }
					]
				});
			},

			'function'() {
				const callback = function () {};
				const result = parse`<div>
					${callback}
				</div>`;

				assert.deepEqual(result, {
					name: 'div',
					children: [
						{ type: ValueTypes.Function, value: callback }
					]
				});
			},

			'undefined'() {
				let value: any;
				const result = parse`<div>
					${value}
				</div>`;

				assert.deepEqual(result, {
					name: 'div',
					children: [
						{ type: ValueTypes.Undefined, value: undefined }
					]
				});
			}
		}
	}
});
