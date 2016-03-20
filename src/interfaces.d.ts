export interface GenericObject {
	[key: string]: any;
}

export interface Plumage {
	constructor?: (options: PlumageOptions) => void;
	id: number;
	isDestroyed: boolean;
	isRendered: boolean;
	node: HTMLElement;
	parent?: Plumage;
	store: Store;

	addChild(child: Plumage, parentNode?: HTMLElement): Plumage;
	destroy(): void;
	placeAt(parent: Plumage | HTMLElement, parentNode?: HTMLElement): Plumage;
	removeChild(child: Plumage): Plumage;
	render(): HTMLElement | Promise<HTMLElement>;
	setStore(store: Store): void;
}

export interface PlumageOptions extends GenericObject {}
export interface Store extends GenericObject {}
