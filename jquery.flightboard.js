/* http://keith-wood.name/flightBoard.html
   Flight Board for jQuery v1.1.1.
   Written by Keith Wood (kbwood{at}iinet.com.au) October 2009.
   Available under the MIT (https://github.com/jquery/jquery/blob/master/MIT-LICENSE.txt) license. 
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
		sequential: false, // True to step through all letters, false for random ones
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
}

$.extend(FlightBoard.prototype, {
	/* Class name added to elements to indicate already configured with flight board. */
	markerClassName: 'hasFlightBoard',
	/* Name of the data property for instance settings. */
	propertyName: 'flightBoard',

	/* Override the default settings for all flight board instances.
	   @param  options  (object) the new settings to use as defaults
	   @return  (FlightBoard) this object */
	setDefaults: function(options) {
		$.extend(this._defaults, options || {});
		return this;
	},

	/* Attach the flight board functionality to a div.
	   @param  target   (element) the containing division
	   @param  options  (object) the settings for this instance (optional) */
	_attachPlugin: function(target, options) {
		target = $(target);
		if (target.hasClass(this.markerClassName)) {
			return;
		}
		var inst = {_current: 0, _next: 0, _anims: [],
			options: $.extend({}, this._defaults, options || {})};
		target.addClass(this.markerClassName).data(this.propertyName, inst);
		this._optionPlugin(target, options);
	},

	/* Retrieve or reconfigure the settings for a max length control.
	   @param  target     (element) the control to affect
	   @param  options    (object) the new options for this instance or
	                      (string) an individual property name
	   @param  value      (any) the individual property value (omit if options
	                      is an object or to retrieve the value of a setting)
	   @param  dontReset  (boolean, internal) true to not reset the current message
	   @return  (any) if retrieving a value */
	_optionPlugin: function(target, options, value, dontReset) {
		target = $(target);
		if (!options || (typeof options == 'string' && value == null)) { // Get option
			var inst = target.data(this.propertyName);
			var name = options;
			options = (inst || {}).options;
			return (options && name ? options[name] : options);
		}

		if (!target.hasClass(this.markerClassName)) {
			return;
		}
		options = options || {};
		if (typeof options == 'string') {
			var name = options;
			options = {};
			options[name] = value;
		}
		this._stopPlugin(target[0], true);
		var inst = target.data(this.propertyName);
		$.extend(inst.options, options);
		var current = (dontReset ? Math.min(inst._current, inst.options.messages.length - 1) : 0);
		$.extend(inst, {_current: current, _next: current, _anims: []});
		if (!target[0].id) {
			target[0].id = 'fb' + this._uuid++;
		}
		$('#' + target[0].id + '_css').remove();
		$('<style type="text/css" id="' + target[0].id + '_css">#' + target[0].id +
				' span { display: block; float: left; width: ' + inst.options.lettersSize[0] +
				'px; height: ' + inst.options.lettersSize[1] + 'px; background: url(' +
				inst.options.lettersImage + ') center no-repeat; }</style>').
			appendTo('head');
		// Display first message
		var html = '';
		var message = (inst.options.messages[inst._current] || '');
		for (var i = 0; i < inst.options.maxLength; i++) {
			html += '<span style="background-position: -' +
				(Math.max(0, inst.options.lettersSeq.indexOf(message.charAt(i) || ' ')) *
				inst.options.lettersSize[0]) + 'px 0px;"></span>';
		}
		target.html(html);
		this._prepareFlip(target[0]);
	},

	/* Remove the flight board functionality from a div.
	   @param  target  (element) the containing division */
	_destroyPlugin: function(target) {
		target = $(target);
		if (!target.hasClass(this.markerClassName)) {
			return;
		}
		this._stopPlugin(target[0]);
		target.removeClass(this.markerClassName).empty().removeData(this.propertyName);
		$('#' + target[0].id + '_css').remove();
	},

	/* Retrieve the currently visible child of a flight board div.
	   @param  target  (element) the containing division
	   @return  (element) the currently displayed child of target division */
	_currentPlugin: function(target) {
		target = $(target);
		var inst = target.data(this.propertyName);
		return (target.hasClass(this.markerClassName) ?
			inst.options.messages[inst._current] : null);
	},

	/* Retrieve the next visible child of a flight board div.
	   @param  target  (element) the containing division
	   @return  (element) the next to be displayed child of target division */
	_nextPlugin: function(target) {
		target = $(target);
		var inst = target.data(this.propertyName);
		return (target.hasClass(this.markerClassName) ?
			inst.options.messages[inst._next] : null);
	},

	/* Stop the flight board automatically flipping to the next value.
	   @param  target     (element) the containing division
	   @param  timerOnly  (boolean) true if only temporarily stopping (optional) */
	_stopPlugin: function(target, timerOnly) {
		target = $(target);
		var inst = target.data(this.propertyName);
		if (inst._timer) {
			clearTimeout(inst._timer);
			inst._timer = null;
		}
		for (var i = 0; i < inst._anims.length; i++) {
			inst._anims[i].stop().remove();
		}
		if (!timerOnly) {
			this._optionPlugin(target[0], 'repeat', false, true);
		}
	},

	/* Start the flight board automatically flipping to the next value.
	   @param  target  (element) the containing division */
	_startPlugin: function(target) {
		this._optionPlugin(target, 'repeat', true, true);
	},

	/* Note current visible child and schedule a repeat rotation (if required).
	   @param  target  (element) the containing division */
	_prepareFlip: function(target) {
		target = $(target);
		var inst = target.data(this.propertyName);
		inst._current = inst._next;
		inst._next = (inst.options.selection == 'random' ? randInt(inst.options.messages.length - 1) :
			(inst.options.selection == 'backward' ? inst._next + inst.options.messages.length - 1 :
			inst._next + 1)) % inst.options.messages.length;
		inst._next = (inst.options.selection == 'random' && inst._next == inst._current ?
			inst.options.messages.length - 1 : inst._next);
		if (inst.options.repeat && !inst._timer) {
			inst._timer = setTimeout(function() { plugin._flipPlugin(target[0]); },
				inst.options.pause);
		}
	},

	/* Flip the flight board to the next value.
	   @param  target    (element) the containing division
	   @param  next      (int) index of next message to show (optional) */
	_flipPlugin: function(target, next) {
		this._stopPlugin(target, true);
		var inst = $.data(target, this.propertyName);
		if (next != null) {
			if (next >= 0 && next <= inst.options.messages.length) {
				inst._next = next;
			}
		}
		inst._count = inst.options.maxLength;
		if (inst.options.beforeFlip) {
			inst.options.beforeFlip.apply(target,
				[inst.options.messages[inst._current], inst.options.messages[inst._next]]);
		}
		inst._anims = [];
		var cur = inst.options.messages[inst._current];
		var next = inst.options.messages[inst._next];
		var offset = $(target).offset();
		var flips = ($.isArray(inst.options.flips) ? inst.options.flips :
			[inst.options.flips, inst.options.flips]);
		var template = this._charTemplate(inst);
		for (var i = 0; i < inst.options.maxLength; i++) {
			var animDiv = template.clone().
				css({left: offset.left + i * inst.options.lettersSize[0], top: offset.top}).
				appendTo('body');
			inst._anims.push(animDiv);
			var count = randInt(flips[1] - flips[0] + 1) + flips[0];
			var charSeq = '';
			if (inst.options.sequential) {
				var start = inst.options.lettersSeq.indexOf(cur.charAt(i) || ' ');
				var end = inst.options.lettersSeq.indexOf(next.charAt(i) || ' ');
				charSeq = (start < end ? inst.options.lettersSeq.substring(start, end + 1) :
					inst.options.lettersSeq.substring(start) +
					inst.options.lettersSeq.substring(0, end + 1));
			}
			else {
				charSeq = cur.charAt(i) || ' ';
				for (var j = 1; j < count; j++) {
					charSeq += inst.options.lettersSeq.charAt(randInt(inst.options.lettersSeq.length));
				}
				charSeq += next.charAt(i) || ' ';
			}
			var speed = (!isNaN(inst.options.speed) ? inst.options.speed :
				$.fx.speeds[inst.options.speed] || $.fx.speeds._default);
			speed = speed * 0.9 + randInt(speed * 0.2);
			this._flipChar(target, animDiv, inst, $('span:eq(' + i + ')', target),
				charSeq, speed);
		}
	},

	/* Create a template for a single character animation.
	   @param  inst  (object) the current settings
	   @return  (jQuery) the character template */
	_charTemplate: function(inst) {
		var image = inst.options.lettersImage;
		var width = inst.options.lettersSize[0];
		var height = inst.options.lettersSize[1];
		var maxWidth = inst.options.lettersSeq.length * width;
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
		if (inst.options.shading) {
			controls += (!$.support.opacity ? // Shadow
				'<img src="' + inst.options.shadingImages[1] + '"' : '<div') +
				' class="fbsh" style="position: absolute; width: ' + width +
				'px; background-color: black; opacity: ' + inst.options.opacity +
				'; filter: alpha(opacity=' + (inst.options.opacity * 100) + ');"' +
				(!$.support.opacity ? '/>' : '></div>') +
				(!$.support.opacity ? // Highlight
				'<img src="' + inst.options.shadingImages[0] + '"' : '<div') +
				' class="fbhi" style="position: absolute; top: ' + (height / 2) + 'px; width: ' +
				width + 'px; height: 0px; background-color: white; opacity: ' +
				inst.options.opacity + '; filter: alpha(opacity=' + (inst.options.opacity * 100) + ');"' +
				(!$.support.opacity ? '/>' : '></div>');
		}
		return $(controls + '</div>');
	},

	/* Monitor character animations and continue after all are complete.
	   @param  target  (element)  the containing division */
	_finishedChar: function(target) {
		var inst = $.data(target, this.propertyName);
		inst._count--;
		if (inst._count == 0) {
			var lastFlip = [inst.options.messages[inst._current], inst.options.messages[inst._next]];
			this._prepareFlip(target);
			if (inst.options.afterFlip) {
				inst.options.afterFlip.apply(target, lastFlip);
			}
		}
	},

	/* Flip a single letter through a series of changes.
	   @param  target    (element) the containing division
	   @param  animDiv   (jQuery) controls for a single character animation
	   @param  inst      (object) the current settings
	   @param  charSpan  (number) the span for the character in the message
	   @param  charSeq   (string) the letters to flip through
	   @param  speed     (number) the speed of the animation */
	_flipChar: function(target, animDiv, inst, charSpan, charSeq, speed) {
		if (charSeq.length < 2) {
			animDiv.remove().removeData(plugin.propertyName);
			plugin._finishedChar(target);
			return;
		}
		var width = inst.options.lettersSize[0];
		var fromIndex = inst.options.lettersSeq.indexOf(charSeq.charAt(0));
		var toIndex = inst.options.lettersSeq.indexOf(charSeq.charAt(1));
		var elem = animDiv[0].firstChild;
		$(elem.firstChild).css('left', -toIndex * width); // New top
		elem = elem.nextSibling;
		$(elem.firstChild).css('left', -fromIndex * width); // Old bottom
		elem = elem.nextSibling;
		$(elem.firstChild).css('left', -fromIndex * width); // Old top
		elem = elem.nextSibling;
		$(elem).css('height', 0); // New bottom
		$(elem.firstChild).css('left', -toIndex * width);
		animDiv.data(plugin.propertyName, {span: charSpan, offset: -toIndex * width});
		animDiv.animate({fbHeight: 1}, speed, function() {
			plugin._flipChar(target, animDiv, inst, charSpan, charSeq.substring(1), speed);
		});
	},

	/* Define the animation elements and attributes.
	   @param  cont  (jQuery) the elements' container */
	_getStepProps: function(cont) {
		var stepProps = [];
		var height = $(cont).height();
		var children = cont.children || cont.childNodes;
		stepProps[0] = {elem: children[2], first: true, props: {
			top: {start: 0, diff: height, units: 'px', min: -999999},
			height: {start: height / 2 + 1, diff: -height, units: 'px', min: 0}}};
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
				height: {start: height / 2 + 1, diff: -height, units: 'px', min: 0},
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
		fx.stepProps = plugin._getStepProps(fx.elem);
		fx.first = true;
	}

	for (var i = 0; i < fx.stepProps.length; i++) { // Update all components
		var comp = fx.stepProps[i];
		if (fx.first == comp.first) {
			for (var name in comp.props) { // Update all properties
				var prop = comp.props[name];
				comp.elem.style[name] =
					Math.max(fx.pos * prop.diff + prop.start, prop.min) + prop.units;
				if (!$.support.opacity && name == 'opacity') {
					comp.elem.style.filter = 'alpha(opacity=' +
						(Math.max(fx.pos * prop.diff + prop.start, prop.min) * 100) + ')';
				}
			}
		}
	}

	if (fx.first && fx.pos >= 0.5) {
		fx.first = false; // Second half
	}

	if (fx.pos == 1) { // Tidy up afterwards
		var data = $.data(fx.elem, plugin.propertyName);
		if (data) {
			data.span.css('background-position', data.offset + 'px 0px');
		}
	}
};

