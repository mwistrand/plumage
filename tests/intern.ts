import intern = require('intern');

// The desired AMD loader to use when running unit tests (client.html/client.js). Omit to use the default Dojo
// loader
export const loaders = {
	'host-browser': 'node_modules/dojo-loader/loader.js',
	'host-node': 'dojo-loader'
};

// Configuration options for the module loader; any AMD configuration options supported by the AMD loader in use
	// can be used here.
	// If you want to use a different loader than the default loader, see
	// <https://theintern.github.io/intern/#option-useLoader> for instruction
export const loaderOptions = {
	// Packages that should be registered with the loader in each testing environment
	packages: [
		{ name: 'src', location: 'dist/src' },
		{ name: 'tests', location: 'dist/tests' },
		{ name: 'maquette', location: 'node_modules/maquette/dist', main: 'maquette.js' }
	]
}

// Non-functional test suite(s) to run in each browser
export const suites = [ 'tests/unit/parser', 'tests/unit/vdom' ];

// A regular expression matching URLs to files that should not be included in code coverage analysis
export const excludeInstrumentation = /^(?:tests|node_modules)\//;
