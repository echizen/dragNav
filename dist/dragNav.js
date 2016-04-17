/*!
 * nav item drag and scroll
 * https://github.com/Stereobit/dragend
 * customed by @echizen
 * 2016.4.6
 */

// requestAnimationFrame polyfill
(function() {
  var lastTime = 0;
  var vendors = ['ms', 'moz', 'webkit', 'o'];
  for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
  }

  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = function(callback, element) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function() {
          callback(currTime + timeToCall);
        },
        timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };

  if (!window.cancelAnimationFrame)
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
}());

// find polyfill
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function(predicate) {
      if (this == null) {
        throw new TypeError('Array.prototype.find called on null or undefined');
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }
      var list = Object(this);
      var length = list.length >>> 0;
      var thisArg = arguments[1];
      var value;

      for (var i = 0; i < length; i++) {
        if (i in list) {
          value = list[i];
          if (predicate.call(thisArg, value, i, list)) {
            return value;
          }
        }
      }
      return undefined;
    }
  });
}

;
(function(window) {
  "use strict";

  // help the minifier
  var doc = document,
    win = window;

  function init($) {

    // =====================
    //
    // To activate dragNav JS just call the function on a jQuery element
    //
    // $("#swipe-container").dragNav({options});
    // 
    // Settings
    // =====================
    //
    // You can use the following options:
    //
    // * itemClass: classname selector for all elments that should provide a page
    // * wrap: selector which contain itemClass
    // * onSwipeStart: callback function before the animation
    // * onSwipeEnd: callback function after the animation
    // * onDragStart: called on drag start
    // * onDrag: callback on drag
    // * onDragEnd: callback on dragend
    // * duration
    // * stopPropagation
    // * afterInitialize called after the pages are size
    // * itemBorder: item left border
    // * itemWidth:
    // * wrapBorder: wrap width

    // Default setting
    var defaultSettings = {
        itemClass: "dragNav-page",
        wrap: window.document.documentElement,
        minDragDistance: "10",
        onSwipeStart: noop,
        onSwipeEnd: noop,
        onDragStart: noop,
        onDrag: noop,
        onDragEnd: noop,
        afterInitialize: noop,
        stopPropagation: false,
        duration: 300,
        itemBorder: [],
        itemWidth: null,
        wrapBorder: window.document.documentElement.clientWidth
      },

      isTouch = 'ontouchstart' in win,

      startEvent = isTouch ? 'touchstart' : 'mousedown',
      moveEvent = isTouch ? 'touchmove' : 'mousemove',
      endEvent = isTouch ? 'touchend' : 'mouseup',

      errors = {
        pages: "No pages found"
      },

      containerStyles = {
        overflow: "hidden",
        padding: 0
      },

      supports = (function() {
        var div = doc.createElement('div'),
          vendors = 'Khtml Ms O Moz Webkit'.split(' '),
          len = vendors.length;

        return function(prop) {
          if (prop in div.style) return true;

          prop = prop.replace(/^[a-z]/, function(val) {
            return val.toUpperCase();
          });

          while (len--) {
            if (vendors[len] + prop in div.style) {
              return true;
            }
          }
          return false;
        };
      })(),

      supportTransform = supports('transform');

    function noop() {}

    function falseFn() {
      return false;
    }

    function setStyles(element, styles) {

      var property,
        value;

      if ($) {
        window.requestAnimationFrame(function() {
          $(element).css(styles);
        })
      } else {
        for (property in styles) {
          if (styles.hasOwnProperty(property)) {
            value = styles[property];

            switch (property) {
              case "height":
              case "width":
              case "marginLeft":
              case "marginTop":
                value += "px";
            }
            window.requestAnimationFrame(function() {
              element.style[property] = value;
            })
          }
        }
      }
      return element;
    }

    function extend(destination, source) {

      var property;
      for (property in source) {
        destination[property] = source[property];
      }
      return destination;

    }

    function proxy(fn, context) {

      return function() {
        return fn.apply(context, Array.prototype.slice.call(arguments));
      };

    }

    function getElementsByClassName(className, root) {
      var elements;

      if ($) {
        elements = $(root).find("." + className);
      } else {
        elements = Array.prototype.slice.call(root.getElementsByClassName(className));
      }
      return elements;
    }

    function animate(element, propery, to, speed, callback) {
      var propertyObj = {};

      propertyObj[propery] = to;

      if ($) {
        $(element).animate(propertyObj, speed, callback);
      } else {
        setStyles(element, propertyObj);
      }

    }

    /**
     * Returns an object containing the co-ordinates for the event, normalising for touch / non-touch.
     * @param {Object} event
     * @returns {Object}
     */
    function getCoords(event) {
      // touch move and touch end have different touch data
      var touches = event.touches,
        data = touches && touches.length ? touches : event.changedTouches;

      return {
        x: isTouch ? data[0].pageX : event.pageX
      };
    }

    function dragNav(container, settings) {
      var defaultSettingsCopy = extend({}, defaultSettings);
      var centerFir = 0,
        tempBorder = 0;

      this.settings = extend(defaultSettingsCopy, settings);
      this.container = container;
      this.wrap = settings.wrap;
      this.scrollBorder = {
        x: 0
      }; //record active ele border
      this.page = 0;
      this.preventScroll = false;
      this.pageCssProperties = {
        margin: 0
      };
      if (!this.settings.itemWidth) {
        this.settings.itemWidth = document.querySelector(this.settings.itemClass).clientWidth;
      }
      // bind events
      this._onStart = proxy(this._onStart, this);
      this._onMove = proxy(this._onMove, this);
      this._onEnd = proxy(this._onEnd, this);
      this._sizePages = proxy(this._sizePages, this);
      this._afterScrollTransform = proxy(this._afterScrollTransform, this);

      this._scroll = supportTransform ? this._scrollWithTransform : this._scrollWithoutTransform;
      this._animateScroll = supportTransform ? this._animateScrollWithTransform : this._animateScrollWithoutTransform;

      // Initialization
      setStyles(container, containerStyles);

      this.pages = getElementsByClassName(this.settings.itemClass, this.wrap);

      if (this.pages.length) {
        this.pagesCount = this.pages.length;
      } else {
        throw new Error(errors.pages);
      }

      if (!this.settings.itemBorder.length) {
        centerFir = this.pages[0].offsetLeft + this.settings.itemWidth / 2 - this.settings.wrapBorder / 2;
        this.settings.itemBorder.push(centerFir);
        for (var i = 1; i < this.pagesCount; i++) {
          tempBorder = centerFir + i * this.settings.itemWidth;
          this.settings.itemBorder.push(tempBorder);
        };
      }

      this.updateInstance(settings, true);
      this._observe();
      this.settings.afterInitialize.call(this);
    }

    function addEventListener(container, event, callback) {
      if ($) {
        $(container).on(event, callback);
      } else {
        container.addEventListener(event, callback, false);
      }
    }

    function removeEventListener(container, event, callback) {
      if ($) {
        $(container).off(event, callback);
      } else {
        container.removeEventListener(event, callback, false);
      }
    }

    extend(dragNav.prototype, {

      // Private functions
      // =================

      // ### Overscroll lookup table

      // calculate real scrcolling distance
      // x: moved x distance
      // y: moved y distance
      _checkOverscroll: function(direction, x) {
        var coordinates = {
          x: x,
          overscroll: true
        };

        var itemBorder = this.settings.itemBorder;

        switch (direction) {

          case "right":
            if (x + this.scrollBorder.x >= itemBorder[0]) {
              coordinates.x = Math.round(-this.scrollBorder.x + x / 5);
              return coordinates;
            }
            break;

          case "left":
            // scroll after right border
            if (itemBorder[itemBorder.length - 1] <= -x + this.scrollBorder.x) {
              coordinates.x = Math.round(-this.scrollBorder.x + x / 5);
              return coordinates;
            }
            break;
        }

        return {
          x: x - this.scrollBorder.x,
          overscroll: false
        };
      },

      // Observe
      //
      // Sets the observers for drag, resize and key events

      _observe: function() {

        addEventListener(this.container, startEvent, this._onStart);
        this.container.onselectstart = falseFn;
        this.container.ondragstart = falseFn;
      },


      _onStart: function(event) {

        event = event.originalEvent || event;

        if (this.settings.stopPropagation) {
          event.stopPropagation();
        }

        addEventListener(doc.body, moveEvent, this._onMove);
        addEventListener(doc.body, endEvent, this._onEnd);

        this.startCoords = getCoords(event); // for performance , store start coords

        this.settings.onDragStart.call(this, event);

      },

      _onMove: function(event) {
        var cancelId;
        var cancelPreventScroll = function() {
          this.preventScroll = false;
          clearTimeout(cancelId);
        };
        cancelPreventScroll = proxy(cancelPreventScroll, this);

        event = event.originalEvent || event;

        // ensure swiping with one touch and not pinching
        if (event.touches && event.touches.length > 1 || event.scale && event.scale !== 1) return;

        event.preventDefault();
        if (this.settings.stopPropagation) {
          event.stopPropagation();
        }

        var parsedEvent = this._parseEvent(event), //get direction and move distance
          coordinates = this._checkOverscroll(parsedEvent.direction, -parsedEvent.distanceX);

        this.settings.onDrag.call(this, this.activeElement, parsedEvent, coordinates.overscroll, event);

        if (!this.preventScroll) {
          this.coordinates = coordinates;
          this._scroll(coordinates);
        } else {
          // transitionEnd偶尔不发生
          cancelId = setTimeout(cancelPreventScroll, 100)
        }

      },

      _onEnd: function(event) {

        event = event.originalEvent || event;

        if (this.settings.stopPropagation) {
          event.stopPropagation();
        }

        var parsedEvent = this._parseEvent(event);

        this.startCoords = {
          x: 0
        };

        if (Math.abs(parsedEvent.distanceX) > this.settings.minDragDistance) {
          // for call swipe callback before scroll occur and scroll over complete item
          this.swipe(parsedEvent.direction);
        } else if (parsedEvent.distanceX > 0) {
          // scroll a little to after touch,no _calcNewPage
          this._scrollToPage();
        }

        this.settings.onDragEnd.call(this, this.container, this.activeElement, this.page, event);

        removeEventListener(doc.body, moveEvent, this._onMove);
        removeEventListener(doc.body, endEvent, this._onEnd);

      },

      _parseEvent: function(event) {
        var coords = getCoords(event), //touch coordinates
          x = this.startCoords.x - coords.x; // moved distance

        return this._addDistanceValues(x); //add direction
      },

      _addDistanceValues: function(x) {
        var eventData = {
          distanceX: 0
        };

        eventData.distanceX = x;
        eventData.direction = x > 0 ? "left" : "right";

        return eventData;
      },

      setContainerCssValues: function() {
        extend(this.pageCssProperties, {
          "cssFloat": "left",
          "overflowY": "auto",
          "overflowX": "hidden",
          "padding": 0,
          "display": "block"
        });

        var containerWidth = 0;
        var borderLen = this.settings.itemBorder && this.settings.itemBorder.length;
        containerWidth = this.settings.itemBorder[borderLen - 1] + this.settings.wrapBorder;

        setStyles(this.wrap, {
          "overflow": "hidden",
          "width": containerWidth,
          "boxSizing": "content-box",
          "-webkit-backface-visibility": "hidden",
          "-webkit-perspective": 1000,
          "margin": 0,
          "padding": 0
        });
      },

      // ### Size pages

      _sizePages: function() {

        var pagesCount = this.pages.length;

        this.coordinates = {
          x: 0,
          overscroll: true
        }

        this.setContainerCssValues();

        for (var i = 0; i < pagesCount; i++) {
          setStyles(this.pages[i], this.pageCssProperties);
        }

        this._jumpToPage("page", this.page);

      },

      // ### Callculate new page
      //
      // Update global values for specific swipe action
      //
      // Takes direction and, if specific page is used the pagenumber

      _calcNewPage: function(direction, pageNumber) {

        var page = this.page,
          border = this.settings.itemBorder,
          borderLen = border.length,
          absCoordinatesX = Math.abs(this.coordinates.x),
          leftDis, rightDis;

        var getScrollBorder = function() {
          if (this.coordinates.x > 0 || absCoordinatesX < border[0]) {
            this.scrollBorder.x = border[0];
            this.page = 0;


          } else if (absCoordinatesX > border[borderLen - 1]) {
            this.scrollBorder.x = border[borderLen - 1];
            this.page = borderLen - 1;

          } else {
            for (var i = 0; i < border.length; i++) {

              leftDis = absCoordinatesX - border[i];
              rightDis = border[i + 1] - absCoordinatesX;

              if (leftDis > 0 && rightDis > 0) {
                if (leftDis - rightDis > 0) {
                  this.scrollBorder.x = border[i + 1];
                  this.page = i + 1;
                  break;
                } else {
                  this.scrollBorder.x = border[i];
                  this.page = i;
                  break;
                }
              }
            }
          }
        }

        getScrollBorder = proxy(getScrollBorder, this);

        if (border && border.length) {

          switch (direction) {
            case "page":
              this.scrollBorder.x = border[pageNumber];
              this.page = pageNumber;
              break;

            case "left":
              if (page < this.pagesCount - 1) {
                getScrollBorder();
              }
              break;

            case "right":
              if (page > 0) {
                getScrollBorder();
              }
              break;

            default:
              this.scrollBorder.x = 0;
              this.page = 0;
              break;
          }
          return;
        }
      },

      // ### On swipe end
      //
      // Function called after the scroll animation ended

      _onSwipeEnd: function() {
        this.preventScroll = false;

        this.activeElement = this.pages[this.page * this.settings.itemsInPage];

        // Call onSwipeEnd callback function
        this.settings.onSwipeEnd.call(this, this.container, this.activeElement, this.page);
      },

      // Jump to page
      //
      // Jumps without a animantion to specific page. The page number is only
      // necessary for the specific page direction
      //
      // Takes:
      // Direction and pagenumber

      _jumpToPage: function(options, pageNumber) {

        if (options) {
          this._calcNewPage(options, pageNumber);
        }

        this._scroll({
          x: -this.scrollBorder.x
        });
      },

      // Scroll to page
      //
      // Scrolls with a animantion to specific page. The page number is only necessary
      // for the specific page direction
      //
      // Takes:
      // Direction and pagenumber

      _scrollToPage: function(options, pageNumber) {
        this.preventScroll = true;

        if (options) this._calcNewPage(options, pageNumber);

        this._animateScroll();
      },

      // ### Scroll translate
      //
      // Animation when translate is supported
      //
      // Takes:
      // x and y values to go with

      _scrollWithTransform: function(coordinates) {
        var style = "translateX(" + coordinates.x + "px)";

        setStyles(this.wrap, {
          "-webkit-transform": style,
          "-moz-transform": style,
          "-ms-transform": style,
          "-o-transform": style,
          "transform": style
        });

        this.activeElement = this.pages[this.page * this.settings.itemsInPage];
      },

      // ### Animated scroll with translate support

      _animateScrollWithTransform: function() {

        var style = "transform " + this.settings.duration + "ms ease-out",
          container = this.container,
          afterScrollTransform = this._afterScrollTransform;

        setStyles(this.wrap, {
          "-webkit-transition": "-webkit-" + style,
          "-moz-transition": "-moz-" + style,
          "-ms-transition": "-ms-" + style,
          "-o-transition": "-o-" + style,
          "transition": style
        });
        // after add Animated,then scroll ele
        this._scroll({
          x: -this.scrollBorder.x
        });

        addEventListener(this.container, "webkitTransitionEnd", afterScrollTransform);
        addEventListener(this.container, "oTransitionEnd", afterScrollTransform);
        addEventListener(this.container, "transitionend", afterScrollTransform);
        addEventListener(this.container, "transitionEnd", afterScrollTransform);

      },

      _afterScrollTransform: function() {

        var container = this.container,
          afterScrollTransform = this._afterScrollTransform;

        this._onSwipeEnd();

        removeEventListener(container, "webkitTransitionEnd", afterScrollTransform);
        removeEventListener(container, "oTransitionEnd", afterScrollTransform);
        removeEventListener(container, "transitionend", afterScrollTransform);
        removeEventListener(container, "transitionEnd", afterScrollTransform);

        setStyles(this.wrap, {
          "-webkit-transition": "",
          "-moz-transition": "",
          "-ms-transition": "",
          "-o-transition": "",
          "transition": ""
        });

      },

      // ### Scroll fallback
      //
      // Animation lookup table  when translate isn't supported
      //
      // Takes:
      // x and y values to go with

      _scrollWithoutTransform: function(coordinates) {
        var styles = {
          "marginLeft": coordinates.x
        };

        setStyles(this.wrap, styles);
      },

      // ### Animated scroll without translate support

      _animateScrollWithoutTransform: function() {
        var property = "marginLeft",
          value = -this.scrollBorder.x;

        animate(this.wrap, property, value, this.settings.duration, proxy(this._onSwipeEnd, this));
        this._onSwipeEnd();
      },

      // Public functions
      // ================

      swipe: function(direction) {
        // Call onSwipeStart callback function
        this._scrollToPage(direction);
        this.settings.onSwipeStart.call(this, this.container, this.activeElement, this.page);
      },

      updateInstance: function(settings, isInit) {

        settings = settings || {};

        if (typeof settings === "object") extend(this.settings, settings);

        this.activeElement = this.pages[this.page];
        if (isInit) {
          this._sizePages();
        }

        if (this.settings.jumpToPage) {
          this.jumpToPage(settings.jumpToPage);
          delete this.settings.jumpToPage;
        }

        if (this.settings.scrollToPage != undefined) {
          this.scrollToPage(this.settings.scrollToPage);
          delete this.settings.scrollToPage;
        }

        if (this.settings.destroy) {
          this.destroy();
          delete this.settings.destroy;
        }

      },

      destroy: function() {

        var container = this.container;

        removeEventListener(container, startEvent);
        removeEventListener(container, moveEvent);
        removeEventListener(container, endEvent);

        container.removeAttribute("style");

        for (var i = 0; i < this.pages.length; i++) {
          this.pages[i].removeAttribute("style");
        }

      },

      scrollToPage: function(page) {
        this._scrollToPage("page", page);
      },

      jumpToPage: function(page) {
        this._jumpToPage("page", page);
      }

    });

    window.instanceList = [];

    if ($) {

      // Register jQuery plugin
      $.fn.dragNav = function(settings) {

        settings = settings || {};

        this.each(function() {
          var tempInstance = {};
          var thisInstanceObj = window.instanceList.find(function(item) {
            return item.ele = $(this)
          })

          var instance = thisInstanceObj && thisInstanceObj.instance;

          // check if instance already created
          if (instance) {
            instance.updateInstance(settings);
          } else {
            instance = new dragNav(this, settings);
            tempInstance.instance = instance;
            tempInstance.ele = $(this);
            window.instanceList.push(tempInstance);
          }
        });

        // jQuery functions should always return the instance
        return this;
      };

    }

    return dragNav;

  }

  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    define(function() {
      return init(win.jQuery || win.Zepto);
    });
  } else {
    win.dragNav = init(win.jQuery || win.Zepto);
  }

})(window);