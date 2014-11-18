/**
 * @date     2014/11/13
 * @author   Dolphin<dolphin.w.e@gmail.com>
 * https://github.com/idiotWu/wheelSpy
 */

(function (window) {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || // name has changed in Webkit
        window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16.7 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                callback(currTime + timeToCall);
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }
})(window);

(function ($, tween, window, document) {
    'use strict';

    var getStyle = (function () {

        /**
         * get css property value and unit
         * @param {String} value: css property value string
         *
         * @return {Object | null}: object contains value and unit
         */
        var getUnitValue = function (value) {
            var UNIT_VALUE_PATTERN = /([\d\.\-]+)([^\d]+)/;
            if (value === undefined) {
                return null;
            }
            if (!isNaN(value)) {
                return {
                    value: parseFloat(value),
                    unit: ''
                };
            }
            if (!UNIT_VALUE_PATTERN.test(value)) {
                throw new Error('Bad value:' + value);
            }
            return {
                value: parseFloat(RegExp.$1),
                unit: RegExp.$2
            };
        };

        /**
         * Convert css unit
         * @param {Element} elem: target element
         * @param {String} prop: css property name
         * @param {String} finalUnit: unit to convert to
         * @param {String} [propValue]: value of the property,
         *                              will call $(elem).css(prop) if undefined
         *
         * @return {String} converted property value
         */
        var unitConverter = function (elem, prop, finalUnit, propValue) {
            propValue = propValue || $(elem).css(prop);
            if (!propValue) {
                throw new Error('unsupported css property: ' + prop);
            }

            propValue = propValue === 'auto' ? 0 : propValue;
            var originUnit = getUnitValue(propValue).unit;
            //console.log(getUnitValue(propValue))

            if (prop !== 'opacity') {
                originUnit = originUnit || 'px';
            }

            if (originUnit === finalUnit) {
                return propValue;
            }

            var $div_1 = $('<div style="position: absolute;border-style: solid;"></div>');
            var $div_2 = $('<div style="position: absolute;border-style: solid;"></div>');
            var $parent = $(elem).offsetParent();
            $div_1.appendTo($parent).css(prop, 1 + originUnit);
            $div_2.appendTo($parent).css(prop, 1 + finalUnit);

            var scale = parseFloat($div_1.css(prop)) / parseFloat($div_2.css(prop));
            //console.log(scale);

            if (isNaN(scale)) {
                console.log(elem);
                throw new Error('error get value of ' + prop);
            }
            //console.log(scale, propValue);
            $div_1.remove();
            $div_2.remove();

            return parseFloat(propValue) * scale + finalUnit;
        };

        /**
         * get style in animation by percent
         * 
         * @param {Element} elem: target element
         * @param {Object} beginStyle: begin style of the element
         * @param {Object} finalStyle: final style of the element
         * @param {Number} percent: percent in animation
         * 
         * @return {Object} style
         */
        var getStyle = function (elem, beginStyle, finalStyle, percent) {
            var style = {};
            for (var prop in finalStyle) {
                var finalFrame = getUnitValue(finalStyle[prop]);
                if (!finalFrame) {
                    continue;
                }

                if (prop !== 'opacity') {
                    finalFrame.unit = finalFrame.unit || 'px';
                }

                if (!beginStyle[prop]) {
                    // set begin value
                    beginStyle[prop] = unitConverter(elem, prop, finalFrame.unit);
                }

                var beginFrame = getUnitValue(beginStyle[prop]);

                if (beginFrame.unit !== finalFrame.unit) {
                    beginStyle[prop] = unitConverter(elem, prop, finalFrame.unit, beginStyle[prop]);
                    beginFrame = getUnitValue(beginStyle[prop]);
                }

                var changeValue = finalFrame.value - beginFrame.value;
                var nextFrameValue = percent * changeValue + beginFrame.value;
                style[prop] = nextFrameValue + finalFrame.unit;
            }
            return style;
        };

        return getStyle;
    })();

    /**
     * check if the spy range is valid
     * @param {Array} keyframes: already set keyframses of target
     * @param {Number} startFrame: start frame to be set
     */
    var checkRangeValid = function (keyframes, startFrame) {
        for (var i = 0, max = keyframes.length; i < max; i++) {
            var keyframe = keyframes[i];
            if (startFrame >= keyframe.startFrame &&
                startFrame < keyframe.endFrame) {
                throw new Error('already has keyframe in range [' +
                    keyframe.startFrame + ',' + keyframe.endFrame + ']!');
            }
        }
    };

    /**
     * expand css shorthand
     * @param {Object} style: styles to be expand
     * @return {Object} expanded styles
     */
    var expandCSS = function (style) {
        // todo: background-position rendering

        for (var prop in style) {
            if (prop !== 'opacity' &&
                typeof style[prop] === 'number') {
                style[prop] += 'px';
            }
            if (!$('body').css(prop)) {
                delete style[prop];
            }
        }

        var prop_1 = ['margin', 'padding'];
        var prop_2 = 'border-width';
        var prop_3 = 'border-radius';
        for (var i = 0, max = prop_1.length; i < max; i++) {
            var prop = prop_1[i];
            var value_1 = style[prop];
            if (value_1) {
                var expanded_1 = {};
                var eachValue_1 = value_1.split(' ');

                expanded_1[prop + '-top'] = eachValue_1[0];
                expanded_1[prop + '-right'] = eachValue_1[1] ||
                    eachValue_1[0];
                expanded_1[prop + '-bottom'] = eachValue_1[2] ||
                    eachValue_1[0];
                expanded_1[prop + '-left'] = eachValue_1[3] ||
                    eachValue_1[1] ||
                    eachValue_1[0];
                $.extend(style, expanded_1);
                delete style[prop];
            }
        }

        var value_2 = style[prop_2];
        if (value_2) {
            var expanded_2 = {};
            var t_2 = prop_2.split('-');
            var eachValue_2 = value_2.split(' ');

            expanded_2[t_2[0] + '-top-' + t_2[1]] = eachValue_2[0];
            expanded_2[t_2[0] + '-right-' + t_2[1]] = eachValue_2[1] ||
                eachValue_2[0];
            expanded_2[t_2[0] + '-bottom-' + t_2[1]] = eachValue_2[2] ||
                eachValue_2[0];
            expanded_2[t_2[0] + '-left-' + t_2[1]] = eachValue_2[3] ||
                eachValue_2[1] ||
                eachValue_2[0];
            $.extend(style, expanded_2);
            delete style[prop_2];
        }

        var value_3 = style[prop_3];
        if (value_3) {
            var expanded_3 = {};
            var t_3 = prop_3.split('-');
            var eachValue_3 = value_3.split(' ');

            expanded_3[t_3[0] + '-top-left-' + t_3[1]] = eachValue_3[0];
            expanded_3[t_3[0] + '-top-right-' + t_3[1]] = eachValue_3[1] ||
                eachValue_3[0];
            expanded_3[t_3[0] + '-bottom-right-' + t_3[1]] = eachValue_3[2] ||
                eachValue_3[0];
            expanded_3[t_3[0] + '-bottom-left-' + t_3[1]] = eachValue_3[3] ||
                eachValue_3[1] ||
                eachValue_3[0];
            $.extend(style, expanded_3);
            delete style[prop_3];
        }

        return style;
    };

    var preventAction = false;
    var currentFrame = 0;
    var maxFrame = 0;
    var queue = [];

    var config = {
        wheelSpeed: 1,
        touchSpeed: 1,
        keyboardSpeed: 1,
        useTweenLite: true
    };

    /**
     * create wheelSpy target
     * @constructor
     * @param {Element} elem: target element
     */
    var CreateSpy = function (elem) {
        this.target = elem[0];
        //this.index = queue.length;
        this.keyframes = [];

        queue.push(this);
        return this;
    };

    CreateSpy.prototype = {
        /**
         * @param {Number} start: start frame in all scroll frames
         * @param {Number} end: end frame
         * @param {Object} style: final style of target
         *                 eg: {
         *                         top: '300px',
         *                         left: 100
         *                     }
         * @param {Function} [callback]: callback with the progress percent
         */
        to: function (start, end, style, callback) {
            if (arguments.length < 3) {
                throw new Error('require at least 3 arguments');
            }
            if (start >= end) {
                throw new Error('start value should be smaller than end');
            }

            var keyframes = this.keyframes;
            checkRangeValid(keyframes, start);

            maxFrame = Math.max(end, maxFrame);
            var lastSetting = keyframes[keyframes.length - 1];

            keyframes.push({
                startFrame: start,
                endFrame: end,
                allFrames: end - start,
                finalStyle: expandCSS(style),
                steps: callback,
                beginStyle: lastSetting ?
                    $.extend({}, lastSetting.finalStyle) : {}
            });
            return this;
        },
        /**
         * reder the specific keyframe
         * @param {Object} keyframe: specific keyframe of the spy
         * @param {Number} duration
         */
        render: function (keyframe, duration) {
            //console.log(currentFrame, this.lastFrame);
            this.lastFrame = currentFrame; // refresh object last frame
            var percent = (currentFrame - keyframe.startFrame) / keyframe.allFrames;
            if (percent < 0) {
                percent = 0;
            } else if (percent > 1) {
                percent = 1;
            }

            //console.log(percent);
            var target = this.target;
            var nextFrame = getStyle(target, keyframe.beginStyle, keyframe.finalStyle, percent);
            //console.log(nextFrame);

            if (config.useTweenLite) {
                tween.to(target, duration / 500, nextFrame);
            } else {
                $(target).stop().animate(nextFrame, {
                    duration: duration
                });
            }

            if (typeof keyframe.steps === 'function') {
                keyframe.steps.call(target, percent);
            }
        }
    };

    /**
     * match the spy in range and render
     * @param {Number} frame: frame to be rendered
     * @param {Number} duration
     */
    var renderFrame = function (frame, duration) {
        if (frame < 0) {
            currentFrame = 0;
        } else if (frame > maxFrame) {
            currentFrame = maxFrame;
        } else {
            currentFrame = frame;
        }
        //console.log(currentFrame,frame < 0)

        for (var i = 0, j = queue.length; i < j; i++) {
            var spy = queue[i];
            var frames = spy.keyframes;
            if (!frames) {
                continue;
            }

            for (var k = 0, l = frames.length; k < l; k++) {
                var keyframe = frames[k];
                if (currentFrame >= keyframe.startFrame &&
                    currentFrame <= keyframe.endFrame) {
                    spy.render(keyframe, duration);
                }
            }
        }
    };

    (function () {
        // mousewheel event handler
        var timer, timeStamp;
        var wheelListener = function (event) {
            if (!queue.length || preventAction) {
                return;
            }
            //var currentTime = new Date().getTime();
            var currentTime = event.timeStamp || (new Date).getTime();
            if (!timeStamp) {
                timeStamp = currentTime;
                return;
            }
            var duration = currentTime - timeStamp;
            if (duration < 16) {
                return;
            }
            timeStamp = currentTime;

            var orgEvent = event.originalEvent;
            var delta = orgEvent.wheelDelta ?
                -orgEvent.wheelDelta / 120 :
                orgEvent.detail / 3 /* FF */ ;

            var frame = currentFrame + delta * config.wheelSpeed * 10;

            renderFrame(frame, duration);

            clearTimeout(timer);
            timer = setTimeout(function () {
                timeStamp = undefined;
            }, 300);
        };

        var mouseWheelEvent = 'onmousewheel' in document.documentElement ?
            'mousewheel' : 'DOMMouseScroll';
        $(document).on(mouseWheelEvent, wheelListener);
        //document.addEventListener(mouseWheelEvent, wheelListener, false);
    })();

    (function () {
        // touch event handler
        var startTouchPos, startTime, currentTouchPos, currentTime;

        var getPageY = function (event) {
            var data = event.originalEvent.touches ?
                event.originalEvent.touches[0] :
                event;
            return data.pageY;
        };

        var start = function (event) {
            if (!queue.length || preventAction) {
                return;
            }
            startTouchPos = currentTouchPos = getPageY(event);
            //startTime = currentTime = new Date().getTime();
            startTime = currentTime = event.timeStamp || (new Date).getTime();
        };

        var move = function (event) {
            if (!startTouchPos || preventAction) {
                return;
            }
            var pos = getPageY(event);
            var changeValue = currentTouchPos - pos; // opposite direction
            currentTouchPos = pos;

            //var time = new Date().getTime();
            var time = event.timeStamp || (new Date).getTime();
            var duration = time - currentTime;
            if (duration < 16) {
                return;
            }
            currentTime = time;

            var frame = currentFrame + changeValue * config.touchSpeed;
            renderFrame(frame, duration);
        };

        var stop = function () {
            if (preventAction) {
                return;
            }
            var moveLength = startTouchPos - currentTouchPos;
            var duration = currentTime - startTime;
            startTouchPos = undefined;
            //console.log(duration, moveLength);

            if (duration < 300 && Math.abs(moveLength) > 30) {
                swipe(moveLength, duration);
            }
        };

        var swipe = function (moveLength, duration) {
            var frame = currentFrame + moveLength * config.touchSpeed;
            renderFrame(frame, duration * 2);
        };

        //var supportTouch = $.support.touch,
        //    touchStartEvent = supportTouch ? 'touchstart' : 'mousedown',
        //    touchStopEvent = supportTouch ? 'touchend' : 'mouseup',
        //    touchMoveEvent = supportTouch ? 'touchmove' : 'mousemove';
        //
        //$(document)
        //    .on(touchStartEvent, start)
        //    .on(touchMoveEvent, move)
        //    .on(touchStopEvent, stop);

        $(document)
            .on('touchstart', start)
            .on('touchmove', move)
            .on('touchend', stop);

        //document.addEventListener(touchStartEvent, start, false);
        //document.addEventListener(touchMoveEvent, move, false);
        //document.addEventListener(touchStopEvent, stop, false);
    })();

    $(document).on('keydown', function (event) {
        // key press event
        if (preventAction) {
            return;
        }
        var keyCode = event.keyCode || event.which;
        if (keyCode === 40) {
            // down key
            renderFrame(currentFrame += config.keyboardSpeed * 2, 30);
        }
        if (keyCode === 38) {
            // up key
            renderFrame(currentFrame -= config.keyboardSpeed * 2, 30);
        }
    });

    var wheelSpy = {};
    wheelSpy.add = function (selector) {
        return new CreateSpy($(selector));
    };
    wheelSpy.stop = function () {
        preventAction = true;
    };
    wheelSpy.play = function () {
        preventAction = false;
    };

    /**
     * @param {Object} config: available wheelSpy configuration options:
     *                         {Number} [wheelSpeed]: default is 1
     *                         {Number} [touchSpeed]: default is 1
     *                         {Number} [keyboardSpeed]: default is 1
     *                         {Boolean} [useTweenLite]: default is true
     *
     */
    wheelSpy.config = (function (config) {
        return function (configuration) {
            $.extend(config, configuration);
        };
    })(config);

    /**
     * scroll to specific frame
     * @param {Number} frame: frame to scroll to
     * @param {Number} [duration]: progress duration, default is 500
     * @param {Function} [callback]: callback after finished
     */
    wheelSpy.scrollTo = (function () {
        var inAnime;

        var easeOutCubic = function (t, b, c, d) {
            return c * ((t = t / d - 1) * t * t + 1) + b;
        };

        var createAnime = function (changeValue, duration) {
            var frames = duration / 16 | 0;
            var anime = [];

            for (var i = 0; i <= frames; i++) {
                anime.push(easeOutCubic(i, currentFrame, changeValue, frames));
            }

            return anime;
        };

        var jump = function (frame, duration, callback) {
            if (inAnime) {
                cancelAnimationFrame(inAnime);
                inAnime = undefined;
            }
            frame = Math.min(maxFrame, Math.max(0, frame));
            duration = duration || 500;

            var changeValue = frame - currentFrame;
            if (!changeValue) {
                if (typeof callback === 'function') {
                    return callback();
                }
            }

            var anime = createAnime(changeValue, duration);

            var length = anime.length;
            var i = 0;

            var _run = function () {
                if (i === length - 1) {
                    inAnime = undefined;
                    currentFrame = frame;

                    if (typeof callback === 'function') {
                        return callback();
                    }

                    return;
                }

                renderFrame(anime[i++], 16);

                inAnime = requestAnimationFrame(_run);
            };
            _run();
        };

        return jump;
    })();

    wheelSpy.debug = function () {
        if (typeof console === 'undefined' ||
            typeof console.log === 'undefined') {
            return alert('Debug is disabled');
        }
        console.log('currentFrame: ' + currentFrame + '\n' +
            'maxFrame: ' + maxFrame + '\n' +
            'spy-on: ' + preventAction);
        console.log('all spys:');
        console.log(queue);
        console.log('current config:');
        console.log(config);
    };

    window.wheelSpy = wheelSpy;
})(jQuery, TweenLite, window, document);