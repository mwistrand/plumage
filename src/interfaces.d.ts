interface GenericObject {
	[key: string]: any;
}

export interface Context extends GenericObject {}

export interface Plumage extends Context {
	id: number;
	initializers?: PlumageInitializer[];
	isDestroyed: boolean;
	isRendered: boolean;
	node: HTMLElement;
	parent?: Plumage;
	storeProp: string | symbol;

	addChild(child: Plumage, node?: HTMLElement): Plumage;
	destroy(): void;
	placeAt(parent: Plumage | HTMLElement, parentNode?: HTMLElement): Plumage;
	removeChild(child: Plumage): Plumage;
	render(): HTMLElement | Promise<HTMLElement>;
	setStore(store: Store): void;
}

export interface PlumageFactory {
	compose(options: PlumageOptions): PlumageFactory,
	create(options: PlumageOptions, parent?: Plumage | HTMLElement, parentNode?: HTMLElement): Plumage
}

export interface PlumageInitializer {
	(instance: Plumage, options?: PlumageOptions): void;
}

export interface PlumageOptions extends GenericObject {
	initializers?: PlumageInitializer[];
}

export interface Store extends GenericObject {}
