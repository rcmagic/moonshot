(function(exports) {
  'use strict';

  var events = require('events');
  var sys = require('sys');
  var gui = window.require('nw.gui');
  var win = gui.Window.get();

  var _ = window._,
      $ = window.$;
  var Gamepad = window.Gamepad;

  var Input = function(gamepad){
    events.EventEmitter.call(this);
    this.gamepad = gamepad;
  };

  sys.inherits(Input, events.EventEmitter);

  _.extend(Input.prototype, {
    gamepad: null
    ,_btnDown: null

    ,init: function(gamepad, updateStrategy) {
      // Reinitializing? Teardown first.
      if (this.gamepad) {
        this.teardown();
      }

      this._btnDown = {};
      this.gamepad = gamepad;

      // Start, coin, action keys
      var mapping = {};
      mapping[Input.keys['SPACE']]  = 'action';	  
      mapping[Input.keys['RIGHT_BRACKET']]  = 'action';
      mapping[Input.keys['1']]    = 'start1';
      mapping[Input.keys['2']]    = 'start2';
      mapping[Input.keys['3']]    = 'start3';
      mapping[Input.keys['4']]    = 'start4';
      mapping[Input.keys['9']]    = 'coin1';
      mapping[Input.keys['0']]    = 'coin2';
      // DEBUGGING KEYS
      mapping[Input.keys['F']]           = 'fullscreen';
      mapping[Input.keys['Q']]           = 'quit';
      mapping[Input.keys['I']]           = 'inspector';
      mapping[Input.keys['LEFT_ARROW']]  = 'left';
      mapping[Input.keys['RIGHT_ARROW']] = 'right';
      mapping[Input.keys['UP_ARROW']]    = 'up';
      mapping[Input.keys['DOWN_ARROW']]  = 'down';

      _.extend(mapping, {
        AXIS_LEFT:            'left'
        ,AXIS_UP:             'up'
        ,AXIS_RIGHT:          'right'
        ,AXIS_DOWN:           'down'
        ,FACE_1:              'button1'
        ,FACE_2:              'button2'
        ,FACE_3:              'button3'
        ,FACE_4:              'button4'
        ,LEFT_TOP_SHOULDER:   'button5'
        ,RIGHT_TOP_SHOULDER:  'button6'
      });

      // Handle meta element key bindings
      $(window).keydown( _.bind(this.keydown, this) );
      $(window).keyup( _.bind(this.keyup, this) );

      gamepad.bind(Gamepad.Event.CONNECTED, _.bind(function(device) {
        this.emit('gamepad_connected', device);
      }, this));

      gamepad.bind(Gamepad.Event.DISCONNECTED, _.bind(function(device) {
        this.emit('gamepad_disconnected', device);
      }, this));

      gamepad.bind(Gamepad.Event.BUTTON_DOWN, _.bind(function(e) {
        this.pressed( mapping[e.control], e.gamepad.index );
      }, this));

      gamepad.bind(Gamepad.Event.BUTTON_UP, _.bind(function(e) {
        this.released( mapping[e.control], e.gamepad.index );
      }, this));

      gamepad.bind(Gamepad.Event.AXIS_CHANGED, _.bind(function(e) {
        // TODO: Use a state machine for button/axis transitions.
        if (e.axis === 'LEFT_STICK_X') {
          e.value < 0 ? this.pressed(mapping.AXIS_LEFT, e.gamepad.index)   : this.released(mapping.AXIS_LEFT, e.gamepad.index);
          e.value > 0 ? this.pressed(mapping.AXIS_RIGHT, e.gamepad.index)  : this.released(mapping.AXIS_RIGHT, e.gamepad.index);
        }

        if (e.axis === 'LEFT_STICK_Y') {
          e.value < 0 ? this.pressed(mapping.AXIS_UP, e.gamepad.index)   : this.released(mapping.AXIS_UP, e.gamepad.index);
          e.value > 0 ? this.pressed(mapping.AXIS_DOWN, e.gamepad.index) : this.released(mapping.AXIS_DOWN, e.gamepad.index);
        }
      }, this));

      this.mapping = mapping;
      this.gamepad = gamepad;

      this.gamepad.init();
    }

    ,keydown: function(e){
      var key = e.keyCode || e.which;
      var event = this.mapping[key];
      if (event) {
        this.pressed(event, null);
        e.stopPropagation();
        e.preventDefault();
      }
    }

    ,keyup: function(e){
      var key = e.keyCode || e.which;
      var event = this.mapping[key];
      if (event) {
        this.released(event, null);
        e.stopPropagation();
        e.preventDefault();
      }
    }

    ,pressed: function( name, padnum ) {
      if (this.setButtonState(name, padnum, true)) {
        this.emit('button_down', name, padnum);
      }
    }

    ,released: function( name, padnum ) {
      if (this.setButtonState(name, padnum, false)) {
        this.emit('button_up', name, padnum);
      }
    }

    ,setButtonState: function( name, padnum, state ) {
      var btn = name + '-' + padnum;
      this._btnDown[btn] = this._btnDown[btn] || false;

      // No change? No state was set.
      if (this._btnDown[btn] === state) {
        return false;
      }

      this._btnDown[btn] = state;
      return true;
    }

    // Start a manual update loop. Must be used with
    //   Input.instance.init(new Gamepad.ManualUpdateStrategy()).
    ,tick: function() {
      this.gamepad.updateStrategy.update();
      // Gamepad.js only fires TICK events when gamepads are attached. Fix that.
      if (this._gamepad.gamepads.length === 0) {
        this._gamepad._fire(Gamepad.Event.TICK, this._gamepad.gamepads);
      }
      // Loop
      window.requestAnimationFrame( _.bind(this.tick, this) );
    }

    ,teardown: function() {
      var events = [
        'gamepad_connected'
        ,'gamepad_disconnected'
        ,'button_down'
        ,'button_up',
      ];

      _(events).each(_.bind(function(event){
        this.removeAllListeners(event);
      }, this));
    }
  });

  _.extend(Input, {
    instance: function() {
      if (!Input._instance) {
        Input._instance = new Input();
      }

      return Input._instance;
    }

    // Shamelessly stolen from CraftyJS.
    ,keys: {
      'BACKSPACE': 8,
      'TAB': 9,
      'ENTER': 13,
      'PAUSE': 19,
      'CAPS': 20,
      'ESC': 27,
      'SPACE': 32,
      'PAGE_UP': 33,
      'PAGE_DOWN': 34,
      'END': 35,
      'HOME': 36,
      'LEFT_ARROW': 37,
      'UP_ARROW': 38,
      'RIGHT_ARROW': 39,
      'DOWN_ARROW': 40,
      'INSERT': 45,
      'DELETE': 46,
      '0': 48,
      '1': 49,
      '2': 50,
      '3': 51,
      '4': 52,
      '5': 53,
      '6': 54,
      '7': 55,
      '8': 56,
      '9': 57,
      'A': 65,
      'B': 66,
      'C': 67,
      'D': 68,
      'E': 69,
      'F': 70,
      'G': 71,
      'H': 72,
      'I': 73,
      'J': 74,
      'K': 75,
      'L': 76,
      'M': 77,
      'N': 78,
      'O': 79,
      'P': 80,
      'Q': 81,
      'R': 82,
      'S': 83,
      'T': 84,
      'U': 85,
      'V': 86,
      'W': 87,
      'X': 88,
      'Y': 89,
      'Z': 90,
      'NUMPAD_0': 96,
      'NUMPAD_1': 97,
      'NUMPAD_2': 98,
      'NUMPAD_3': 99,
      'NUMPAD_4': 100,
      'NUMPAD_5': 101,
      'NUMPAD_6': 102,
      'NUMPAD_7': 103,
      'NUMPAD_8': 104,
      'NUMPAD_9': 105,
      'MULTIPLY': 106,
      'ADD': 107,
      'SUBSTRACT': 109,
      'DECIMAL': 110,
      'DIVIDE': 111,
      'F1': 112,
      'F2': 113,
      'F3': 114,
      'F4': 115,
      'F5': 116,
      'F6': 117,
      'F7': 118,
      'F8': 119,
      'F9': 120,
      'F10': 121,
      'F11': 122,
      'F12': 123,
      'SHIFT': 16,
      'CTRL': 17,
      'ALT': 18,
      'PLUS': 187,
      'COMMA': 188,
      'MINUS': 189,
      'PERIOD': 190,
      'PULT_UP': 29460,
      'PULT_DOWN': 29461,
      'PULT_LEFT': 4,
      'PULT_RIGHT': 5,
	  'LEFT_BRACKET': 91,	  
	  'RIGHT_BRACKET': 93
    }
  });

  exports.Input = Input;

})(((typeof(module) !== 'undefined') && module.exports) || window);
