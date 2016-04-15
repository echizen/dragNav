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
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
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

 ;(function( window ) {
  "use strict";

  // help the minifier
  var doc = document,
      win = window;

  function init( $ ) {

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
    // * pageClass: classname selector for all elments that should provide a page
    
    // * minDragDistance: minuimum distance (in pixel) the user has to drag
    //   to trigger swip
    // * scribe: pixel value for a possible scribe
    // * onSwipeStart: callback function before the animation
    // * onSwipeEnd: callback function after the animation
    // * onDragStart: called on drag start
    // * onDrag: callback on drag
    // * onDragEnd: callback on dragend
    // * onScrollStart: callback after scroll start
    // * borderBetweenPages: if you need space between pages add a pixel value
    // * duration
    // * stopPropagation
    // * afterInitialize called after the pages are size
    // * preventDrag if want to prevent user interactions and only swipe manualy
    // * itemBorder: item left border
    // * itemWidth
    
      // Default setting
    var  defaultSettings = {
        pageClass          : "dragNav-page",
        pageContainer      : document.querySelector(".container"),
        minDragDistance    : "40",
        onSwipeStart       : noop,
        onSwipeEnd         : noop,
        onDragStart        : noop,
        onDrag             : noop,
        onDragEnd          : noop,
        onScrollStart      : noop,
        afterInitialize    : noop,
        stopPropagation    : false,
        itemsInPage        : 1,
        scribe             : 0,
        borderBetweenPages : 0,
        duration           : 300,
        itemBorder         : [],
        itemWidth          : null 
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
        padding : 0
      },

      supports = (function() {
         var div = doc.createElement('div'),
             vendors = 'Khtml Ms O Moz Webkit'.split(' '),
             len = vendors.length;

         return function( prop ) {
            if ( prop in div.style ) return true;

            prop = prop.replace(/^[a-z]/, function(val) {
               return val.toUpperCase();
            });

            while( len-- ) {
               if ( vendors[len] + prop in div.style ) {
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

    function setStyles( element, styles ) {

      window.requestAnimationFrame(function(){
        $(element).css(styles);
      })
      return element;

    }

    function extend( destination, source ) {

      var property;

      for ( property in source ) {
        destination[property] = source[property];
      }

      return destination;

    }

    function proxy( fn, context ) {

      return function() {
        return fn.apply( context, Array.prototype.slice.call(arguments) );
      };

    }

    function getElementsByClassName( className, root ) {
      var elements;

      if ( $ ) {
        elements = $(root).find("." + className);
      } else {
        elements = Array.prototype.slice.call(root.getElementsByClassName( className ));
      }

      return elements;
    }

    function animate( element, propery, to, speed, callback ) {
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

    function dragNav( container, settings ) {
      var defaultSettingsCopy = extend( {}, defaultSettings );

      this.settings      = extend( defaultSettingsCopy, settings );
      this.container     = container;
      // this.pageContainer = doc.createElement( "div" );
      this.pageContainer = settings.pageContainer;
      this.scrollBorder  = { x: 0 };//record active ele border
      this.page          = 0;
      this.preventScroll = false;
      this.pageCssProperties = {
        margin: 0
      };
      if(!this.settings.itemWidth){
        this.settings.itemWidth = document.querySelector(this.settings.pageClass);
      }

      // bind events
      this._onStart = proxy( this._onStart, this );
      this._onMove = proxy( this._onMove, this );
      this._onEnd = proxy( this._onEnd, this );
      this._sizePages = proxy( this._sizePages, this );
      this._afterScrollTransform = proxy(this._afterScrollTransform, this);

      this._scroll = supportTransform ? this._scrollWithTransform : this._scrollWithoutTransform;
      this._animateScroll = supportTransform ? this._animateScrollWithTransform : this._animateScrollWithoutTransform;

      // Initialization

      setStyles(container, containerStyles);

      this.updateInstance( settings,true );
      if (!this.settings.preventDrag) {
        this._observe();
      }
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
      _checkOverscroll: function( direction, x ) {
        var coordinates = {
          x: x,
          overscroll: true
        };

        var itemBorder = this.settings.itemBorder;

        switch ( direction ) {

          case "right":
            if(itemBorder&&itemBorder.length){
              if ( this.scrollBorder.x <= itemBorder[0] ) {
                coordinates.x = Math.round( - this.scrollBorder.x + x / 5 );
                return coordinates;
              }
            }else{
              if ( this.scrollBorder.x <=0 ) {
                coordinates.x = Math.round(-this.scrollBorder.x +x / 5 );
                return coordinates;
              }
            }
            break;

          case "left":
            // scroll after right border
            if(itemBorder&&itemBorder.length){
              if ( itemBorder[itemBorder.length-1] <= this.scrollBorder.x ) {
                coordinates.x = Math.round( - this.scrollBorder.x + x / 5 );
                return coordinates;
              }
            }else{
              if ( (this.pagesCount-1 ) * this.pageDimentions.width <= this.scrollBorder.x ) {
                coordinates.x = Math.round( - Math.ceil(this.pagesCount-1) * (this.pageDimentions.width + this.settings.borderBetweenPages) + x / 5 );
                return coordinates;
              }
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

        this.settings.onDragStart.call( this, event );

      },

      _onMove: function( event ) {
        var cancelId;
        var cancelPreventScroll = function(){
          this.preventScroll = false;
          clearTimeout(cancelId);
        };
        cancelPreventScroll = proxy(cancelPreventScroll,this);

        event = event.originalEvent || event;

        // ensure swiping with one touch and not pinching
        if ( event.touches && event.touches.length > 1 || event.scale && event.scale !== 1) return;

        event.preventDefault();
        if (this.settings.stopPropagation) {
          event.stopPropagation();
        }

        var parsedEvent = this._parseEvent(event),//get direction and move distance
            coordinates = this._checkOverscroll( parsedEvent.direction , - parsedEvent.distanceX);

        this.settings.onDrag.call( this, this.activeElement, parsedEvent, coordinates.overscroll, event );

        if ( !this.preventScroll ) {
          this.coordinates = coordinates;
          this._scroll( coordinates );
        }else{
          // transitionEnd偶尔不发生
          cancelId = setTimeout(cancelPreventScroll,100)
        }


        
      },

      _onEnd: function( event ) {

        event = event.originalEvent || event;

        if (this.settings.stopPropagation) {
          event.stopPropagation();
        }

        var parsedEvent = this._parseEvent(event);

        this.startCoords = { x: 0 };
        
        if ( Math.abs(parsedEvent.distanceX) > this.settings.minDragDistance) {
          // for call swipe callback before scroll occur and scroll over complete item
          this.swipe( parsedEvent.direction );
        } else if (parsedEvent.distanceX > 0) {
          // scroll a little to after touch
          this._scrollToPage();
        }

        this.settings.onDragEnd.call( this, this.container, this.activeElement, this.page, event );

        removeEventListener(doc.body, moveEvent, this._onMove);
        removeEventListener(doc.body, endEvent, this._onEnd);

      },

      _parseEvent: function( event ) {
        var coords = getCoords(event),//touch coordinates
            x = this.startCoords.x - coords.x;// moved distance

        return this._addDistanceValues( x);//add direction
      },

      _addDistanceValues: function( x ) {
        var eventData = {
          distanceX: 0
        };

        eventData.distanceX = x;
        eventData.direction = x > 0 ? "left" : "right";
        
        return eventData;
      },
     _setHorizontalContainerCssValues : function() {
        extend( this.pageCssProperties, {
          "cssFloat" : "left",
          "overflowY": "auto",
          "overflowX": "hidden",
          "padding"  : 0,
          // "display"  : "block"
        });

        var containerWidth = 0;
        var borderLen = this.settings.itemBorder && this.settings.itemBorder.length;
        if(this.settings.itemBorder.length){
          containerWidth = this.settings.itemBorder[borderLen-1]+$(this.pageContainer).parent().width();
        }else{
          containerWidth = (this.pageDimentions.width + this.settings.borderBetweenPages) * this.pagesCount
        }

        setStyles(this.pageContainer, {
          "overflow"                   : "hidden",
          "width"                      : containerWidth,
          "boxSizing"                  : "content-box",
          "-webkit-backface-visibility": "hidden",
          "-webkit-perspective"        : 1000,
          "margin"                     : 0,
          "padding"                    : 0
        });
      },

      setContainerCssValues: function(){
        this._setHorizontalContainerCssValues();
      },

      // ### Calculate page dimentions
      // Updates the page dimentions values

      _setPageDimentions: function() {
        var width  = this.container.offsetWidth,
            height = this.container.offsetHeight;

        width = width - parseInt( this.settings.scribe, 10 );

        this.pageDimentions = {
          width : this.settings.itemWidth,
          height: height
        };

        this.coordinates = {
          x : 0,
          overscroll : true
        }

      },

      // ### Size pages

      _sizePages: function() {

        var pagesCount = this.pages.length;

        this._setPageDimentions();

        this.setContainerCssValues();

        for (var i = 0; i < pagesCount; i++) {
          setStyles(this.pages[i], this.pageCssProperties);
        }

        this._jumpToPage( "page", this.page );

      },

      // ### Callculate new page
      //
      // Update global values for specific swipe action
      //
      // Takes direction and, if specific page is used the pagenumber

      _calcNewPage: function( direction, pageNumber ) {

        var borderBetweenPages = this.settings.borderBetweenPages,
            // height = this.itemDimentions.height,
            // width = this.itemDimentions.width,
            height = this.pageDimentions.height,
            width = this.pageDimentions.width,
            page = this.page,
            irregularBorder = this.settings.itemBorder,
            irregularBorderLen = irregularBorder.length,
            absCoordinatesX = Math.abs(this.coordinates.x),
            leftDis,rightDis;

        var getScrollBorder = function(){
            if(this.coordinates.x>0 || absCoordinatesX<irregularBorder[0]){
              this.scrollBorder.x = irregularBorder[0];
              this.page = 0;
              

            }else if(absCoordinatesX>irregularBorder[irregularBorderLen-1]){
              this.scrollBorder.x = irregularBorder[irregularBorderLen-1];
              this.page = irregularBorderLen-1;

            }else{
              for(var i=0 ; i< irregularBorder.length ;i++){

                leftDis = absCoordinatesX - irregularBorder[i]; 
                rightDis = irregularBorder[i+1] - absCoordinatesX;

                if( leftDis>0 && rightDis>0 ){
                  if(leftDis - rightDis>0){
                    this.scrollBorder.x = irregularBorder[i+1];
                    this.page = i+1;
                    break;
                  }else{
                    this.scrollBorder.x = irregularBorder[i];
                    this.page = i;
                    break;
                  }
                }
              }
            }
        }

        getScrollBorder = proxy(getScrollBorder,this);

        if(irregularBorder && irregularBorder.length){

          switch (direction){
            case "page":
              this.scrollBorder.x = irregularBorder[pageNumber];
              this.page = pageNumber;
              break;

            case "left":
              if ( page < this.pagesCount - 1 ) {
                getScrollBorder(); 
              }
            break; 

            case "right":
              if ( page > 0 ) {  
                getScrollBorder();
              }
              break;
          }
          return;
        }

        switch ( direction ) {

          case "left":
            if ( page < this.pagesCount - 1 ) {
              this.scrollBorder.x = this.scrollBorder.x + width + borderBetweenPages;
              this.page++;
            }
            break;

          case "right":
            if ( page > 0 ) {
              this.scrollBorder.x = this.scrollBorder.x - width - borderBetweenPages;
              this.page--;
            }
            break;

          case "page":  
            this.scrollBorder.x = (width + borderBetweenPages) * pageNumber;
            this.page = pageNumber;
            break;

          default:
            this.scrollBorder.x = 0;
            this.page           = 0;
            break;
        }
      },

      // ### On swipe end
      //
      // Function called after the scroll animation ended

      _onSwipeEnd: function() {
        this.preventScroll = false;

        this.activeElement = this.pages[this.page * this.settings.itemsInPage];

        // Call onSwipeEnd callback function
        this.settings.onSwipeEnd.call( this, this.container, this.activeElement, this.page);
      },

      // Jump to page
      //
      // Jumps without a animantion to specific page. The page number is only
      // necessary for the specific page direction
      //
      // Takes:
      // Direction and pagenumber

      _jumpToPage: function( options, pageNumber ) {

        if ( options ) {
          this._calcNewPage( options, pageNumber );
        }

        this._scroll({
          x: - this.scrollBorder.x
        });
      },

      // Scroll to page
      //
      // Scrolls with a animantion to specific page. The page number is only necessary
      // for the specific page direction
      //
      // Takes:
      // Direction and pagenumber

      _scrollToPage: function( options, pageNumber ) {
        this.preventScroll = true;

        if ( options ) this._calcNewPage( options, pageNumber );

        this._animateScroll();
      },

      // ### Scroll translate
      //
      // Animation when translate is supported
      //
      // Takes:
      // x and y values to go with

      _scrollWithTransform: function ( coordinates ) {
        var style = "translateX(" + coordinates.x + "px)" ;

        setStyles( this.pageContainer, {
          "-webkit-transform": style,
          "-moz-transform": style,
          "-ms-transform": style,
          "-o-transform": style,
          "transform": style
        });

        this.activeElement = this.pages[this.page * this.settings.itemsInPage];
        this.settings.onScrollStart.call( this, this.container, this.activeElement, this.page );

      },

      // ### Animated scroll with translate support

      _animateScrollWithTransform: function() {

        var style = "transform " + this.settings.duration + "ms ease-out",
            container = this.container,
            afterScrollTransform = this._afterScrollTransform;

        setStyles( this.pageContainer, {
          "-webkit-transition": "-webkit-" + style,
          "-moz-transition": "-moz-" + style,
          "-ms-transition": "-ms-" + style,
          "-o-transition": "-o-" + style,
          "transition": style
        });
        // after add Animated,then scroll ele
        this._scroll({
          x: - this.scrollBorder.x
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

        setStyles( this.pageContainer, {
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

      _scrollWithoutTransform: function( coordinates ) {
        var styles =  { "marginLeft": coordinates.x } ;

        setStyles(this.pageContainer, styles);
      },

      // ### Animated scroll without translate support

      _animateScrollWithoutTransform: function() {
        var property = "marginLeft" ,
            value = - this.scrollBorder.x ;

        animate( this.pageContainer, property, value, this.settings.duration, proxy( this._onSwipeEnd, this ));
        this._onSwipeEnd();
      },

      // Public functions
      // ================

      swipe: function( direction ) {
        // Call onSwipeStart callback function
        this._scrollToPage( direction );
        this.settings.onSwipeStart.call( this, this.container, this.activeElement, this.page );
      },

      updateInstance: function( settings,isInit ) {

        settings = settings || {};

        if ( typeof settings === "object" ) extend( this.settings, settings );

        this.pages = getElementsByClassName(this.settings.pageClass, this.pageContainer);

        if (this.pages.length) {
          this.pagesCount = this.pages.length;
        } else {
          throw new Error(errors.pages);
        }

        this.activeElement = this.pages[this.page * this.settings.itemsInPage];
        if(isInit){
          this._sizePages();
        }
        
        if ( this.settings.jumpToPage ) {
          this.jumpToPage( settings.jumpToPage );
          delete this.settings.jumpToPage;
        }

        if ( this.settings.scrollToPage!=undefined ) {
          this.scrollToPage( this.settings.scrollToPage );
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

      scrollToPage: function( page ) {
        this._scrollToPage( "page", page);
      },

      jumpToPage: function( page ) {
        this._jumpToPage( "page", page);
      }

    });

    window.instanceList=[];

    if ( $ ) {

        // Register jQuery plugin
        $.fn.dragNav = function( settings ) {

          settings = settings || {};

          this.each(function() {
            var tempInstance = {};
            var thisInstanceObj = window.instanceList.find(function(item){
              return item.ele = $(this)
            })

            var instance = thisInstanceObj && thisInstanceObj.instance;

            // check if instance already created
            if ( instance ) {
              instance.updateInstance( settings );
            } else {
              instance = new dragNav( this, settings );
              tempInstance.instance = instance;
              tempInstance.ele = $(this);
              window.instanceList.push(tempInstance);
            }

            // check if should trigger swipe
            if ( typeof settings === "string" ) instance.swipe( settings );

          });

          // jQuery functions should always return the instance
          return this;
        };

    }

    return dragNav;

  }

  if ( typeof define == 'function' && typeof define.amd == 'object' && define.amd ) {
      define(function() {
        return init( win.jQuery || win.Zepto );
      });
  } else {
      win.dragNav = init( win.jQuery || win.Zepto );
  }

})( window );