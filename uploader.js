(function (global) {

	'use strict';

	// if already defined before
	if (global.hasOwnProperty('Uploader')) {
		return;
	}

	var Uploader = function () {
			_instances.push(this);
			this._init();
		},

		_instances = [],

		_el = function (id) {
			return document.getElementById(id);
		},

		/**
		 * Get instance of Uploader class by instance id
		 * @param  {Number}   id Instance id
		 * @return {Uploader}    If found, return the instance
		 *                       Otherwise, return null
		 */
		_getInstance = function(id) {

			var l = _instances.length,
				instance;

			while (l--) {
				instance = _instances[l];
				if (instance._id === id) {
					return instance;
				}
			}

			return null;
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
		};

	global.Uploader = Uploader;

	Uploader.prototype.config = function (options) {
		this._options = options;
		this._input = _el(this._options.input);
		this._input.addEventListener('change', this._handleSelectFiles, false);
		this._cleanup();
	};

	Uploader.prototype._init = function () {
		this._id = _generateId();			// id of this instance
		this._options = null;				// option passed to the initializer
		this._input = null;					// file input element - the input tag
		this._listeners = {};				// list of all listeners that are created with .bind()
		this._files = [];					// file queue
		this._processing = false;			// flag: true if a file is in process
		this._processIntervalId = null;		// setInterval id for the file processor
		this._uids = [];					// queue of ids that are currently in uploading state
	};

	Uploader.prototype._processFiles = function () {
		var file, fileReader;
		if (this._files.length > 0) {		// if file queue is not empty
			if (!this._processing) {			// if there is no file in process
				this._processing = true;
				file = this._files[0];	// get the top file from queue
				fileReader = new FileReader();
				fileReader.uploaderId = this._id;
				fileReader.onloadend = this._handleFileLoaded;
				fileReader.readAsDataURL(file);
			}
		} else {
			clearInterval(this._processIntervalId);
		}
	};

	Uploader.prototype._handleSelectFiles = function (e) {
		var i, l,
			files = e.currentTarget.files,
			uploader = _getInstance(parseInt(this.getAttribute('id').replace('input_', ''), 10));

		for (i = 0, l = files.length; i < l; i++) {
			uploader._files.push(files[i]);
		}

		uploader._cleanup();

		if (uploader._trigger('fileSelect', uploader._files) !== false) {
			uploader._processIntervalId = setInterval(function () {
				uploader._processFiles();
			}, 100);
		}

		// if fileSelect event handler returns false,
		// empty the file queue and don't continue to upload
		else {
			uploader._files = [];
		}
	};

	Uploader.prototype._handleFileLoaded = function (e) {
		var dataUrl = e.currentTarget.result,
			imgObj = new Image(),
			uploader = _getInstance(this.uploaderId);

		imgObj.uploaderId = uploader._id;
		imgObj.addEventListener('load', uploader._handleImageLoaded, false);
		imgObj.src = dataUrl;
	};

	Uploader.prototype._handleImageLoaded = function (e) {
		var uploader = _getInstance(this.uploaderId),
			id = _generateId(),
			file = uploader._files[0],
			thumbDataUrl = _resize(e.currentTarget, uploader._options.thumbWidth, uploader._options.thumbHeight);

		uploader._trigger('thumbReady', {
			id: id,
			dataUrl: thumbDataUrl
		});

		if (uploader._trigger('beforeUpload', { id: id }) !== false) {
			uploader._upload(id, file);
			uploader._files = uploader._files.slice(1, uploader._files.length);	// file is processed, pop it out from queue
			uploader._processing = false;
		}
	};

	/**
	 * Remove <input> from DOM and recreate it
	 */
	Uploader.prototype._cleanup = function () {
		var input = this._input,
			parentNode = input.parentNode;

		input.removeEventListener('change', this._handleSelectFiles, false);
		input.parentNode.removeChild(input);
		input = document.createElement('input');
		input.setAttribute('type', 'file');
		input.setAttribute('multiple', '');
		input.setAttribute('id', 'input_' + this._id);
		input.addEventListener('change', this._handleSelectFiles, false);
		parentNode.appendChild(input);
		this._input = input;
	};

	Uploader.prototype.bind = function (event, listener){
		if (typeof this._listeners[event] === 'undefined') {
			this._listeners[event] = [];
		}

		this._listeners[event].push(listener);
	};

	Uploader.prototype._trigger = function (event, data) {
		if (this._listeners[event] instanceof Array) {
			var listeners = this._listeners[event];
			for (var i = 0, len = listeners.length; i < len; i++) {
				if (typeof data === 'undefined') {
					return listeners[i].call(this);
				} else {
					return listeners[i].call(this, data);
				}
			}
		}
	};

	Uploader.prototype.unbind = function (event, listener) {
		if (this._listeners[event] instanceof Array) {
			var listeners = this._listeners[event];
			for (var i=0, len=listeners.length; i < len; i++) {
				if (listeners[i] === listener) {
					listeners.splice(i, 1);
					break;
				}
			}
		}
	};

	Uploader.prototype._upload = function(id, file) {

		var url = this._options.url,
			formData = new FormData(),
			xhr = new XMLHttpRequest(),
			param;

		// Append user defined params
		for (param in this._options.params) {
			if (this._options.params.hasOwnProperty(param)) {
				formData.append(param, this._options.params[param]);
			}
		}

		// Append the file
		formData.append('file', file);

		xhr.uploaderId = this._id;
		xhr.upload.uploaderId = this._id;
		xhr.upload.id = id;
		xhr.id = id;

		this._uids.push(id); // store the id in queue

		xhr.upload.addEventListener('progress', this._handleXhrProgress, false);
		xhr.addEventListener('readystatechange', this._handleXhrReadyStateChange, false);

		xhr.open('POST', url, true);
		xhr.send(formData);
	};

	Uploader.prototype._handleXhrProgress = function(e) {

		var progress,
			id = e.currentTarget.id,
			uploader = _getInstance(e.currentTarget.uploaderId);

		if (e.lengthComputable) {
			progress = Math.round(e.loaded / e.total * 100);

			uploader._trigger('uploadProgress', {	// trigger `thumbCreate` event
				id: id,
				progress: progress
			});
		}
	};

	Uploader.prototype._handleXhrReadyStateChange = function(e) {

		var id = e.currentTarget.id,
			uploader = _getInstance(e.currentTarget.uploaderId);

		if (this.readyState === 4) {

			uploader._uids = uploader._uids.slice(1, uploader._uids.length);	// upload complete, pop it out from queue

			if (this.status === 200) {
				uploader._trigger('uploadSuccess', {	// success: trigger `uploadSuccess` event
					id: id
				});
			} else {
				uploader._trigger('uploadError', {		// error: trigger `uploadError` event
					id: id
				});
			}

			// If all files are uploaded
			if (uploader._uids.length === 0) {
				uploader._trigger('uploadComplete');	// trigger `uploadComplete` event
			}
		}
	};

}(this));

/* =========================================================================
 * References:
 * =========================================================================
 * 1. Custom events in JavaScript (by Nicholas C. Zakas)
 *    http://www.nczonline.net/blog/2010/03/09/custom-events-in-javascript/
 */