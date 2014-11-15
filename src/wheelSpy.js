/**
 * @date     2014/11/13
 * @author   Dolphin<dolphin.w.e@gmail.com>
 */

(function ($, tween, window, document) {
    'use strict';

    var getStyle = (function () {
        var getUnitValue = function (value) {
            var UNIT_VALUE_PATTERN = /([\d\.\-]+)([^\d]+)/;
            if (value === undefined) {
                return undefined;
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

        var unitConverter = function (elem, prop, unit) {
            var elemPropValue = $(elem).css(prop);
            elemPropValue = (!elemPropValue || elemPropValue === 'auto') ?
                            0 : parseFloat(elemPropValue);

            if (!unit) {
                return elemPropValue;
            }

            var div = $('<div></div>');
            $(div)
                .appendTo($(elem).offsetParent())
                .css(prop, 1 + unit);

            var scale = parseFloat($(div).css(prop));

            if (isNaN(scale)) {
                scale = 1;
            }
            // console.log(scale, elemPropValue);
            $(div).remove();

            return unit ? elemPropValue / scale + unit :
                          elemPropValue / scale;
        };

        var getStyle = function (elem, beginStyle, finalStyle, percent) {
            var style = {};
            for (var prop in finalStyle) {
                var finalFrame = getUnitValue(finalStyle[prop]);
                if (!finalFrame) {
                    continue;
                }
                if (!beginStyle[prop]) {
                    // set begin value
                    beginStyle[prop] = unitConverter(elem, prop, finalFrame.unit);
                }

                var beginFrame = getUnitValue(beginStyle[prop]);
                var changeValue = finalFrame.value - beginFrame.value;
                var nextFrameValue = percent * changeValue + beginFrame.value;
                style[prop] = nextFrameValue + finalFrame.unit;
            }
            return style;
        };

        return getStyle;
    })();

    var currentFrame = 0;
    var maxFrame = 0;
    var queue = [];

    var config = {
        wheelSpeed: 1,
        touchSpeed: 1,
        keyboardSpeed: 1,
        useTweenLite: true
    };

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

    var CreateSpy = function (elem) {
        this.target = elem[0];
        //this.index = queue.length;
        this.keyframes = [];

        queue.push(this);
        return this;
    };

    CreateSpy.prototype = {
        /*
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
                finalStyle: style,
                steps: callback,
                beginStyle: lastSetting ?
                            $.extend({}, lastSetting.finalStyle) : {}
            });
            return this;
        },
        render: function (keyframe, duration) {
            //console.log(currentFrame, this.lastFrame);
            if (Math.abs(currentFrame - this.lastFrame) < 1) {
                return;
            }
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
                $(target).css(nextFrame);
            }

            if (typeof keyframe.steps === 'function') {
                keyframe.steps.call(target, percent);
            }
        }
    };

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
            if (!queue.length) {
                return;
            }
            //var currentTime = new Date().getTime();
            var currentTime = event.timeStamp || (new Date).getTime();
            if (!timeStamp) {
                timeStamp = currentTime;
                return;
            }
            var duration = currentTime - timeStamp;
            timeStamp = currentTime;

            var orgEvent = event.originalEvent;
            var delta = orgEvent.wheelDelta ?
                        -orgEvent.wheelDelta / 120 :
                        orgEvent.detail / 3 /* FF */;

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
            if (!queue.length) {
                return;
            }
            startTouchPos = currentTouchPos = getPageY(event);
            //startTime = currentTime = new Date().getTime();
            startTime = currentTime = event.timeStamp || (new Date).getTime();
        };

        var move = function (event) {
            if (!startTouchPos) {
                return;
            }
            var pos = getPageY(event);
            var changeValue = currentTouchPos - pos; // opposite direction
            currentTouchPos = pos;

            //var time = new Date().getTime();
            var time = event.timeStamp || (new Date).getTime();
            var duration = time - currentTime;
            currentTime = time;

            var frame = currentFrame + changeValue * config.touchSpeed;
            renderFrame(frame, duration);
        };

        var stop = function () {
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

        var supportTouch = $.support.touch,
            touchStartEvent = supportTouch ? 'touchstart' : 'mousedown',
            touchStopEvent = supportTouch ? 'touchend' : 'mouseup',
            touchMoveEvent = supportTouch ? 'touchmove' : 'mousemove';

        $(document)
            .on(touchStartEvent, start)
            .on(touchMoveEvent, move)
            .on(touchStopEvent, stop);

        //document.addEventListener(touchStartEvent, start, false);
        //document.addEventListener(touchMoveEvent, move, false);
        //document.addEventListener(touchStopEvent, stop, false);
    })();

    $(document).on('keydown', function (event) {
        // key press event
        event.preventDefault();
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

    var wheelSpy = function (selector) {
        return new CreateSpy($(selector));
    };

    /*
     * @param {Object} configuration: wheelSpy configuration contains
     *                                wheelSpeed, touchSpeed and useTweenLite
     *                                eg: {
     *                                        wheelSpeed: 0.5, // default is 1
     *                                        touchSpeed: 1.3, // default is 1
     *                                        keyboardSpeed: 2, // default is 1
     *                                        useTweenLite: true // default is true
     *                                    }
     *
     */
    wheelSpy.config = function (configuration) {
        $.extend(config, configuration);
    };

    window.wheelSpy = wheelSpy;
})(jQuery, TweenLite, window, document);