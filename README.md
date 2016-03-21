# Plumage.ts

Plumage is an experimental view system written in TypeScript. The goal is to provide a widgeting system that has the customization of [Dijit](https://github.com/dojo/dijit), and that uses ES6 tagged templates to provide a syntax that is similar to [React's JSX](https://facebook.github.io/react/).

As noted, in its current state this is very experimental, highly imperative, and unoptimized.

## Templates

`src/parser.ts` exposes a `getParser` method that returns a tag function that generates a tree that can be used to convert values to DOM nodes or other values. For example, `src/vdom.ts` uses this method to convert template strings into a [Maquette](http://maquettejs.org/) hyperscript structure. This same module exposes its own `getParser` method that accepts a context object and an optional mapping function used to convert arbitrary values to DOM objects:

```typescript
const parse = getParser(widget, function (value: TypeMap): string {
	if (value.type === ValueTypes.Array) {
		return value.value.join(', ');
	}
	else {
		return value.value && value.value.toString || '';
	}
});

parse`<div class="Component-element Component-element--modifier">
	<p class="description">$![description]</p>
	<input name="artist" value="$[value]">
	<input name="record" value="$[record]">
	<div>
		<button onclick="methodName">${i18n.submit()}</button>
	</div>
</div>`
```

A well-formed template is governed by the following rules:

1. The first item in the template must be an HTML element.
2. There currently cannot be more than one root HTML element.
3. HTML tags do not need to be closed (e.g., `<input type="name">`), but any unclosed HTML tag is assumed to be childless.
4. HTML comments (`<!-- ... -->`) are preserved in the output source.
5. Single-line comments (`// ...`) are removed from the output source.
6. Event listeners can be added via "on" methods. For example, `onclick="methodName"`. The specified method name must be a function on the context object provided to the parser. Otherwise, an error will be thrown.
7. There are three forms of interpolation:
  1. Native template interpolation (e.g., `${value}`). This is native to ES2015, but the mapping function mentioned above can be used to convert the interpolated values into DOM constructs.
  2. Escaped bindings (e.g., `$[value]`). This type of interpolation will be controlled by the widget functionality (see below), but the idea is that when the specified value is updated in the widget's store, it will be rerendered to the specified node. These bindings are one-way, and any HTML in the result will be escaped. Currently, interpolations within other strings is not supported. For example, `<div class="$[className]">$[contents]</div>` is supported, while `<div class="class1 $[className] class2">Prefix $[contents] suffix</div>` is not.
  3. Unescaped bindings (e.g., `$![value]`). This is identical to the escaped interpolation type, but the values are not escaped before rendering.


## Widgets

TODO: Widgets are currently under development.
