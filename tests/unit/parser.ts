import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import * as parser from 'src/parser';

registerSuite({
	name: 'Plumage Template Parser',

	escapeHtml() {
		assert.strictEqual(parser.escapeHtml('<div class="someClass">Minding my Ps & Qs</div>'),
			'&lt;div class="someClass"&gt;Minding my Ps &amp; Qs&lt;/div&gt;',
			'<, >, and & are escaped.');
	},

	isHtmlTag() {
		assert.isFalse(parser.isHtmlTag(''));
		assert.isFalse(parser.isHtmlTag('<>'));
		assert.isFalse(parser.isHtmlTag('div'));
		assert.isFalse(parser.isHtmlTag('<div'));
		assert.isFalse(parser.isHtmlTag('div>'));
		assert.isFalse(parser.isHtmlTag('< div>'));
		assert.isFalse(parser.isHtmlTag('<\ndiv>'));
		assert.isFalse(parser.isHtmlTag('<\tdiv>'));

		assert.isTrue(parser.isHtmlTag('<div>'));
		assert.isTrue(parser.isHtmlTag('<div class="Component-element--modifier">'));
		assert.isTrue(parser.isHtmlTag('<random:value>'));
		assert.isTrue(parser.isHtmlTag('<random-value>'));
	},

	isWhitespace() {
		assert.isFalse(parser.isWhitespace('a'));
		assert.isFalse(parser.isWhitespace(' a'));
		assert.isFalse(parser.isWhitespace(' a\t\n'));
		assert.isFalse(parser.isWhitespace('\ta '));
		assert.isFalse(parser.isWhitespace('a\nb'));

		assert.isTrue(parser.isWhitespace(''));
		assert.isTrue(parser.isWhitespace(' '));
		assert.isTrue(parser.isWhitespace('\t'));
		assert.isTrue(parser.isWhitespace('\n'));
		assert.isTrue(parser.isWhitespace('    '));
		assert.isTrue(parser.isWhitespace(' \n  \t '));
		assert.isTrue(parser.isWhitespace(` \n
				\t `));
	},

	mapHtmlTagToArray: {
		'assert tag with no attributes'() {
			assert.deepEqual(parser.mapHtmlTagToArray('<input />'), {
				name: 'input'
			});

			assert.deepEqual(parser.mapHtmlTagToArray('<div>'), {
				name: 'div'
			});

			assert.deepEqual(parser.mapHtmlTagToArray('<random:value>'), {
				name: 'random:value'
			});

			assert.deepEqual(parser.mapHtmlTagToArray('<random-value>'), {
				name: 'random-value'
			});
		},

		'assert tag with attributes'() {
			let tag: string = '<input type="text" name="name" value="">';
			assert.deepEqual(parser.mapHtmlTagToArray(tag), {
				name: 'input',
				attributes: {
					type: 'text',
					name: 'name',
					value: ''
				}
			}, 'Name/value pair attributes converted.');

			tag = '<input disabled>';
			assert.deepEqual(parser.mapHtmlTagToArray(tag), {
				name: 'input',
				attributes: {
					disabled: null
				}
			}, 'Name-only attributes converted.');

			tag = '<input value="2 + 2 = 4">';
			assert.deepEqual(parser.mapHtmlTagToArray(tag), {
				name: 'input',
				attributes: {
					value: '2 + 2 = 4'
				}
			}, 'Attribute parsing does not choke on `=`');

			tag = '<input value="value with \"\" quotes.">';
			assert.deepEqual(parser.mapHtmlTagToArray(tag), {
				name: 'input',
				attributes: {
					value: 'value with "" quotes.'
				}
			}, 'Attribute parsing does not choke on `"`');

			tag = `<div class="Component-element Component-element--modifier"
				data-text="The quick brown \"fox\" jumped over the lazy dog."
				data-other-text="2 + 2 = 4"
				data-plumage-id="12345" id="12345" aria-disabled="disabled" disabled>`;
			assert.deepEqual(parser.mapHtmlTagToArray(tag), {
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

	parseNodeTree: {
		errors() {
			assert['throws'](function () {
				const name = 'Bill Evans';
				parser.parseNodeTree`${name}`;
			});
			assert['throws'](function () {
				parser.parseNodeTree`<!-- comment -->`;
			});
		},

		'assert single, unclosed node'() {
			const result = parser.parseNodeTree`<input name="name" disabled>`;
			assert.deepEqual(result, {
				name: 'input',
				attributes: {
					name: 'name',
					disabled: null
				}
			});
		},

		'assert single, closed node'() {
			const result = parser.parseNodeTree`<div class="Component-element"
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
			const result = parser.parseNodeTree`<div>Lorem ipsum dolor sit amet</div>`;

			assert.deepEqual(result, {
				name: 'div',
				children: [ 'Lorem ipsum dolor sit amet' ]
			});
		},

		'assert comments'() {
			let result = parser.parseNodeTree`<div><!-- html comment --></div>`;
			assert.deepEqual(result, {
				name: 'div',
				children: [ '<!-- html comment -->' ]
			}, 'HTML comments are preserved.');

			result = parser.parseNodeTree`<div>
				// line comment
			</div>`;
			assert.deepEqual(result, {
				name: 'div'
			}, 'Line comments are removed.');
		},

		'assert multiple tags'() {
			const result = parser.parseNodeTree`<div onclick="methodName">
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

		'replacement values': {
			'string'() {
				const name = 'Bill Evans';
				const result = parser.parseNodeTree`<div>
					${name}
				</div>`;

				assert.deepEqual(result, {
					name: 'div',
					children: [ 'Bill Evans' ]
				});
			},

			'number'() {
				const count = 42;
				const result = parser.parseNodeTree`<div>
					${count}
				</div>`;

				assert.deepEqual(result, {
					name: 'div',
					children: [ '42' ]
				});
			},

			'symbol'() {
				const sym = Symbol();
				const result = parser.parseNodeTree`<div>
					${sym}
				</div>`;

				assert.deepEqual(result, {
					name: 'div',
					children: [ sym.toString() ]
				});
			},

			'array'() {
				const array = [ 0, 1, 2 ];
				const result = parser.parseNodeTree`<div>
					${array}
				</div>`;

				assert.deepEqual(result, {
					name: 'div',
					children: [
						{ type: parser.ValueTypes.Array, value: array }
					]
				});
			},

			'object'() {
				const object = { name: 'Bill Evans', album: 'New Jazz Conceptions' };
				const result = parser.parseNodeTree`<div>
					${object}
				</div>`;

				assert.deepEqual(result, {
					name: 'div',
					children: [
						{ type: parser.ValueTypes.Object, value: object }
					]
				});
			},

			'function'() {
				const callback = function () {};
				const result = parser.parseNodeTree`<div>
					${callback}
				</div>`;

				assert.deepEqual(result, {
					name: 'div',
					children: [
						{ type: parser.ValueTypes.Function, value: callback }
					]
				});
			},

			'undefined'() {
				let value: any;
				const result = parser.parseNodeTree`<div>
					${value}
				</div>`;

				assert.deepEqual(result, {
					name: 'div',
					children: [
						{ type: parser.ValueTypes.Undefined, value: undefined }
					]
				});
			}
		}
	}
});
