import { Plumage } from './interfaces';
import getHtmlParser, { AttributeMap, HtmlMap, Parser, TypeMap } from './parser';
import { h, VNode, VNodeProperties } from 'maquette';

type HChildren = Array<string | VNode>;
type HArguments = [ string, VNodeProperties, HChildren ];

function buildVdom(map: HtmlMap, parent: Plumage, mapper: InterpolationMapper): VNode {
	const attributes = getAttributes(map.attributes, parent);
	const children = getChildren(map.children, parent, mapper);
	const className = map.attributes && map.attributes['class'];
	const args: HArguments = <any> [
		className ? `${map.name}.${className.replace(/\s/g, '.')}` : map.name
	];

	if (attributes && Object.keys(attributes).length) {
		args.push(attributes);
	}

	if (children) {
		args.push(children);
	}

	return h.apply(null, args);
}

function defaultMapper(typeObject: TypeMap): string {
	const value = typeObject.value;
	return value && value.toString() || '';
}

function getAttributes(attributes: AttributeMap, parent: Plumage): VNodeProperties {
	if (!attributes) {
		return null;
	}

	return Object.keys(attributes).reduce((hAttributes, key) => {
		if (key.indexOf('on') === 0) {
			let callback: (event: Event) => void = (<any> parent)[attributes[key]];
			if (typeof callback !== 'function') {
				throw new TypeError(`No method named "${attributes[key]}" exists on the parent instance.`);
			}
			hAttributes[key] = callback.bind(parent);
		}
		else if (key !== 'class') {
			const value: string = attributes[key] === null ? key : attributes[key];
			hAttributes[key] = value;
		}

		return hAttributes;
	}, <VNodeProperties> {});
}

function getChildren(children: any[], parent: Plumage, mapper: InterpolationMapper): HChildren {
	if (!children || !children.length) {
		return null;
	}

	return children.reduce(function (children, child) {
		if (typeof child === 'string') {
			children.push(child);
		}
		else if ('type' in child) {
			children.push(mapper(child));
		}
		else {
			children.push(buildVdom(child, parent, mapper));
		}

		return children;
	}, <HChildren> []);
}

/**
 * Returns a tag function that converts an HTML template string to nested Maquette
 * hyperscript structure.
 *
 * @param parent
 * The parent widget, required for correctly mapping event listeners.
 *
 * @param mapper
 * The optional interpolation mapper, used to convert string interpolation values
 * into DOM strings or hyperscript objects. If not provided, then `toString` is
 * called on the underlying values.
 */
const getParser = function (parent: Plumage, mapper: InterpolationMapper = defaultMapper): Parser {
	return getHtmlParser(function (map: HtmlMap): VNode {
		return buildVdom(map, parent, mapper);
	});
};

export default getParser;

export interface InterpolationMapper {
	(value: TypeMap): string | VNode;
}
