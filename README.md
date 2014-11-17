# wheelSpy #

A lightweight JavaScript parallax scroll library.

## How to use ##

### Basic Usage ###

You can create a new spy by calling

```js
var spy = wheelSpy.add(selector);
```

The following code will add an action to the spy in the specific frame range:

```js
spy.to(startFrame:number, endFrame:number, styles:object [, callback:function]);
```

Explanation of the parameters: 

| Param         | Explanation                                           |
| ------------- | ----------------------------------------------------- |
| startFrame    | start frame in all scroll frames, from 0 to infinite  |
| endFrame      | end frame, from startFrame to infinite                |
| styles        | the expected styles for the element                   |
| callback      | callback with this progress percent                   |

Also you can chain together methods as many as you like:

```js
spy.to(0, 200, {
    left: 0,
    top: 0,
    width: 400,
    height: 400,
    'line-height': '400px'
}).to(250, 400, {
    left: '400px',
	top: '100%',
    width: 100,
    height: 100,
    'line-height': '100px',
}).to(400, 450, {
    opacity: 0
}, function(percent) {
	$('#info').text(percent);
});
```

Everytime `.to()` method is called, the total scroll frames will extend with the maximum of all end frames.

### Stop and Play ###

You can stop/play whellSpy by calling

```js
wheelSpy.stop();
wheelSpy.play();
````

which will stop/play all the spys.

### Scroll to frame ###

By calling

```js
wheelSpy.scrollTo(frame);
```

all spys will scroll to the frame you want.

## Configuration ##

You can specific your wheelSpy config by calling 

```js
wheelSpy.config(yourConfig:object)
```

Explanation of the config fields:

| Name          | Explanation                                           |
| ------------- | ----------------------------------------------------- |
| wheelSpeed    | a number config mouse wheel speed, default is 1       |
| touchSpeed    | a number config touch move speed, default is 1        |
| keyboardSpeed | a number config speed on keyboard press, default is 1 |
| useTweenLite  | whether use TweenLite or not, default is true         |

## Supported CSS Properties ##

- **box module**
	- width
	- height
	- margin
	- padding
	- border-width
	- line-height
- **positioning**
	- top
	- right
	- left
	- bottom
- **others**
	- opacity
	
CSS shorthand properties is also welcomed, eg: 

```css
margin: 1px 2px 3px 4px;

/* Will be converted to */
margin-top: 1px;
margin-right: 2px;
margin-bottom: 3px;
margin-left: 4px;
```

## Supported CSS Units ##

- px
- em
- rem
- percentage

## License ##

MIT.