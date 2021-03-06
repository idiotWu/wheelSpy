/**
 * @date     2014/11/13
 * @author   Dolphin<dolphin.w.e@gmail.com>
 * https://github.com/idiotWu/wheelSpy
 */

(function (window) {
    'use strict';
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
        var UNIT_VALUE_PATTERN = /([\d\.\-]+)([^\d]+)/;
        var getUnitValue = function (value) {
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
         * get one unit value
         * @param {jQuery} $parent: parent element to append to
         * @param {String} prop: css property name
         * @param {String} unit: unit to apply
         */
        var getOneUnitValue = function ($parent, prop, unit) {
            var $div = $('<div style="position: absolute;border-style: solid;visibility: hidden;"></div>');
            $div.appendTo($parent[0]).css(prop, 12 + unit);
            var value = parseFloat($div.css(prop));
            $div.remove();
            return value;
        };
        /**
         * Convert css unit
         * @param {jQuery} $elem: target element
         * @param {String} prop: css property name
         * @param {String} finalUnit: unit to convert to
         * @param {Number} [propValue]: value of the property,
         *                              will call $(elem).css(prop) if undefined
         *
         * @return {String} converted property value
         */
        var unitConverter = function ($elem, prop, finalUnit, propValue) {
            propValue = propValue || $elem.css(prop);
            //console.log(propValue);
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
                //console.log(prop, propValue);
                return parseFloat(propValue) + finalUnit;
            }
            if (finalUnit === 'em') {
                var fontSize = parseFloat($elem.css('fontSize')) || 1;
                return (parseFloat($elem.css(prop)) || 0) / fontSize + 'em';
            }

            var $parent = $elem.offsetParent();
            var value_1 = getOneUnitValue($parent, prop, originUnit);
            var value_2 = getOneUnitValue($parent, prop, finalUnit);

            //console.log(value_1, value_2);

            var ratio = value_1 / value_2;
            //console.log(ratio);

            if (isNaN(ratio)) {
                console.log($elem);
                throw new Error('error get value of ' + prop);
            }
            //console.log(ratio);
            //console.log(prop, propValue);

            return parseFloat(propValue) * ratio + finalUnit;
        };

        /**
         * get style in animation by percent
         *
         * @param {jQuery} $elem: target element
         * @param {Object} beginStyle: begin style of the element
         * @param {Object} finalStyle: final style of the element
         * @param {Number} percent: percent in animation
         *
         * @return {Object} style
         */
        var getStyle = function ($elem, beginStyle, finalStyle, percent) {
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
                    beginStyle[prop] = unitConverter($elem, prop, finalFrame.unit);
                }

                var beginFrame = getUnitValue(beginStyle[prop]);

                if (beginFrame.unit !== finalFrame.unit) {
                    beginStyle[prop] = unitConverter($elem, prop, finalFrame.unit, beginStyle[prop]);
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
                expanded_1[prop + '-right'] = eachValue_1[1] || eachValue_1[0];
                expanded_1[prop + '-bottom'] = eachValue_1[2] || eachValue_1[0];
                expanded_1[prop + '-left'] = eachValue_1[3] || eachValue_1[1] || eachValue_1[0];
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
            expanded_2[t_2[0] + '-right-' + t_2[1]] = eachValue_2[1] || eachValue_2[0];
            expanded_2[t_2[0] + '-bottom-' + t_2[1]] = eachValue_2[2] || eachValue_2[0];
            expanded_2[t_2[0] + '-left-' + t_2[1]] = eachValue_2[3] || eachValue_2[1] || eachValue_2[0];
            $.extend(style, expanded_2);
            delete style[prop_2];
        }

        var value_3 = style[prop_3];
        if (value_3) {
            var expanded_3 = {};
            var t_3 = prop_3.split('-');
            var eachValue_3 = value_3.split(' ');

            expanded_3[t_3[0] + '-top-left-' + t_3[1]] = eachValue_3[0];
            expanded_3[t_3[0] + '-top-right-' + t_3[1]] = eachValue_3[1] || eachValue_3[0];
            expanded_3[t_3[0] + '-bottom-right-' + t_3[1]] = eachValue_3[2] || eachValue_3[0];
            expanded_3[t_3[0] + '-bottom-left-' + t_3[1]] = eachValue_3[3] || eachValue_3[1] || eachValue_3[0];
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
        throttle: 16,
        wheelSpeed: 1,
        touchSpeed: 1,
        keyboardSpeed: 1,
        useTweenLite: typeof tween === 'function'
    };

    /**
     * create wheelSpy target
     * @constructor
     * @param {jQuery} elem: target element
     */
    var CreateSpy = function ($elem) {
        this.target = $elem;
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
                percent: 0,
                startFrame: start,
                endFrame: end,
                allFrames: end - start,
                finalStyle: expandCSS(style),
                steps: callback,
                beginStyle: lastSetting ? $.extend({}, lastSetting.finalStyle) : {}
            });
            return this;
        },
        /**
         * reder the specific keyframe
         * @param {Object} keyframe: keyframe to be rendered
         * @param {Number} duration
         */
        render: function (keyframe, duration) {
            var percent = (currentFrame - keyframe.startFrame) / keyframe.allFrames;
            if (percent <= 0) {
                percent = 0;
            } else if (percent >= 1) {
                percent = 1;
            }
            keyframe.percent = percent; // log percent

            //console.log(percent);
            var $target = this.target;
            var nextFrame = getStyle($target, keyframe.beginStyle, keyframe.finalStyle, percent);
            //console.log(keyframe.beginStyle, nextFrame);

            if (config.useTweenLite) {
                tween.to($target, duration / 500, {
                    css: nextFrame,
                    ease: Linear.easeNone
                });
            } else {
                $target.css(nextFrame);
            }

            if (typeof keyframe.steps === 'function') {
                keyframe.steps.call($target, percent);
            }
        },
        /**
         * high speed scroll fix
         * @param {Object} keyframe: keyframe to be fixed
         * @param {Boolean} isScrollDown: whether is scrolling down or not
         */
        fix: function (keyframe, isScrollDown) {
            //console.log('fixing ' + isScrollDown);
            var $target = this.target;
            //tween.killTweensOf(this.target);
            if ($.isEmptyObject(keyframe.beginStyle)) {
                // get begin style first
                getStyle($target, keyframe.beginStyle, keyframe.finalStyle, 0);
            }
            var duration, style;
            //console.log(keyframe.percent);
            if (isScrollDown) {
                duration = Math.max(1 - keyframe.percent, 0.5);
                style = keyframe.finalStyle;
                keyframe.percent = 1;
            } else {
                duration = Math.max(keyframe.percent - 0, 0.5);
                style = keyframe.beginStyle;
                keyframe.percent = 0;
            }
            //keyframe.percent = Number(isScrollDown);
            //console.log(this.target);
            if (config.useTweenLite) {
                tween.to($target, duration, {
                    css: style,
                    ease: Linear.easeNone
                });
            } else {
                $target.css(style);
            }

            if (typeof keyframe.steps === 'function') {
                keyframe.steps.call($target, keyframe.percent);
            }
        }
    };

    /**
     * match the spy in range and render
     * @param {Number} frame: frame to be rendered
     * @param {Number} duration
     */
    var renderFrame = function (frame, duration) {
        //console.log(frame);
        if (frame < 0) {
            currentFrame = 0;
        } else if (frame > maxFrame) {
            currentFrame = maxFrame;
        } else {
            currentFrame = frame;
        }
        //console.log(currentFrame,frame < 0)
        var curFrame = currentFrame;
        for (var i = 0, j = queue.length; i < j; i++) {
            var spy = queue[i];
            var frames = spy.keyframes;
            if (!frames) {
                continue;
            }

            for (var k = 0, l = frames.length; k < l; k++) {
                var keyframe = frames[k];
                if (curFrame >= keyframe.startFrame &&
                    curFrame <= keyframe.endFrame) {
                    spy.render(keyframe, duration);
                }
                if (curFrame >= keyframe.endFrame &&
                    keyframe.percent < 1) {
                    spy.fix(keyframe, true);
                }
                if (curFrame <= keyframe.startFrame &&
                    keyframe.percent > 0) {
                    spy.fix(keyframe, false);
                }
            }
        }
    };

    (function (config) {
        // mousewheel event handler
        var timer, timeStamp, mustRun;
        var delta = 0;
        var wheelListener = function (event) {
            event.preventDefault();
            clearTimeout(mustRun);

            if (!queue.length || preventAction) {
                return;
            }
            //var currentTime = new Date().getTime();
            var orgEvent = event.originalEvent;
            delta += orgEvent.wheelDelta ? -orgEvent.wheelDelta / 120 : orgEvent.detail / 3 /* FF */ ;

            var currentTime = event.timeStamp || (new Date).getTime();
            if (!timeStamp) {
                timeStamp = currentTime;
                return;
            }

            var duration = currentTime - timeStamp;
            if (duration < config.throttle) {
                mustRun = setTimeout(function () {
                    var frame = currentFrame + delta * config.wheelSpeed * 10;
                    delta = 0;
                    renderFrame(frame, 100);
                }, 100);
                return;
            }

            timeStamp = currentTime;

            var frame = currentFrame + delta * config.wheelSpeed * 10;
            delta = 0;

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
    })(config);

    (function (config) {
        // touch event handler
        var startTouchPos, startTime, currentTouchPos, currentTime, mustRun;

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
            event.preventDefault();

            clearTimeout(mustRun);
            if (!startTouchPos || preventAction) {
                return;
            }

            var pos = getPageY(event);
            var changeValue = currentTouchPos - pos; // opposite direction
            currentTouchPos = pos;

            //var time = new Date().getTime();
            var time = event.timeStamp || (new Date).getTime();
            var duration = time - currentTime;
            if (duration < config.throttle) {
                mustRun = setTimeout(function () {
                    var frame = currentFrame + changeValue * config.touchSpeed;
                    renderFrame(frame, 100);
                }, 100);
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
    })(config);

    $(document).on('keydown', function (event) {
        // key press event
        if (preventAction) {
            return;
        }
        var keyCode = event.keyCode || event.which;
        if (keyCode === 40) {
            // down key
            event.preventDefault();
            renderFrame(currentFrame + config.keyboardSpeed * 2, 30);
        }
        if (keyCode === 38) {
            // up key
            event.preventDefault();
            renderFrame(currentFrame - config.keyboardSpeed * 2, 30);
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
        var _queue = [];

        var easeOutCubic = function (t, b, c, d) {
            return c * ((t = t / d - 1) * t * t + 1) + b;
        };

        var createAnime = function (changeValue, duration) {
            var frames = duration / 16 | 0 + 1;
            var anime = [];

            for (var i = 1; i <= frames; i++) {
                anime.push(easeOutCubic(i, currentFrame, changeValue, frames));
            }
            //console.log(anime);

            return anime;
        };

        var createQueue = function (changeValue, duration, callback) {
            var anime = createAnime(changeValue, duration);

            var status = {
                index: _queue.length,
                stop: false
            };
            _queue.push(status);

            var length = anime.length;
            var i = 0;

            var _run = function () {
                if (status.stop) {
                    return;
                }
                if (i === length) {
                    if (typeof callback === 'function') {
                        return callback();
                    }

                    return;
                }

                renderFrame(anime[i++], 16);

                requestAnimationFrame(_run);
            };
            _run();
        };

        var dequeue = function () {
            for (var i = 0, max = _queue.length; i < max; i++) {
                _queue[i].stop = true;
            }
            _queue = [];
        };

        var jump = function (frame, duration, callback) {
            dequeue();
            frame = Math.min(maxFrame, Math.max(0, frame));
            duration = duration || 500;

            var changeValue = frame - currentFrame;
            if (!changeValue) {
                if (typeof callback === 'function') {
                    return callback();
                }
                return;
            }
            createQueue(changeValue, duration, callback);
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
            'spy-on: ' + !preventAction);
        console.log('all spys:');
        console.log(queue);
        console.log('current config:');
        console.log(config);
    };

    window.wheelSpy = wheelSpy;
})(jQuery, TweenLite, window, document);