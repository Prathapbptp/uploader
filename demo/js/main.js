/* global $, Uploader */

(function() {
	
	'use strict';

	var uploader = new Uploader(),

		onThumbReady = function (thumb) {
			$('#container').append(
				'<li>' +
				'	<div class="thumb" id="thumb_' + thumb.id + '">' +
				'		<img src="' + thumb.dataUrl + '" />' +
				'		<div class="progress">' +
				'			<span></span>' +
				'		</div>' +
				'		<div class="result_icon"></div>' +
				'	</div>' +
				'</li>'
			);
		},

		onUploadProgress = function (upload) {
			$('#thumb_' + upload.id + ' .progress span').css('width', upload.progress + '%');
		},

		onUploadSuccess = function (upload) {
			$('#thumb_' + upload.id + ' .result_icon').addClass('success');
			$('#thumb_' + upload.id + ' .progress').remove();
		},

		onUploadError = function (upload) {
			$('#thumb_' + upload.id + ' .result_icon').addClass('error');
			$('#thumb_' + upload.id + ' .progress').remove();
		};
	
	uploader.bind('thumbReady', onThumbReady);
	uploader.bind('uploadProgress', onUploadProgress);
	uploader.bind('uploadSuccess', onUploadSuccess);
	uploader.bind('uploadError', onUploadError);

	uploader.config({
		input: 'fileInput',
		thumbWidth: 150,
		thumbHeight: 150,
		url: 'upload.php'
	});
	
}());
