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
				name: 'input',
				attributes: {}
			});

			assert.deepEqual(parser.mapHtmlTagToArray('<div>'), {
				name: 'div',
				attributes: {}
			});

			assert.deepEqual(parser.mapHtmlTagToArray('<random:value>'), {
				name: 'random:value',
				attributes: {}
			});

			assert.deepEqual(parser.mapHtmlTagToArray('<random-value>'), {
				name: 'random-value',
				attributes: {}
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
	}
});
