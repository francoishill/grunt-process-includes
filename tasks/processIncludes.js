/*
 * processIncludes
 * https://github.com/Francois/grunt-process-includes
 *
 * Copyright (c) 2014 Francois Hill
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {
	var path = require('path');
	var fs = require('fs');
	var crypto = require('crypto');

	function getFileMd5(filePath) {
		if (fs === null) fs = require('fs');
		if (crypto === null) crypto = require('crypto');
		var fileContent = String(fs.readFileSync(filePath));
		return crypto.createHash('md5').update(fileContent).digest("hex");
	}

	function endsWith(str, suffix) {
		if (!str || str.length < suffix.length)
			return false;
		return str.substr(str.length - suffix.length).toLowerCase() === suffix.toLowerCase();
	}

	function changeFileExtension(filePath, newFileExt) {
		var indexOfDot = filePath.lastIndexOf('.');
		if (newFileExt[0] !== '.')
			newFileExt = '.' + newFileExt;
		return filePath.substr(0, indexOfDot) + newFileExt;
	}

	function ensureNoStartingSlash(filePath) {
		var filePathToUse = filePath;
		while (filePathToUse.length > 0 && filePathToUse[0] === '/')
			filePathToUse = filePathToUse.substr(1);
		return filePathToUse;
	}


	function sectionIsIncluded(includedSections, sectionName) {
		if (!includedSections)
			return true;

		var inclSecs = includedSections;
		for (var i = 0; i < inclSecs.length; i++) {
			if (inclSecs[i].toLowerCase() === sectionName.toLowerCase())
				return true;
		}

		return false;
	}

	function replaceFileNameIfOneOfPlaceholders(fileName, placeHolders) {
		if (!fileName || !placeHolders)
			return fileName;
		for (var placeholder in placeHolders) {
			if (!placeHolders.hasOwnProperty(placeholder)) continue;

			if (fileName.trim().toLowerCase() === placeholder.trim().toLowerCase()
				|| endsWith(fileName.trim().toLowerCase(), placeholder.trim().toLowerCase()))
				return placeHolders[placeholder];
		}
		return fileName;
	}

	function extractRelativePathToBaseDir(filePath, baseDir) {
		if (filePath.length < baseDir.length
			|| filePath.substr(0, baseDir.length).toLowerCase() !== baseDir.toLowerCase())
			throw grunt.util.error('Unexpected file path for file: ' + filePath + ', expecting to start with: ' + baseDir);

		return filePath.substr(baseDir.length);
	}

	//Example of transformBaseExtension is '.scss' and example of transformDestExtension='.css'
	//Example of transformBaseDir is baseScssDir and transformDestDir is compiledCssDir
	function changeFilePathToDestination(sourceFilePath, transformBaseExtension, transformDestExtension, transformBaseDir, transformDestDir, uniquePlaceholderReplacements) {
		var filePathToUse = sourceFilePath;
		if (path.extname(sourceFilePath) === transformBaseExtension) {
			var relativePathToBaseFolder = extractRelativePathToBaseDir(sourceFilePath, transformBaseDir);

			var generatedCssFilePath = transformDestDir + relativePathToBaseFolder;
			filePathToUse = changeFileExtension(generatedCssFilePath, transformDestExtension);
		}

		filePathToUse = replaceFileNameIfOneOfPlaceholders(filePathToUse, uniquePlaceholderReplacements);
		return filePathToUse;
	}

	function foreachNestedIncludeFileFromJsonIncludes(jsonFilePath, includedSections, functionOnSectionGroupAndFile) {
		var jsonObj = grunt.file.readJSON(jsonFilePath);

		var sections = jsonObj.sections;
		for (var i = 0; i < sections.length; i++) {
			var sectionName = sections[i].name;
			if (!sectionIsIncluded(includedSections, sectionName)) {
				grunt.log.writeln("Non-included section skipped: " + sectionName);
				continue;
			}

			var sectionBaseDir = sections[i].baseDir;
			var sectionSrcFileGroups = sections[i].fileGroups;

			for (var j = 0; j < sectionSrcFileGroups.length; j++) {
				var groupName = sectionSrcFileGroups[j].name;
				var filesInGroup = sectionSrcFileGroups[j].files;

				for (var k = 0; k < filesInGroup.length; k++) {
					functionOnSectionGroupAndFile(sectionName, groupName, sectionBaseDir + filesInGroup[k]);
				}
			}
		}
	}

	function foreachSectionWithFlattenedFilesFromJsonIncludes(jsonFilePath, includedSections, functionOnSectionAndFilesArray) {
		var jsonObj = grunt.file.readJSON(jsonFilePath);

		var sections = jsonObj.sections;
		for (var i = 0; i < sections.length; i++) {
			var sectionName = sections[i].name;
			if (!sectionIsIncluded(includedSections, sectionName)) {
				grunt.log.writeln("Non-included section skipped: " + sectionName);
				continue;
			}

			var sectionBaseDir = sections[i].baseDir;
			var sectionSrcFileGroups = sections[i].fileGroups;

			var flatListOfAllFilesInSection = [];
			for (var j = 0; j < sectionSrcFileGroups.length; j++) {
				var filesInGroup = sectionSrcFileGroups[j].files;
				for (var k = 0; k < filesInGroup.length; k++) {
					flatListOfAllFilesInSection.push(sectionBaseDir + filesInGroup[k]);
				}
			}
			functionOnSectionAndFilesArray(sectionName, flatListOfAllFilesInSection);
		}
	}

	function foreachSectionFromJsonIncludes(jsonFilePath, includedSections, functionOnSection) {
		var jsonObj = grunt.file.readJSON(jsonFilePath);

		var sections = jsonObj.sections;
		for (var i = 0; i < sections.length; i++) {
			var sectionName = sections[i].name;
			if (!sectionIsIncluded(includedSections, sectionName)) {
				grunt.log.writeln("Non-included section skipped: " + sectionName);
				continue;
			}
			functionOnSection(sectionName);
		}
	}

	function foreachConcatTaskSetupObj(jsonObj, funcOnConcatTaskSetupObj) {
		for (var concatTask in jsonObj.concat_task_setup) {
			if (concatTask.hasOwnProperty(concatTask))
				continue;
			funcOnConcatTaskSetupObj(jsonObj.concat_task_setup[concatTask]);
		}
	}

	function foreachLooseFileObj(jsonObj, funcOnFileObj) {
		for (var i = 0; i < jsonObj.loose_files.length; i++) {
			funcOnFileObj(jsonObj.loose_files[i]);
		}
	}

	function generateHtmlScriptTagFromJsFile(jsFilePath) {
		var pathWithMd5 = '/' + jsFilePath + '?' + getFileMd5(jsFilePath);
		return '<script src="' + pathWithMd5 + '"></script>\n';
	}

	function generateHtmlLinkTagFromJsFile(cssFilePath) {
		var pathWithMd5 = '/' + cssFilePath + '?' + getFileMd5(cssFilePath);
		return '<link rel="stylesheet" href="' + pathWithMd5 + '">\n';
	}

	function ensureTaskIsAllowed(taskName) {
		var ALLOWED_TASKS = [
			'generateExpandedJsonFile',
			'cloneCoffeeAndScss',
			'generateMd5IncludeJsHtmlFile',
			'generateMd5IncludeCssHtmlFile',
			'generateCsvOfIncludedFileSizeMap',
		];

		for (var i = 0; i < ALLOWED_TASKS.length; i++) {
			if (taskName === ALLOWED_TASKS[i])
				return;
		}

		var csvAllowedTasks = ALLOWED_TASKS.join();
		throw grunt.util.error('Invalid options.task, allowed values are ' + csvAllowedTasks + '.');
	}

	grunt.registerMultiTask('processIncludes', 'The best Grunt plugin ever.', function () {
		// Merge task-specific and/or target-specific options with these defaults.
		var options = this.options({});

		if (options.task === undefined)
			throw grunt.util.error('Please specify options.task');
		var task = options.task;

		ensureTaskIsAllowed(task);

		if (task === 'generateExpandedJsonFile') {
			if (options.includesJsFiles === undefined)
				throw grunt.util.error('Please specify options.includesJsFiles');
			if (options.includesCssFiles === undefined)
				throw grunt.util.error('Please specify options.includesCssFiles');
			if (options.includedJsSections === undefined)
				throw grunt.util.error('Please specify options.includedJsSections');
			if (options.includedCssSections === undefined)
				throw grunt.util.error('Please specify options.includedCssSections');
			if (options.baseCoffeeDir === undefined)
				throw grunt.util.error('Please specify options.baseCoffeeDir');
			if (options.baseScssDir === undefined)
				throw grunt.util.error('Please specify options.baseScssDir');
			if (options.clonedCoffeeFolder === undefined)
				throw grunt.util.error('Please specify options.clonedCoffeeFolder');
			if (options.clonedScssFolder === undefined)
				throw grunt.util.error('Please specify options.clonedScssFolder');
			if (options.compiledJsDir === undefined)
				throw grunt.util.error('Please specify options.compiledJsDir');
			if (options.compiledCssDir === undefined)
				throw grunt.util.error('Please specify options.compiledCssDir');
			if (options.jsFilePlaceholders === undefined)
				throw grunt.util.error('Please specify options.jsFilePlaceholders');
			if (options.cssFilePlaceholders === undefined)
				throw grunt.util.error('Please specify options.cssFilePlaceholders');
			if (options.combinedJsFolder === undefined)
				throw grunt.util.error('Please specify options.combinedJsFolder');
			if (options.combinedCssFolder === undefined)
				throw grunt.util.error('Please specify options.combinedCssFolder');
			if (options.minifiedCombinedJsFolder === undefined)
				throw grunt.util.error('Please specify options.minifiedCombinedJsFolder');
			if (options.minifiedCombinedCssFolder === undefined)
				throw grunt.util.error('Please specify options.minifiedCombinedCssFolder');
			if (options.expandedIncludesJsonFile === undefined)
				throw grunt.util.error('Please specify options.expandedIncludesJsonFile');

			var concatTaskSetup = {};
			var looseFiles = [];

			for (var i = 0; i < options.includesJsFiles.length; i++) {
				foreachNestedIncludeFileFromJsonIncludes(options.includesJsFiles[i], options.includedJsSections, function(sectionName, groupName, sourceFilePath) {
					var clonedDestinationPath = null;
					var finalDestinationPath = null;
					var isCoffee = null;
					var isPreprocessed = null;
					if (path.extname(sourceFilePath) === '.coffee') {
						var relativePathToBaseFolder = extractRelativePathToBaseDir(sourceFilePath, options.baseCoffeeDir);

						clonedDestinationPath = options.clonedCoffeeFolder + relativePathToBaseFolder;

						var compiledFilePath = options.compiledJsDir + relativePathToBaseFolder;
						finalDestinationPath = changeFileExtension(compiledFilePath, '.js');

						isCoffee = true;
						isPreprocessed = true;
					} else {
						finalDestinationPath = sourceFilePath;
						isCoffee = false;
						isPreprocessed = false;
					}

					var tmpBeforePlaceholderReplacement = finalDestinationPath;
					finalDestinationPath = replaceFileNameIfOneOfPlaceholders(finalDestinationPath, options.jsFilePlaceholders);

					var isPlaceholderFile = tmpBeforePlaceholderReplacement !== finalDestinationPath;

					var concatTaskName = 'dest_js_' + sectionName;
					if (!concatTaskSetup[concatTaskName])
						concatTaskSetup[concatTaskName] = {
							options: {
								banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
								preserveComments: false,
								nonull: true,
							},
							task_is_js: true,//Used by our task and not concat
							task_is_css: false,//Used by our task and not concat
							task_minified_dest: options.minifiedCombinedJsFolder + '/' + sectionName + '.js',//Used by our task and not concat
							src: [],
							dest: options.combinedJsFolder + '/' + sectionName + '.js',
						}
					concatTaskSetup[concatTaskName].src.push(finalDestinationPath);

					looseFiles.push({
						section_name: sectionName,
						group_name: groupName,
						source_file: sourceFilePath,
						cloned_path: clonedDestinationPath,
						final_path: finalDestinationPath,
						is_placeholder_file: isPlaceholderFile,
						is_js: true,
						is_css: false,
						is_coffee: isCoffee,
						is_scss: false,
						is_preprocessed: isPreprocessed,
					});
				});
			}

			for (var i = 0; i < options.includesCssFiles.length; i++) {
				foreachNestedIncludeFileFromJsonIncludes(options.includesCssFiles[i], options.includedCssSections, function(sectionName, groupName, sourceFilePath) {
					var clonedDestinationPath = null;
					var finalDestinationPath = null;
					var isScss = null;
					var isPreprocessed = null;
					if (path.extname(sourceFilePath) === '.scss') {
						var relativePathToBaseFolder = extractRelativePathToBaseDir(sourceFilePath, options.baseScssDir);

						clonedDestinationPath = options.clonedScssFolder + relativePathToBaseFolder;

						var compiledFilePath = options.compiledCssDir + relativePathToBaseFolder;
						finalDestinationPath = changeFileExtension(compiledFilePath, '.css');

						isScss = true;
						isPreprocessed = true;
					} else {
						finalDestinationPath = sourceFilePath;
						isScss = false;
						isPreprocessed = false;
					}

					var tmpBeforePlaceholderReplacement = finalDestinationPath;
					finalDestinationPath = replaceFileNameIfOneOfPlaceholders(finalDestinationPath, options.CssFilePlaceholders);

					var isPlaceholderFile = tmpBeforePlaceholderReplacement !== finalDestinationPath;

					var concatTaskName = 'dest_css_' + sectionName;
					if (!concatTaskSetup[concatTaskName])
						concatTaskSetup[concatTaskName] = {
							options: {
								banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
								preserveComments: false,
								nonull: true,
							},
							task_is_js: false,//Used by our task and not concat
							task_is_css: true,//Used by our task and not concat
							task_minified_dest: options.minifiedCombinedCssFolder + '/' + sectionName + '.css',//Used by our task and not concat
							src: [],
							dest: options.combinedCssFolder + '/' + sectionName + '.css',
						}
					concatTaskSetup[concatTaskName].src.push(finalDestinationPath);

					looseFiles.push({
						section_name: sectionName,
						group_name: groupName,
						source_file: sourceFilePath,
						cloned_path: clonedDestinationPath,
						final_path: finalDestinationPath,
						is_placeholder_file: isPlaceholderFile,
						is_js: false,
						is_css: true,
						is_coffee: false,
						is_scss: isScss,
						is_preprocessed: isPreprocessed,
					});
				});
			}

			var fileJsonObject = {
				concat_task_setup: concatTaskSetup,
				loose_files: looseFiles,
			};
			grunt.file.write(options.expandedIncludesJsonFile, JSON.stringify(fileJsonObject));
		}

		if (task === 'cloneCoffeeAndScss') {
			if (options.expandedIncludesJsonObject === undefined)
				throw grunt.util.error('Please specify options.expandedIncludesJsonObject');

			foreachLooseFileObj(options.expandedIncludesJsonObject, function(fileObj) {
				if (fileObj.is_coffee || fileObj.is_scss) {
					if (!fileObj.cloned_path)
						throw grunt.util.error('Undefined cloned_path for fileObj: ' + JSON.stringify(fileObj));

					grunt.file.copy(fileObj.source_file, fileObj.cloned_path);
				}
			});
		}

		if (task === 'generateMd5IncludeJsHtmlFile') {
			if (options.expandedIncludesJsonObject === undefined)
				throw grunt.util.error('Please specify options.expandedIncludesJsonObject');
			if (options.useCombinedPath === undefined)
				throw grunt.util.error('Please specify options.useCombinedPath');
			if (options.htmlOutputFilePath === undefined)
				throw grunt.util.error('Please specify options.htmlOutputFilePath');

			var htmlFileContent = '';
			if (options.useCombinedPath) {
				foreachConcatTaskSetupObj(options.expandedIncludesJsonObject, function(concatTaskSetupObj) {
					if (!concatTaskSetupObj.task_is_js)
						return;
					htmlFileContent += generateHtmlScriptTagFromJsFile(concatTaskSetupObj.task_minified_dest);
				});
			} else {
				foreachLooseFileObj(options.expandedIncludesJsonObject, function(fileObj) {
					if (!fileObj.is_js)
						return;
					htmlFileContent += generateHtmlScriptTagFromJsFile(fileObj.final_path);
				});
			}

			grunt.file.write(options.htmlOutputFilePath, htmlFileContent);
		}

		if (task === 'generateMd5IncludeCssHtmlFile') {
			if (options.expandedIncludesJsonObject === undefined)
				throw grunt.util.error('Please specify options.expandedIncludesJsonObject');
			if (options.useCombinedPath === undefined)
				throw grunt.util.error('Please specify options.useCombinedPath');
			if (options.htmlOutputFilePath === undefined)
				throw grunt.util.error('Please specify options.htmlOutputFilePath');

			var htmlFileContent = '';
			if (options.useCombinedPath) {
				foreachConcatTaskSetupObj(options.expandedIncludesJsonObject, function(concatTaskSetupObj) {
					if (!concatTaskSetupObj.task_is_css)
						return;
					htmlFileContent += generateHtmlLinkTagFromJsFile(concatTaskSetupObj.task_minified_dest);
				});
			} else {
				foreachLooseFileObj(options.expandedIncludesJsonObject, function(fileObj) {
					if (!fileObj.is_css)
						return;
					htmlFileContent += generateHtmlLinkTagFromJsFile(fileObj.final_path);
				});
			}

			grunt.file.write(options.htmlOutputFilePath, htmlFileContent);
		}

		if (task === 'generateCsvOfIncludedFileSizeMap') {
			if (options.expandedIncludesJsonObject === undefined)
				throw grunt.util.error('Please specify options.expandedIncludesJsonObject');
			if (options.destinationCsvFilePath === undefined)
				throw grunt.util.error('Please specify options.destinationCsvFilePath');

			var tmpFileSizeMap = [];//Format of each object it contains, FileRelativePath, FileSize
			foreachLooseFileObj(options.expandedIncludesJsonObject, function(fileObj) {
				tmpFileSizeMap.push({
					FileRelativePath: fileObj.final_path,
					FileSize: String(fs.readFileSync(fileObj.final_path)).length
				});
			});

			var resultCSVofFileSizeMap = "FileRelativePath,FileSize\n";
			var totalSize = 0;
			for (var i = 0; i < tmpFileSizeMap.length; i++) {
				resultCSVofFileSizeMap += tmpFileSizeMap[i].FileRelativePath + "," + tmpFileSizeMap[i].FileSize;
				resultCSVofFileSizeMap += "\n";
				totalSize += tmpFileSizeMap[i].FileSize;
			}
			resultCSVofFileSizeMap += "--------------," + "------\n";
			resultCSVofFileSizeMap += "TOTAL SIZE (bytes)," + totalSize + "\n";
			resultCSVofFileSizeMap += "TOTAL SIZE (kB)," + Math.round(totalSize/1024) + "\n";
			resultCSVofFileSizeMap += "TOTAL SIZE (MB)," + (Math.round(100*totalSize/(1024*1024)))/100 + "\n";
			grunt.file.write(options.destinationCsvFilePath, resultCSVofFileSizeMap);
		}
	});

};
