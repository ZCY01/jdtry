const gulp = require('gulp')
const watch = require('gulp-watch')
const Bundler = require('parcel-bundler')
const Path = require('path')
const cleanCss = require('gulp-clean-css')
const concat = require('gulp-concat')
const replace = require('gulp-replace')


function watchFile() {
	// watch many files
	watch([
		'manifest.json', '*.html', 'static/*.js', './components/*.vue', './style/*.css'
	], function () {
		exports.default()
	});
}

async function bundleBuild(fileName) {
	let file = Path.join(__dirname, `./${fileName}`)
	let options = {
		outDir: './dist', // 将生成的文件放入输出目录下，默认为 dist
		outFile: fileName, // 输出文件的名称
		publicUrl: './static', // 静态资源的 url ，默认为 dist
		watch: false, // 是否需要监听文件并在发生改变时重新编译它们，默认为 process.env.NODE_ENV !== 'production'
		cache: true, // 启用或禁用缓存，默认为 true
		cacheDir: '.cache', // 存放缓存的目录，默认为 .cache
		minify: (process.env.NODE_ENV === 'production'), // 压缩文件，当 时，会启用
		target: 'browser', // 浏览器/node/electron, 默认为 browser
		https: false, // 服务器文件使用 https 或者 http，默认为 false
		logLevel: (process.env.NODE_ENV === 'production') ? 1 : 3, // 3 = 输出所有内容，2 = 输出警告和错误, 1 = 输出错误
		sourceMaps: (process.env.NODE_ENV != 'production'),
		hmrHostname: '', // 热模块重载的主机名，默认为 ''
		detailedReport: true // 打印 bundles、资源、文件大小和使用时间的详细报告，默认为 false，只有在禁用监听状态时才打印报告
	}
	let bundler = new Bundler(file, options)
	await bundler.bundle()
}

async function buildContentScript() {
	await bundleBuild('static/content-script.js')
	gulp.src([
		'dist/content-script.js',
	])
		.pipe(gulp.dest('build/static'))
	return gulp.src([
		'dist/content-script.css',
		'style/content-script.css',
	])
		.pipe(concat('content-script.css'))
		.pipe(cleanCss())
		.pipe(gulp.dest('build/style'))

}

async function buildPopupScript() {
	await bundleBuild('static/popup.js')
	gulp.src([
		'dist/popup.js',
	])
		.pipe(replace('{{version}}', process.env.VERSION))
		.pipe(gulp.dest('build/static'))
	return gulp.src([
		'dist/popup.css',
		'style/popup.css',
	])
		.pipe(concat('popup.css'))
		.pipe(cleanCss())
		.pipe(gulp.dest('build/style'))
}

async function buildBackgroupScript() {
	await bundleBuild('static/background.js')
	return gulp.src([
		'dist/background.js',
	])
		.pipe(gulp.dest('build/static'))
}


async function moveConfigFile() {
	gulp.src([
		'manifest.json', '*.html'
	])
		.pipe(replace('{{version}}', process.env.VERSION))
		.pipe(gulp.dest('build'))
	return gulp.src([
		'img/*'
	])
		.pipe(gulp.dest('build/img'));
}


exports.default = gulp.series(moveConfigFile, buildContentScript, buildPopupScript, buildBackgroupScript)

exports.dev = gulp.series(watchFile);
