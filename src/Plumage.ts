import { Plumage, PlumageFactory, PlumageOptions, Store } from './interfaces';
import { VNode } from 'maquette';

const childMap = new WeakMap<Plumage, { [key: number]: Plumage }>();
const storeMap = new WeakMap<Plumage, Store>();
let nextPlumageId = 0;

const Plumage= <Plumage> {
	isDestroyed: false,
	isRendered: false,

	/**
	 * Registers a Plumage instance as a child of this instance, which allows the
	 * children to be updated automatically when the store updates.
	 */
	addChild(child: Plumage, node?: HTMLElement): Plumage {
		let children = childMap.get(this);

		if (!children) {
			children = {};
			childMap.set(this, children);
		}

		children[child.id] = child;
		child.parent = this;
		const parentNode = node || this.node;
		parentNode.appendChild(child.node);

		return this;
	},

	destroy(removeFromParent: boolean = true): void {
		if (this.isDestroyed) {
			return;
		}

		const children = this._childrenById;

		this._childrenById = null;
		if (children) {
			Object.keys(children).forEach((id) => {
				children[id].destroy(false);
			});
		}

		this.node.parentNode.removeChild(this.node);

		if (removeFromParent && this.parent) {
			this.parent.removeChild(this);
		}

		Object.defineProperty(this, 'isDestroyed', { enumerable: true, value: true });
	},

	placeAt(parent: Plumage | HTMLElement, parentNode?: HTMLElement): Plumage {
		if (isPlumage(parent)) {
			(<Plumage> parent).addChild(this, parentNode);
		}
		else {
			(<HTMLElement> parent).appendChild(this.node);

			if (!this.isRendered) {
				Object.defineProperty(this, 'isRendered', { enumerable: true, value: true });
			}
		}

		return this;
	},

	removeChild(child: Plumage): Plumage {
		const children = childMap.get(this);

		if (children) {
			delete children[child.id];
		}

		return this;
	},

	setStore(store: Store): void {
		storeMap.set(this, store);

		const children = childMap.get(this);
		children && Object.keys(children).forEach((key) => {
			const child: Plumage = (<any> children)[key];
			const childStore = child.storeProp ? store[child.storeProp] : store;

			child.setStore(childStore);
		});

		// TODO: Update bindings...
	}
};

function _compose(proto: Plumage, options: PlumageOptions): PlumageFactory {
	const Child = <Plumage> Object.create(proto);
	const initializers = (Child.initializers || []).concat(options.initializers || []);

	Object.keys(options).forEach((key) => {
		(<any> Child)[key] = options[key];
	});

	Child.initializers = initializers;

	return {
		compose(options: PlumageOptions): PlumageFactory {
			return _compose(Child, options);
		},

		create(options: PlumageOptions): Plumage {
			return _create(Child, options);
		}
	};
}

function _create(Child: Plumage, options: PlumageOptions = {}, parent?: Plumage | HTMLElement, parentNode?: HTMLElement): Plumage {
	const widget = Object.create(Child);
	Object.defineProperty(widget, 'id', { enumerable: true, value: nextPlumageId++ });
	widget.initializers.forEach((initializer: (widget: Plumage, options: PlumageOptions) => void) => {
		initializer(widget, options);
	});

	if (parent && (!isPlumage(parent) || (<Plumage> parent).isRendered)) {
		_render.call(widget, parent);
	}

	return widget;
}

function _render(parent: Plumage | HTMLElement, parentNode?: HTMLElement): Promise<Plumage> {
	if (this.isRendered) {
		return this;
	}

	return getPromised(this.beforeRender()).then(() => {
		return getPromised(this.render());
	}).then((root: HTMLElement) => {
		Object.defineProperty(this, 'node', { enumerable: true, value: root });

		if (isPlumage(parent)) {
			(<Plumage> parent).placeAt(this, parentNode);
		}
		else {
			(<HTMLElement> parent).appendChild(this.node);
		}

		Object.defineProperty(this, 'isRendered', { enumerable: true, value: true });

		return getPromised(this.afterRender());
	}).then(() => this);
}

function getPromised(value: any): Promise<any> {
	return value && typeof value.then === 'function' ? value : Promise.resolve(value);
}

export function compose(options: PlumageOptions): PlumageFactory {
	return _compose(Plumage, options);
}

export function create(options: PlumageOptions, parent?: Plumage | HTMLElement): Plumage {
	return _create(Plumage, options, parent);
}

export function isPlumage(value: any): boolean {
	return Plumage.isPrototypeOf(value);
}
