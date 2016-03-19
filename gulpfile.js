var del = require('del');
var gulp = require('gulp');
var typescript = require('gulp-typescript');
var tslint = require('gulp-tslint');

var TS_FILES = [ './src/**/*.ts', './tests/**/*.ts' ];

gulp.task('clean', function () {
	del([ 'dist' ]);
});

gulp.task('default', [ 'clean' ], function () {
	return gulp.src(TS_FILES, { base: './' })
		// .pipe(tslint())
		// .pipe(tslint.report('verbose'))
		.pipe(typescript({
			module: 'umd',
			target: 'ES6',
			noImplicitAny: true
		}))
		.pipe(gulp.dest('./dist'));
});

gulp.task('watch', function () {
	gulp.watch(TS_FILES, [ 'default' ]);
});

