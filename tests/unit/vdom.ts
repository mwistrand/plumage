import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import { h } from 'maquette';
import { Plumage } from 'src/interfaces';
import { TypeMap } from 'src/parser';
import getParser from 'src/vdom';

interface Widget extends Plumage {
	eventCallback: () => void;
}

// TODO: create a test helpers module that returns a mock `Plumage` instance.
const widget: Widget = <any> {};
widget.eventCallback = function () {};

const parse = getParser(widget);

registerSuite({
	name: 'vdom',

	parse: {
		'assert single node without attributes'() {
			const result = parse`<div></div>`;
			assert.deepEqual(result, h('div'));
		},

		'assert single node with attributes'() {
			const result = parse`<input class="class1 class2" disabled>`;
			assert.deepEqual(result, h('input.class1.class2', {
				disabled: 'disabled'
			}));
		},

		'assert node with interpolated an attribute value'() {
			let result = getParser(widget, function (typeObject: TypeMap): string {
				return 'random input value';
			})`<input value="$[value]">`;
			assert.deepEqual(result, h('input', {
				value: 'random input value'
			}), 'Normal interpolation replacement.');

			result = getParser(widget, function (typeObject: TypeMap): string {
				return 'random input value';
			})`<input value="$![value]">`;
			assert.deepEqual(result, h('input', {
				value: 'random input value'
			}), 'Bang interpolation replacement.');
		},

		'assert node with event listeners'() {
			const result = parse`<button onclick="eventCallback">`;
			assert.deepEqual(result, h('button', {
				onclick: result.properties.onclick
			}));
		},

		'assert node with children'() {
			const result = parse`<div class="class1 class2">
				<p>Child node with text.</p>
				<a onmouseover="eventCallback">Child node with event handler.</a>
			</div>`;
			assert.deepEqual(result, h('div.class1.class2', [
				h('p', [ 'Child node with text.' ]),
				h('a', {
					onmouseover: result.children[1].properties.onmouseover
				}, [ 'Child node with event handler.'])
			]));
		},

		'assert node with interpolated children'() {
			let result = getParser(widget, function (typeObject: TypeMap): string {
				return 'random text';
			})`<div>$[value]</div>`;
			assert.deepEqual(result, h('div', [
				'random text'
			]), 'Normal interpolation replacement.');

			result = getParser(widget, function (typeObject: TypeMap): string {
				return 'random text';
			})`<div>$![value]</div>`;
			assert.deepEqual(result, h('div', [
				'random text'
			]), 'Bang interpolation replacement.');
		},

		'assert with ES2015 interpolation values'() {
			const obj = {
				toString: function () {
					return 'Lorem ipsum dolor sit amet.'
				}
			};
			let result = parse`<div>${obj}</div>`;
			assert.deepEqual(result, h('div', [
				'Lorem ipsum dolor sit amet.'
			]), 'Default interpolation mapper');

			result = getParser(widget, function () {
				return 'So eu doppio percolator, roast ut cultivar qui coffee.';
			})`<div>${obj}</div>`;
			assert.deepEqual(result, h('div', [
				'So eu doppio percolator, roast ut cultivar qui coffee.'
			]), 'Custom interpolation mapper.');
		}
	}
});
