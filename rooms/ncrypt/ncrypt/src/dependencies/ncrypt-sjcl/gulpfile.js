/* Load dependencies */
var path = require('path');
var fs = require('fs');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var concat = require('gulp-concat');

/* Configuration */
var config = {};
/* - Source files */
config.source = {};
/* -- Browserify options */
/*config.source.browserify = {};
config.source.browserify.entryFile = 'titaniumcore.js';
config.source.browserify.opts = {
    'standalone': 'titaniumcore',
    'basedir': path.join('src')
};*/
/* -- Concat options */
config.source.concat = {};
config.source.concat.includeFiles = [
    /* Files to include in the build, in the order they should be
     * concatenated */
    'sjcl.js',
    'aes.js',
    'bitArray.js',
    'codecString.js', 'codecHex.js', 'codecBase32.js', 'codecBase64.js',
        'codecBytes.js',
    'sha256.js', 'sha512.js', 'sha1.js', 'ripemd160.js',
    'ccm.js', 'gcm.js',
    'hmac.js', 'pbkdf2.js',
    'random.js',
    'convenience.js'
];
config.source.concat.sourceFolder = path.join('src');
/* - Destination files */
config.dest = {};
config.dest.destFolder = path.join('bin');
config.dest.destFile = 'sjcl.js';

var modify = function() {
    var random_js = path.join(config.source.concat.sourceFolder, 'random.js');
    var txt = fs.readFileSync(random_js);
        txt = txt.toString();
    var search = "sjcl.random = new sjcl.prng(6);";
    var ind = txt.indexOf(search);
    if(ind>=0){
        ind += search.length;
        txt = txt.substr(0, ind);
        txt +=
            " /* CHANGE (MODIFICATION - NOT FROM SJCL) for use in 'nCrypt': "+
               "Removed automatically initialising random generator! */ ";
        fs.writeFileSync(random_js, txt, {
            "flag": "w",
            "encoding": "utf8"
        });
    }
    return true;
};

gulp.task('concat', function(){
    modify();

    var destFile = config.dest.destFile;
    var destFolder = config.dest.destFolder;
    var sourceFolder = config.source.concat.sourceFolder;
    var sourceFiles = config.source.concat.includeFiles.slice(0);
    for(var i=0; i<sourceFiles.length; i++){
        sourceFiles[i] = path.join(sourceFolder, sourceFiles[i]);
    }
    return gulp.src(sourceFiles)
    .pipe(concat(destFile))
    .pipe(gulp.dest(destFolder));
});

/*gulp.task('browserify', function() {
    var b = browserify([config.source.browserify.entryFile],
                       config.source.browserify.opts);
    var destFolder = config.dest.destFolder;
    var destFile = config.dest.destFile;
    return b.bundle().pipe(source(destFile)).pipe(gulp.dest(destFolder));
});*/

gulp.task('compress', gulp.series('concat'), function() {
    var sourceFile = path.join(config.dest.destFolder, config.dest.destFile);
    var destFolder = config.dest.destFolder;
    return gulp.src(sourceFile).
    pipe(uglify()).
    pipe(rename({
        extname: '.min.js'
    })).
    pipe(gulp.dest(destFolder));
});

gulp.task('default', gulp.series('concat', 'compress'));
