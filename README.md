# grunt-process-includes v0.1.1

> Make use of JSON files to specify your included your JS and CSS files and use this plugin to process this file and automatically generate task setups for grunt-contrib-concat as well as generate an HTML file with the `<script>` or `<link>` include tags.

> The task `generateExpandedJsonFile` will generate a flattened file to be used by the other tasks.

> It will also auto determine which files are coffee and which scss.


## Getting Started
This plugin requires Grunt `~0.4.2`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-process-includes --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-process-includes');
```

*This plugin was designed to work with Grunt 0.4.x. If you're still using grunt v0.3.x it's strongly recommended that [you upgrade](http://gruntjs.com/upgrading-from-0.3-to-0.4), but in case you can't please use [v0.3.2](https://github.com/gruntjs/grunt-contrib-copy/tree/grunt-0.3-stable).*


### Usage Examples

```js
processIncludes: {
	generateExpandedJsonFile: {
		options: {
			task: 'generateExpandedJsonFile',
			includesJsFile: INCLUDES_FILE_JS,
			includesCssFile: INCLUDES_FILE_CSS,
			includedJsSections: SECTIONS_TO_INCLUDE_JS,
			includedCssSections: SECTIONS_TO_INCLUDE_CSS,
			baseCoffeeDir: 'static_source/coffee',
			baseScssDir: 'static_source/scss',
			clonedCoffeeFolder: CLONED_COFFEE_FOLDER,
			clonedScssFolder: CLONED_SCSS_FOLDER,
			compiledJsDir: COMPILED_JS_FOLDER,
			compiledCssDir: COMPILED_CSS_FOLDER,
			jsFilePlaceholders: JS_PLACEHOLDERS,
			cssFilePlaceholders: CSS_PLACEHOLDERS,
			combinedJsFolder: COMBINED_JS_FOLDER,
			combinedCssFolder: COMBINED_CSS_FOLDER,
			minifiedCombinedJsFolder: MINIFIED_COMBINED_JS_FOLDER,
			minifiedCombinedCssFolder: MINIFIED_COMBINED_CSS_FOLDER,
			expandedIncludesJsonFile: EXPANDED_INCLUDES_JSON_FILE,
		}
	},
	cloneCoffeeAndScss: {
		options: {
			task: 'cloneCoffeeAndScss',
		}
	},
	generateMd5IncludeJsHtmlFile: {
		options: {
			task: 'generateMd5IncludeJsHtmlFile',
			useCombinedPath: !commandlineDevMode,
			htmlOutputFilePath: 'views/base/generated_includes_js.gohtml',
		},
	},
	generateMd5IncludeCssHtmlFile: {
		options: {
			task: 'generateMd5IncludeCssHtmlFile',
			useCombinedPath: !commandlineDevMode,
			htmlOutputFilePath: 'views/base/generated_includes_css.gohtml',
		},
	},
	generateCsvOfIncludedFileSizeMap: {
		options: {
			task: 'generateCsvOfIncludedFileSizeMap',
			destinationCsvFilePath: 'static_source/includedFilesSizes.csv',
		}
	}
}
```


#### Example of `includesJsFile`

```json
{
	"sections": [
		{
			"name": "lib",
			"baseDir": "static_source/",
			"fileGroups": [
				{
					"name": "common",
					"files": [
						"libs/jquery/2.0.3/jquery.js",
						"libs/jquery-cookie/1.4.0/jquery.cookie.js",
					]
				}
			]
		},
		{
			"name": "app",
			"baseDir": "static_source/",
			"fileGroups": [
				{
					"name": "beforeModules",
					"files": [
						"coffee/common/proto.coffee",
						"coffee/common/init.coffee",
					]
				}
			]
		}
	]
```

#### Snippet of the file generated and used in the background
```json
{
	"concat_task_setup": {
		"dest_js_lib": {
			"options": {
				"banner": "/*! <%= pkg.name %> <%= grunt.template.today(\"yyyy-mm-dd\") %> */\n",
				"preserveComments": false
			},
			"task_is_js": true,
			"task_is_css": false,
			"task_minified_dest": "static/js/combined.min/lib.js",
			"src": ["static_source/libs/jquery/2.0.3/jquery.js", "static_source/libs/jquery-cookie/1.4.0/jquery.cookie.js"],
			"dest": "static/js/combined/lib.js"
		},
		"dest_js_app": {
			"options": {
				"banner": "/*! <%= pkg.name %> <%= grunt.template.today(\"yyyy-mm-dd\") %> */\n",
				"preserveComments": false
			},
			"task_is_js": true,
			"task_is_css": false,
			"task_minified_dest": "static/js/combined.min/app.js",
			"src": ["static_source/gen_js/common/proto.js", "static_source/gen_js/common/init.js"],
			"dest": "static/js/combined/app.js"
		}
	},
	"loose_files": [{
		"section_name": "lib",
		"group_name": "common",
		"source_file": "static_source/libs/jquery/2.0.3/jquery.js",
		"cloned_path": null,
		"final_path": "static_source/libs/jquery/2.0.3/jquery.js",
		"is_placeholder_file": false,
		"is_js": true,
		"is_css": false,
		"is_coffee": false,
		"is_scss": false,
		"is_preprocessed": false
	}, {
		"section_name": "lib",
		"group_name": "common",
		"source_file": "static_source/libs/jquery-cookie/1.4.0/jquery.cookie.js",
		"cloned_path": null,
		"final_path": "static_source/libs/jquery-cookie/1.4.0/jquery.cookie.js",
		"is_placeholder_file": false,
		"is_js": true,
		"is_css": false,
		"is_coffee": false,
		"is_scss": false,
		"is_preprocessed": false
	}]
}
```