// The list of commands that return values and don't permit chaining
var getters = ['current', 'next'];

/* Determine whether a command is a getter and doesn't permit chaining.
   @param  command    (string, optional) the command to run
   @param  otherArgs  ([], optional) any other arguments for the command
   @return  true if the command is a getter, false if not */
function isNotChained(command, otherArgs) {
	if (command == 'option' && (otherArgs.length == 0 ||
			(otherArgs.length == 1 && typeof otherArgs[0] == 'string'))) {
		return true;
	}
	return $.inArray(command, getters) > -1;
}

/* Attach the flight board functionality to a jQuery selection.
   @param  options  (object) the new settings to use for these instances (optional) or
                    (string) the command to run (optional)
   @return  (jQuery) for chaining further calls or
            (any) getter value */
$.fn.flightboard = function(options) {
	var otherArgs = Array.prototype.slice.call(arguments, 1);
	if (isNotChained(options, otherArgs)) {
		return plugin['_' + options + 'Plugin'].
			apply(plugin, [this[0]].concat(otherArgs));
	}
	return this.each(function() {
		if (typeof options == 'string') {
			if (!plugin['_' + options + 'Plugin']) {
				throw 'Unknown command: ' + options;
			}
			plugin['_' + options + 'Plugin'].
				apply(plugin, [this].concat(otherArgs));
		}
		else {
			plugin._attachPlugin(this, options || {});
		}
	});
};

/* Initialise the flight board functionality. */
var plugin = $.flightboard = new FlightBoard(); // Singleton instance

})(jQuery);
