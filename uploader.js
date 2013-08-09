(function (global, module) {

	"use strict";

	var _this,
		_options,				// option passed to the initializer
		_input,					// file input element - the input tag
		_listeners = {},		// list of all listeners that are created with .bind()
		_files = [],			// file queue
		_processing = false,	// flag: true if a file is in process
		_processIntervalId,		// setInterval id for the file processor

		_el = function (id) {
			return document.getElementById(id);
		},

		_init = function (options) {
			_options = options;
			_input = _el(options.input);
			_input.addEventListener('change', _handleSelectFiles, false);
		},

		_processFiles = function () {
			var file, fileReader;
			if (_files.length > 0) {		// if file queue is not empty
				if (!_processing) {			// if there is no file in process
					_processing = true;
					file = _files[0];	// get the top file from queue
					fileReader = new FileReader();
					fileReader.onloadend = _handleFileLoaded;
					fileReader.readAsDataURL(file);
				}
			} else {
				clearInterval(_processIntervalId);
			}
		},

		_handleSelectFiles = function (e) {
			var i, l,
			files = e.currentTarget.files;

			for (i = 0, l = files.length; i < l; i++) {
				_files.push(files[i]);
			}

			_cleanup();

			_processIntervalId = setInterval(function () {
				_processFiles();
			}, 100);
		},

		_handleFileLoaded = function (e) {
			var dataUrl = e.currentTarget.result,
				imgObj = new Image();

			imgObj.addEventListener('load', _handleImageLoaded, false);
			imgObj.src = dataUrl;
		},

		_handleImageLoaded = function (e) {
			var id = _generateId(),
				file = _files[0],
				thumbDataUrl = _resize(e.currentTarget, 150, 150);

			_trigger('thumbReady', {
				id: id,
				dataUrl: thumbDataUrl
			});

			_upload(id, file);
			_files = _files.slice(1, _files.length);	// file is processed, pop it out from queue
			_processing = false;
		},

		/**
		 * Remove <input> from DOM and recreate it
		 */
		_cleanup = function () {
			var parentNode = _input.parentNode,
				id = _input.getAttribute('id');
			_input.removeEventListener('change', _handleSelectFiles, false);
			_input.parentNode.removeChild(_input);
			_input = document.createElement('input');
			_input.setAttribute('type', 'file');
			_input.setAttribute('multiple', '');
			_input.setAttribute('id', id + '1');
			_input.addEventListener('change', _handleSelectFiles, false);
			parentNode.appendChild(_input);
		},

		_resize = function(imgObj, width, height) {
			var canvas = document.createElement('canvas'),
				context = canvas.getContext('2d'),
				dataUrl,
				scaleX,
				scaleY;

			height = (typeof height === 'undefined') ? imgObj.height / imgObj.width * width : height;
			scaleX = width / imgObj.width;
			scaleY = height / imgObj.height;

			canvas.width = width;
			canvas.height = height;

			if (scaleX > scaleY){
				context.drawImage(imgObj, 0, (height - scaleX * imgObj.height) / 2, imgObj.width * scaleX, imgObj.height * scaleX);
			} else {
				context.drawImage(imgObj, (width - scaleY * imgObj.width) / 2, 0, imgObj.width * scaleY, imgObj.height * scaleY);
			}

			dataUrl = canvas.toDataURL('image/jpeg');
			return dataUrl;
		},

		_bind = function (event, listener){
			if (typeof _listeners[event] === 'undefined') {
				_listeners[event] = [];
			}

			_listeners[event].push(listener);
		},

		_trigger = function (event, data) {
			if (_listeners[event] instanceof Array) {
				var listeners = _listeners[event];
				for (var i = 0, len = listeners.length; i < len; i++) {
					listeners[i].call(this, data);
				}
			}
		},

		_unbind = function (event, listener) {
			if (_listeners[event] instanceof Array) {
				var listeners = _listeners[event];
				for (var i=0, len=listeners.length; i < len; i++) {
					if (listeners[i] === listener) {
						listeners.splice(i, 1);
						break;
					}
				}
			}
		},

		/**
		 * Generate a 16-digit random number
		 */
		_generateId = function() {
			var id;
			// if the number is less than 16-digit long, regenerate
			do {
				id = Math.round(Math.random()*1e16);
			} while (id < 1e15);
			return id;
		},

		_upload = function(id, file) {

			var url = 'upload.php',
				formData = new FormData(),
				xhr = new XMLHttpRequest();

			formData.append('file', file);

			xhr.upload.id = id;
			xhr.id = id;

			xhr.upload.addEventListener("progress", _handleXhrProgress, false);
			xhr.addEventListener("readystatechange", _handleXhrReadyStateChange, false);

			xhr.open('POST', url, true);
			xhr.send(formData);
		},

		_handleXhrProgress = function(e) {

			var progress,
				id = e.currentTarget.id;

			if (e.lengthComputable) {
				progress = Math.round(e.loaded / e.total * 100);

				_trigger('uploadProgress', {	// trigger `thumbCreate` event
					id: id,
					progress: progress
				});
			}
		},

		_handleXhrReadyStateChange = function(e) {
			var id = e.currentTarget.id;
			if (this.readyState === 4) {
				if (this.status === 200) {
					//result = JSON.parse(this.responseText);
					_trigger('uploadSuccess', {	// success: trigger `uploadSuccess` event
						id: id
						//originalFileName: result.originalFileName,
						//storedFileName: result.storedFileName
					});
				} else {
					_trigger('uploadError', {	// error: trigger `uploadError` event
						id: id
					});
				}
			}
		};

	// if already defined before
	if (global.hasOwnProperty(module)) {
		return;
	}

	global[module] = _this = function () {};

	// assign methods to prototype
	_this.prototype.init = _init;
	_this.prototype.bind = _bind;
	_this.prototype.unbind = _unbind;

}(this, 'Uploader'));

/* =========================================================================
 * References:
 * =========================================================================
 * 1. Custom events in JavaScript (by Nicholas C. Zakas)
 *    http://www.nczonline.net/blog/2010/03/09/custom-events-in-javascript/
 */