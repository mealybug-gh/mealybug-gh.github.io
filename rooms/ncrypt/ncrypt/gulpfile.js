/* Load dependencies */
var path = require('path');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

// example comment test abc

/* Configuration */
var config = {};
/* - Source files */
config.source = {};
/* -- Browserify options */
config.source.browserify = {};
config.source.browserify.entryFile = 'ncrypt.js';
config.source.browserify.opts = {
    'standalone': 'nCrypt',
    'basedir': path.join('src'),
    'debug': false
};
/* - Destination files */
config.dest = {};
config.dest.destFolder = path.join('bin');
config.dest.destFile = 'ncrypt.js';

gulp.task('browserify', function() {
    var b = browserify([config.source.browserify.entryFile],
                       config.source.browserify.opts);
    var destFolder = config.dest.destFolder;
    var destFile = config.dest.destFile;
    return b.bundle().pipe(source(destFile)).pipe(gulp.dest(destFolder));
});

gulp.task('compress', gulp.series('browserify'), function() {
    //return gulp.src('lib/*.js').pipe(uglify()).pipe(gulp.dest('dist'));
    var sourceFile = path.join(config.dest.destFolder, config.dest.destFile);
    var destFolder = config.dest.destFolder;
    return gulp.src(sourceFile).
    pipe(uglify()).
    pipe(rename({
        extname: '.min.js'
    })).
    pipe(gulp.dest(destFolder));
});

gulp.task('default', gulp.series('browserify', 'compress'));
