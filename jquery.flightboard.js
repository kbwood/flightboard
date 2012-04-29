/* http://keith-wood.name/flightBoard.html
   Flight Board for jQuery v1.0.0.
   Written by Keith Wood (kbwood{at}iinet.com.au) October 2009.
   Dual licensed under the GPL (http://dev.jquery.com/browser/trunk/jquery/GPL-LICENSE.txt) and 
   MIT (http://dev.jquery.com/browser/trunk/jquery/MIT-LICENSE.txt) licenses. 
   Please attribute the author if you use it. */

/* Flip text like an airline flight board.
   $('div selector').flightboard();
   Or with options like:
   $('div selector').flightboard({speed: 1000});
*/

(function($) { // Hide scope, no $ conflict

/* Flight board manager. */
function FlightBoard() {
	this._defaults = {
		lettersImage: 'img/flightBoardLarge.png', // Amalgamated image for letters background
		lettersSize: [25, 34], // Width and height of individual letters
		lettersSeq: ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', // Positioning of letters within image
		messages: ['SEE THE FLIGHT BOARD', 'CHANGE MESSAGES'], // Messages to display
		maxLength: 20, // Maximum length of flight board
		flips: [3, 5], // Number of flips before new value,
			// may be an array with minimum and maximum flips
		speed: 500, // Time taken (milliseconds) for a single transition
		repeat: true, // True to automatically trigger a new transition after a pause
		pause: 2000, // Time (milliseconds) between transitions
		selection: 'forward', // How to choose the next item to show:
			// 'forward', 'backward', 'random'
		shading: true, // True to add shading effects, false for no effects
		opacity: 0.5, // Maximum opacity (0.0 - 1.0) for highlights and shadows
		// Locations of the highlight/shadow images for IE
		shadingImages: ['img/flightBoardHigh.png', 'img/flightBoardShad.png'],
		beforeFlip: null, // Callback before flipping
		afterFlip: null // Callback after flipping
	};
	this._uuid = new Date().getTime();
};

var PROP_NAME = 'flightBoard';

$.extend(FlightBoard.prototype, {
	/* Class name added to elements to indicate already configured with flight board. */
	markerClassName: 'hasFlightBoard',

	/* Override the default settings for all flight board instances.
	   @param  options  (object) the new settings to use as defaults */
	setDefaults: function(options) {
		extendRemove(this._defaults, options || {});
	},

	/* Attach the flight board functionality to a div.
	   @param  target   (element) the containing division
	   @param  options  (object) the settings for this instance (optional) */
	_attachFlightBoard: function(target, options) {
		target = $(target);
		if (target.hasClass(this.markerClassName)) {
			return;
		}
		$.data(target[0], PROP_NAME,
			$.extend({_current: 0, _next: 0, _anims: []}, this._defaults, options || {}));
		target.addClass(this.markerClassName);
		this._changeFlightBoard(target[0]);
	},

	/* Retrieve the currently visible child of a flight board div.
	   @param  target  (element) the containing division
	   @return  (element) the currently displayed child of target division */
	_currentFlightBoard: function(target) {
		var options = $.data(target, PROP_NAME);
		return ($(target).hasClass(this.markerClassName) ?
			options.messages[options._current] : null);
	},

	/* Retrieve the next visible child of a flight board div.
	   @param  target  (element) the containing division
	   @return  (element) the next to be displayed child of target division */
	_nextFlightBoard: function(target) {
		var options = $.data(target, PROP_NAME);
		return ($(target).hasClass(this.markerClassName) ?
			options.messages[options._next] : null);
	},

	/* Stop the flight board automatically flipping to the next value.
	   @param  target     (element) the containing division
	   @param  timerOnly  (boolean) true if only temporarily stopping (optional) */
	_stopFlightBoard: function(target, timerOnly) {
		var options = $.data(target, PROP_NAME);
		if (options._timer) {
			clearTimeout(options._timer);
			options._timer = null;
		}
		for (var i = 0; i < options._anims.length; i++) {
			options._anims[i].stop().remove();
		}
		if (!timerOnly) {
			this._changeFlightBoard(target, 'repeat', false, true);
		}
	},

	/* Start the flight board automatically flipping to the next value.
	   @param  target  (element) the containing division */
	_startFlightBoard: function(target) {
		this._changeFlightBoard(target, 'repeat', true, true);
	},

	/* Reconfigure the settings for a flight board div.
	   @param  target   (element) the containing division
	   @param  options  (object) the new settings for this instance or
	                    (string) the name of the setting
	   @param  value    (any, optional) the value of the setting */
	_changeFlightBoard: function(target, options, value, dontReset) {
		if (typeof options == 'string') {
			var opts = {};
			opts[options] = value;
			options = opts;
		}
		this._stopFlightBoard(target, true);
		var curOptions = $.data(target, PROP_NAME);
		extendRemove(curOptions, options || {});
		var current = (dontReset ? Math.min(curOptions._current, curOptions.messages.length - 1) : 0);
		$.extend(curOptions, {_current: current, _next: current, _anims: []});
		$.data(target, PROP_NAME, curOptions);
		if (!target.id) {
			target.id = 'fb' + this._uuid++;
		}
		$('#' + target.id + '_css').remove();
		$('<style type="text/css" id="' + target.id + '_css">#' + target.id +
				' span { display: block; float: left; width: ' + curOptions.lettersSize[0] +
				'px; height: ' + curOptions.lettersSize[1] + 'px; background: url(' +
				curOptions.lettersImage + ') center no-repeat; }</style>').
			appendTo('head');
		// Display first message
		var html = '';
		var message = (curOptions.messages[curOptions._current] || '');
		for (var i = 0; i < curOptions.maxLength; i++) {
			html += '<span style="background-position: -' +
				(Math.max(0, curOptions.lettersSeq.indexOf(message.charAt(i) || ' ')) *
				curOptions.lettersSize[0]) + 'px 0px;"></span>';
		}
		$(target).html(html);
		this._prepareFlip(target);
	},

	/* Remove the flight board functionality from a div.
	   @param  target  (element) the containing division */
	_destroyFlightBoard: function(target) {
		target = $(target);
		if (!target.hasClass(this.markerClassName)) {
			return;
		}
		this._stopFlightBoard(target[0]);
		target.removeClass(this.markerClassName).empty();
		$('#' + target.id + '_css').remove();
		$.removeData(target[0], PROP_NAME);
	},

	/* Note current visible child and schedule a repeat rotation (if required).
	   @param  target  (element) the containing division */
	_prepareFlip: function(target) {
		target = $(target);
		var options = $.data(target[0], PROP_NAME);
		options._current = options._next;
		options._next = (options.selection == 'random' ? randInt(options.messages.length) :
			(options.selection == 'backward' ? options._next + options.messages.length - 1 :
			options._next + 1)) % options.messages.length;
		if (options.repeat && !options._timer) {
			options._timer = setTimeout(function() { $.flightboard._flipFlightBoard(target[0]); },
				options.pause);
		}
	},

	/* Flip the flight board to the next value.
	   @param  target    (element) the containing division
	   @param  next      (int) index of next message to show (optional) */
	_flipFlightBoard: function(target, next) {
		this._stopFlightBoard(target, true);
		var options = $.data(target, PROP_NAME);
		if (next != null) {
			if (next >= 0 && next <= options.messages.length) {
				options._next = next;
			}
		}
		options._count = options.maxLength;
		if (options.beforeFlip) {
			options.beforeFlip.apply(target,
				[options.messages[options._current], options.messages[options._next]]);
		}
		options._anims = [];
		var cur = options.messages[options._current];
		var next = options.messages[options._next];
		var offset = $(target).offset();
		var flips = ($.isArray(options.flips) ? options.flips : [options.flips, options.flips]);
		var template = this._charTemplate(options);
		for (var i = 0; i < options.maxLength; i++) {
			var animDiv = template.clone().
				css({left: offset.left + i * options.lettersSize[0], top: offset.top}).
				appendTo('body');
			options._anims.push(animDiv);
			var count = randInt(flips[1] - flips[0] + 1) + flips[0];
			var charSeq = cur.charAt(i) || ' ';
			for (var j = 1; j < count; j++) {
				charSeq += options.lettersSeq.charAt(randInt(options.lettersSeq.length));
			}
			charSeq += next.charAt(i) || ' ';
			var speed = (!isNaN(options.speed) ? options.speed :
				$.fx.speeds[options.speed] || $.fx.speeds._default);
			speed = speed * 0.9 + randInt(speed * 0.2);
			this._flipChar(target, animDiv, options, $('span:eq(' + i + ')', target),
				charSeq, speed);
		}
	},

	/* Create a template for a single character animation.
	   @param  options  (object) the current settings
	   @return  (jQuery) the character template */
	_charTemplate: function(options) {
		var image = options.lettersImage;
		var width = options.lettersSize[0];
		var height = options.lettersSize[1];
		var maxWidth = options.lettersSeq.length * width;
		var controls = '<div style="position: absolute; left: 0px; top: 0px; width: ' +
			width + 'px; height: ' + height + 'px;">' +
			// New top
			'<div class="fbnt" style="position: absolute; width: ' +
			width + 'px; height: ' + (height / 2) + 'px; overflow: hidden;">' +
			'<img src="' + image + '" style="position: relative; left: 0px; width: ' +
			maxWidth + 'px; height: ' + height + 'px; vertical-align: top;"></div>' +
			// Old bottom
			'<div class="fbob" style="position: absolute; top: ' + (height / 2) +
			'px; width: ' + width + 'px; height: ' + (height / 2) + 'px; overflow: hidden;">' +
			'<img src="' + image + '" style="position: relative; left: 0px; top: -' +
			(height / 2) + 'px; width: ' + maxWidth + 'px; height: ' +
			height + 'px; vertical-align: top;"></div>' +
			// Old top
			'<div class="fbot" style="position: absolute; top: 0px; width: ' +
			width + 'px; height: ' + (height / 2) + 'px; overflow: hidden;">' +
			'<img src="' + image + '" style="position: relative; left: 0px; width: ' +
			maxWidth + 'px; height: ' + height + 'px; vertical-align: top;"></div>' +
			// New bottom
			'<div class="fbnb" style="position: absolute; top: ' + (height / 2) +
			'px; width: ' + width + 'px; height: 0px; overflow: hidden;"><img src="' +
			image + '" style="position: relative; left: 0px; top: 0px; width: ' +
			maxWidth + 'px; height: 0px; vertical-align: top;"></div>';
		if (options.shading) {
			controls += ($.browser.msie ? // Shadow
				'<img src="' + options.shadingImages[1] + '"' : '<div') +
				' class="fbsh" style="position: absolute; width: ' + width +
				'px; background-color: black; opacity: ' + options.opacity +
				'; filter: alpha(opacity=' + (options.opacity * 100) + ');"' +
				($.browser.msie ? '/>' : '></div>') +
				($.browser.msie ? // Highlight
				'<img src="' + options.shadingImages[0] + '"' : '<div') +
				' class="fbhi" style="position: absolute; top: ' + (height / 2) + 'px; width: ' +
				width + 'px; height: 0px; background-color: white; opacity: ' +
				options.opacity + '; filter: alpha(opacity=' + (options.opacity * 100) + ');"' +
				($.browser.msie ? '/>' : '></div>');
		}
		return $(controls + '</div>');
	},

	/* Monitor character animations and continue after all are complete.
	   @param  target  (element)  the containing division */
	_finishedChar: function(target) {
		var options = $.data(target, PROP_NAME);
		options._count--;
		if (options._count == 0) {
			var lastFlip = [options.messages[options._current], options.messages[options._next]];
			this._prepareFlip(target);
			if (options.afterFlip) {
				options.afterFlip.apply(target, lastFlip);
			}
		}
	},

	/* Flip a single letter through a series of changes.
	   @param  target    (element) the containing division
	   @param  animDiv   (jQuery) controls for a single character animation
	   @param  options   (object) the current settings
	   @param  charSpan  (number) the span for the character in the message
	   @param  charSeq   (string) the letters to flip through
	   @param  speed     (number) the speed of the animation */
	_flipChar: function(target, animDiv, options, charSpan, charSeq, speed) {
		if (charSeq.length < 2) {
			animDiv.remove();
			$.removeData(animDiv[0], PROP_NAME);
			$.flightboard._finishedChar(target);
			return;
		}
		var width = options.lettersSize[0];
		var fromIndex = options.lettersSeq.indexOf(charSeq.charAt(0));
		var toIndex = options.lettersSeq.indexOf(charSeq.charAt(1));
		var elem = animDiv[0].firstChild;
		$(elem.firstChild).css('left', -toIndex * width); // New top
		elem = elem.nextSibling;
		$(elem.firstChild).css('left', -fromIndex * width); // Old bottom
		elem = elem.nextSibling;
		$(elem.firstChild).css('left', -fromIndex * width); // Old top
		elem = elem.nextSibling;
		$(elem).css('height', 0); // New bottom
		$(elem.firstChild).css('left', -toIndex * width);
		$.data(animDiv[0], PROP_NAME, {span: charSpan, offset: -toIndex * width});
		animDiv.animate({fbHeight: 1}, speed, function() {
				$.flightboard._flipChar(target, animDiv, options,
					charSpan, charSeq.substring(1), speed);
			});
	},

	/* Define the animation elements and attributes.
	   @param  cont  (jQuery) the elements' container */
	_getStepProps: function(cont) {
		var stepProps = [];
		var height = $(cont).height();
		var children = cont.children || cont.childNodes;
		var adjustment = ($.browser.mozilla ? 0 : 1);
		stepProps[0] = {elem: children[2], first: true, props: {
			top: {start: 0, diff: height, units: 'px', min: -999999},
			height: {start: height / 2 + adjustment, diff: -height, units: 'px', min: 0}}};
		stepProps[1] = {elem: children[2].firstChild, first: true, props: {
			height: {start: height, diff: -2 * height, units: 'px', min: 0}}};
		stepProps[2] = {elem: children[3], first: false, props: {
			height: {start: -height / 2, diff: height, units: 'px', min: 0}}};
		stepProps[3] = {elem: children[3].firstChild, first: false, props: {
			top: {start: height / 2, diff: -height, units: 'px', min: -999999},
			height: {start: -height, diff: 2 * height, units: 'px', min: 0}}};
		if (children.length > 4) {
			var opacity = parseFloat($(children[4]).css('opacity'));
			stepProps[4] = {elem: children[4], first: true, props: {
				top: {start: 0, diff: height, units: 'px', min: -999999},
				height: {start: height / 2 + adjustment, diff: -height, units: 'px', min: 0},
				opacity: {start: 0, diff: 2 * opacity, units: '', min: 0}}};
			stepProps[5] = {elem: children[5], first: false, props: {
				height: {start: -height / 2, diff: height, units: 'px', min: 0},
				opacity: {start: 2 * opacity, diff: -2 * opacity, units: '', min: 0}}};
		}
		return stepProps;
	}
});

/* Get a random number.
   @param  range  (number) the maximum value
   @return  (number) random value 0 <= x < range */
function randInt(range) {
	return Math.floor(Math.random() * range);
}

/* Custom animation step for the flight board to synchronise components.
   @param  fx  (object) the animation definition */
$.fx.step['fbHeight'] = function(fx) {
	if (!fx.stepProps) { // Initialisation
		fx.stepProps = $.flightboard._getStepProps(fx.elem);
		fx.first = true;
	}

	for (var i = 0; i < fx.stepProps.length; i++) { // Update all components
		var comp = fx.stepProps[i];
		if (fx.first == comp.first) {
			for (var name in comp.props) { // Update all properties
				var prop = comp.props[name];
				comp.elem.style[name] =
					Math.max(fx.pos * prop.diff + prop.start, prop.min) + prop.units;
				if ($.browser.msie && name == 'opacity') {
					comp.elem.style.filter = 'alpha(opacity=' +
						(Math.max(fx.pos * prop.diff + prop.start, prop.min) * 100) + ')';
				}
			}
		}
	}

	if (fx.first && fx.pos >= 0.5) {
		fx.first = false; // Second half
	}

	if (fx.state == 1) { // Tidy up afterwards
		var data = $.data(fx.elem, PROP_NAME);
		if (data) {
			data.span.css('background-position', data.offset + 'px 0px');
		}
	}
};

/* jQuery extend now ignores nulls!
   @param  target  (object) the object to extend
   @param  props   (object) the attributes to modify
   @return  (object) the updated target */
function extendRemove(target, props) {
	$.extend(target, props);
	for (var name in props) {
		if (props[name] == null) {
			target[name] = null;
		}
	}
	return target;
}

/* Attach the flight board functionality to a jQuery selection.
   @param  command  (string) the command to run (optional, default 'attach')
   @param  options  (object) the new settings to use for these instances
   @return  (jQuery) for chaining further calls */
$.fn.flightboard = function(options) {
	var otherArgs = Array.prototype.slice.call(arguments, 1);
	if (options == 'current' || options == 'next') {
		return $.flightboard['_' + options + 'FlightBoard'].
			apply($.flightboard, [this[0]].concat(otherArgs));
	}
	return this.each(function() {
		if (typeof options == 'string') {
			$.flightboard['_' + options + 'FlightBoard'].
				apply($.flightboard, [this].concat(otherArgs));
		}
		else {
			$.flightboard._attachFlightBoard(this, options);
		}
	});
};

/* Initialise the flight board functionality. */
$.flightboard = new FlightBoard(); // singleton instance

})(jQuery);
