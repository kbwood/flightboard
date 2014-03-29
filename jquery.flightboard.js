/* http://keith-wood.name/flightBoard.html
   Flight Board for jQuery 2.0.0.
   Written by Keith Wood (kbwood{at}iinet.com.au) October 2009.
   Available under the MIT (https://github.com/jquery/jquery/blob/master/MIT-LICENSE.txt) license. 
   Please attribute the author if you use it. */

/* 
   $('div selector').flightboard();
   Or with options like:
   $('div selector').flightboard({speed: 1000});
*/

(function($) { // Hide scope, no $ conflict

	var pluginName = 'flightboard';

	/** Create the flightboard plugin.
		<p>Sets up a <code>div</code> to flip text like an airline flight board.</p>
		<p>Expects HTML like:</p>
		<pre>&lt;div>&lt;/div></pre>
		<p>Provide inline configuration like:</p>
		<pre>&lt;div data-flightboard="name: 'value'">&lt;/div></pre>
	 	@module FlightBoard
		@augments JQPlugin
		@example $(selector).flightboard()
 $(selector).flightboard({speed: 1000, messages: ['First', 'Second']}) */
	$.JQPlugin.createPlugin({
	
		/** The name of the plugin. */
		name: pluginName,

		/** Flight board before flip callback.
			Triggered just before the message is to change.
			@callback FlightBoardBeforeFlip
			@param current {string} The current message showing.
			@param next {string} The next message to show.
			@example beforeFlip: function(current, next) {
 	$('#status').text('Was showing ' + current);
 } */

		/** Flight board after flip callback.
			Triggered just after the message has changed.
			@callback FlightBoardAfterFlip
			@param prev {string} The previous message showing.
			@param current {string} The current message showing.
			@example afterFlip: function(prev, current) {
 	$('#status').text('Now showing ' + current);
 } */
			
		/** Default settings for the plugin.
			@property [lettersImage='img/flightBoardLarge.png'] {string} Amalgamated image for letters background.
			@property [lettersSize=[25,34]] {number[]} Width and height of individual letters.
			@property [lettersSeq='&nbsp;ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'] {string}
						Positioning of letters within image.
			@property [messages=['SEE&nbsp;THE&nbsp;FLIGHT&nbsp;BOARD','CHANGE&nbsp;MESSAGES']] {string[]}
						Messages to display.
			@property [maxLength=20] {number} Maximum length of flight board.
			@property [flips=[3,5]] {number[]} Number of flips before new value,
						may be an array with minimum and maximum flips.
			@property [sequential=false] {boolean} <code>true</code> to step through all letters, <code>false</code> for random ones.
			@property [speed=500] {number} Time taken (milliseconds) for a single transition.
			@property [repeat=true] {boolean} <code>true</code> to automatically trigger a new transition after a pause.
			@property [pause=2000] {number} Time (milliseconds) between transitions.
			@property [selection='forward'] {string} How to choose the next item to show:
						'forward', 'backward', 'random'.
			@property [shading=true] {boolean} <code>true</code> to add shading effects, <code>false</code> for no effects.
			@property [opacity=0.5] {number} Maximum opacity (0.0 - 1.0) for highlights and shadows.
			@property [shadingImages=['img/flightBoardHigh.png','img/flightBoardShad.png']] {string[]}
						Locations of the highlight/shadow images for IE.
			@property [beforeFlip=null] {FlightBoardBeforeFlip} Callback before flipping.
			@property [afterFlip=null] {FlightBoardAfterFlip} Callback after flipping. */
		defaultOptions: {
			lettersImage: 'img/flightBoardLarge.png',
			lettersSize: [25, 34],
			lettersSeq: ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
			messages: ['SEE THE FLIGHT BOARD', 'CHANGE MESSAGES'],
			maxLength: 20,
			flips: [3, 5],
			sequential: false,
			speed: 500,
			repeat: true,
			pause: 2000,
			selection: 'forward',
			shading: true,
			opacity: 0.5,
		shadingImages: ['img/flightBoardHigh.png', 'img/flightBoardShad.png'],
			beforeFlip: null,
			afterFlip: null
		},
		
		_getters: ['current', 'next'],

		_uuid: new Date().getTime(),

		_instSettings: function(elem, options) {
			return {_current: 0, _next: 0, _anims: []};
		},

		_optionsChanged: function(elem, inst, options) {
			this.stop(elem[0], true);
		$.extend(inst.options, options);
			var current = (inst._dontReset ? Math.min(inst._current, inst.options.messages.length - 1) : 0);
			inst._dontReset = false;
		$.extend(inst, {_current: current, _next: current, _anims: []});
			if (!elem[0].id) {
				elem[0].id = 'fb' + this._uuid++;
		}
			$('#' + elem[0].id + '_css').remove();
			$('<style type="text/css" id="' + elem[0].id + '_css">#' + elem[0].id +
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
			elem.html(html);
			this._prepareFlip(elem[0]);
		},
		
		_preDestroy: function(elem, inst) {
			this.stop(elem[0]);
			elem.empty();
			$('#' + elem[0].id + '_css').remove();
		},

		/** Retrieve the currently visible message of a flight board <code>div</code>.
			@param elem {Element} The containing division.
			@return {Element} The currently displayed message. */
		current: function(elem) {
			var inst = this._getInst(elem);
			return ($(elem).hasClass(this._getMarker()) ? inst.options.messages[inst._current] : null);
	},

		/** Retrieve the next visible message of a flight board <code>div</code>.
			@param elem {Element} The containing division.
			@return {Element} The next to be displayed message. */
		next: function(elem) {
			var inst = this._getInst(elem);
			return ($(elem).hasClass(this._getMarker()) ? inst.options.messages[inst._next] : null);
		},

		/** Stop the flight board automatically flipping to the next value.
			@param elem {Element} The containing division.
			@param [timerOnly=false] {boolean} <code>true</code> if only temporarily stopping (internal). */
		stop: function(elem, timerOnly) {
			var inst = this._getInst(elem);
		if (inst._timer) {
			clearTimeout(inst._timer);
			inst._timer = null;
		}
		for (var i = 0; i < inst._anims.length; i++) {
			inst._anims[i].stop().remove();
		}
		if (!timerOnly) {
				inst._dontReset = true;
				this.option(elem, 'repeat', false);
		}
	},

		/** Start the flight board automatically flipping to the next value.
			@param elem {Element} The containing division. */
		start: function(elem) {
			var inst = this._getInst(elem);
			inst._dontReset = true;
			this.option(elem, 'repeat', true);
	},

		/** Note current visible child and schedule a repeat rotation (if required).
			@private
			@param elem {Element} The containing division. */
		_prepareFlip: function(elem) {
			var inst = this._getInst(elem);
		inst._current = inst._next;
			inst._next = (inst.options.selection === 'random' ? randInt(inst.options.messages.length - 1) :
				(inst.options.selection === 'backward' ? inst._next + inst.options.messages.length - 1 :
			inst._next + 1)) % inst.options.messages.length;
			inst._next = (inst.options.selection === 'random' && inst._next === inst._current ?
			inst.options.messages.length - 1 : inst._next);
		if (inst.options.repeat && !inst._timer) {
				inst._timer = setTimeout(function() { plugin.flip(elem); }, inst.options.pause);
		}
	},

		/** Flip the flight board to the next value.
			@param elem {Element} The containing division.
			@param [next] {int} Index of next message to show. */
		flip: function(elem, next) {
			this.stop(elem, true);
			var inst = this._getInst(elem);
		if (next != null) {
			if (next >= 0 && next <= inst.options.messages.length) {
				inst._next = next;
			}
		}
		inst._count = inst.options.maxLength;
			if (inst.options.beforeFlip && $.isFunction(inst.options.beforeFlip)) {
				inst.options.beforeFlip.apply(elem,
				[inst.options.messages[inst._current], inst.options.messages[inst._next]]);
		}
		inst._anims = [];
		var cur = inst.options.messages[inst._current];
		var next = inst.options.messages[inst._next];
			var offset = $(elem).offset();
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
				this._flipChar(elem, animDiv, inst, $('span:eq(' + i + ')', elem), charSeq, speed);
		}
	},

		/** Create a template for a single character animation.
			@private
			@param inst {object} The current settings.
			@return {jQuery} The character template. */
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

		/** Monitor character animations and continue after all are complete.
			@private
			@param elem {Element} The containing division. */
		_finishedChar: function(elem) {
			var inst = this._getInst(elem);
		inst._count--;
			if (inst._count === 0) {
			var lastFlip = [inst.options.messages[inst._current], inst.options.messages[inst._next]];
				this._prepareFlip(elem);
				if (inst.options.afterFlip && $.isFunction(inst.options.afterFlip)) {
					inst.options.afterFlip.apply(elem, lastFlip);
			}
		}
	},

		/** Flip a single letter through a series of changes.
			@private
			@param elem {Element} The containing division.
			@param animDiv {jQuery} Controls for a single character animation.
			@param inst {object} The current settings.
			@param charSpan {number} The span for the character in the message.
			@param charSeq {string} The letters to flip through.
			@param speed {number} The speed of the animation. */
		_flipChar: function(elem, animDiv, inst, charSpan, charSeq, speed) {
		if (charSeq.length < 2) {
				animDiv.remove().removeData(inst.name);
				plugin._finishedChar(elem);
			return;
		}
		var width = inst.options.lettersSize[0];
		var fromIndex = inst.options.lettersSeq.indexOf(charSeq.charAt(0));
		var toIndex = inst.options.lettersSeq.indexOf(charSeq.charAt(1));
			var curElem = animDiv[0].firstChild;
			$(curElem.firstChild).css('left', -toIndex * width); // New top
			curElem = curElem.nextSibling;
			$(curElem.firstChild).css('left', -fromIndex * width); // Old bottom
			curElem = curElem.nextSibling;
			$(curElem.firstChild).css('left', -fromIndex * width); // Old top
			curElem = curElem.nextSibling;
			$(curElem).css('height', 0); // New bottom
			$(curElem.firstChild).css('left', -toIndex * width);
			animDiv.data(inst.name, {span: charSpan, offset: -toIndex * width}).
				animate({fbHeight: 1}, speed, function() {
					plugin._flipChar(elem, animDiv, inst, charSpan, charSeq.substring(1), speed);
		});
	},

		/** Define the animation elements and attributes.
			@private
			@param cont {jQuery} The elements' container. */
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

	var plugin = $.flightboard; // Singleton instance

	/** Get a random number.
		@private
		@param range {number} The maximum value.
		@return {number} Random value 0 <= x < range. */
	function randInt(range) {
	return Math.floor(Math.random() * range);
	}

	/** Custom animation step for the flight board to synchronise components.
		@param fx {object} The animation definition. */
	$.fx.step['fbHeight'] = function(fx) {
	if (!fx.stepProps) { // Initialisation
		fx.stepProps = plugin._getStepProps(fx.elem);
		fx.first = true;
	}

	for (var i = 0; i < fx.stepProps.length; i++) { // Update all components
		var comp = fx.stepProps[i];
			if (fx.first === comp.first) {
			for (var name in comp.props) { // Update all properties
				var prop = comp.props[name];
				comp.elem.style[name] =
					Math.max(fx.pos * prop.diff + prop.start, prop.min) + prop.units;
					if (!$.support.opacity && name === 'opacity') {
					comp.elem.style.filter = 'alpha(opacity=' +
						(Math.max(fx.pos * prop.diff + prop.start, prop.min) * 100) + ')';
				}
			}
		}
	}

	if (fx.first && fx.pos >= 0.5) {
		fx.first = false; // Second half
	}

		if (fx.pos === 1) { // Tidy up afterwards
			var data = $.data(fx.elem, pluginName);
		if (data) {
			data.span.css('background-position', data.offset + 'px 0px');
		}
	}
	};

})(jQuery);
