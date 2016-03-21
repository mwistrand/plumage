import { Context } from './interfaces';
import getHtmlParser, {
	AttributeMap,
	HtmlMap,
	isInterpolationValue,
	Parser,
	TypeMap,
	ValueTypes
} from './parser';
import { h, VNode, VNodeProperties } from 'maquette';

type HChildren = Array<string | VNode>;
type HArguments = [ string, VNodeProperties, HChildren ];

function buildVdom(map: HtmlMap, context: Context, mapper: InterpolationMapper): VNode {
	const attributes = getAttributes(map.attributes, context, mapper);
	const children = getChildren(map.children, context, mapper);
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

function getAttributes(attributes: AttributeMap, context: Context, mapper: InterpolationMapper): VNodeProperties {
	if (!attributes) {
		return null;
	}

	return Object.keys(attributes).reduce((hAttributes, key) => {
		let value: any = attributes[key];

		// TODO: Implement a comprehensive event map.
		if (key.indexOf('on') === 0) {
			let callback: (event: Event) => void = (<any> context)[value];
			if (typeof callback !== 'function') {
				throw new TypeError(`No method named "${attributes[key]}" exists on the parent instance.`);
			}
			hAttributes[key] = callback.bind(context);
		}
		else if (typeof value === 'string' && isInterpolationValue(value)) {
			hAttributes[key] = mapper({
				type: ValueTypes.Interpolation,
				value: value
			});
		}
		else if (key !== 'class') {
			const classes: string = attributes[key] === null ? key : value;
			hAttributes[key] = classes;
		}

		return hAttributes;
	}, <VNodeProperties> {});
}

function getChildren(children: any[], context: Context, mapper: InterpolationMapper): HChildren {
	if (!children || !children.length) {
		return null;
	}

	return children.reduce(function (children, child) {
		if (typeof child === 'string') {
			child = isInterpolationValue(child) ? mapper({
				type: ValueTypes.Interpolation,
				value: child
			}) : child;
			children.push(child);
		}
		else if ('type' in child) {
			children.push(mapper(child));
		}
		else {
			children.push(buildVdom(child, context, mapper));
		}

		return children;
	}, <HChildren> []);
}

/**
 * Returns a tag function that converts an HTML template string to nested Maquette
 * hyperscript structure.
 *
 * @param context
 * The parent object, required for correctly mapping event listeners and properties.
 *
 * @param mapper
 * The optional interpolation mapper, used to convert string interpolation values
 * into DOM strings or hyperscript objects. If not provided, then `toString` is
 * called on the underlying values.
 */
const getParser = function (context: Context, mapper: InterpolationMapper = defaultMapper): Parser {
	return getHtmlParser(function (map: HtmlMap): VNode {
		return buildVdom(map, context, mapper);
	});
};

export default getParser;

export interface InterpolationMapper {
	(value: TypeMap): string | VNode;
}
