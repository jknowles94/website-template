/*global window document clearTimeout setTimeout */

(function (window, document, undefined, factory) {
  if (typeof define === 'function' && define.amd) {
    define(function() {
        return factory(window, document, undefined);
    });
  }
  else if (typeof exports === 'object') {
    module.exports = factory;
  }
  else {
    window.ssm = factory(window, document, undefined);
  }
})(window, document, undefined, function (window, document, undefined) {
    'use strict';

    var resizeTimeout = 25;
    var stateChangeMethod = function(){};

    function Error(message) {
       this.message = message;
       this.name = "Error";
    }

    //
    // State Constructor
    // When the user uses addState state manager will create instances of a State
    //

    function State(options) {
        this.id = options.id || makeID();
        this.query = options.query || 'all';
        // These are exposed as part of the state, not options so delete before
        // we merge these into default options.
        delete options.id;
        delete options.query;

        var defaultOptions = {
            onEnter: [],
            onLeave: [],
            onResize: [],
            onFirstRun: []
        };

        //Merge options with defaults to make the state
        this.options = mergeOptions(defaultOptions, options);

        //Migrate methods into an array, this is to enable future functionality of adding extra methods to an existing state
        if(typeof this.options.onEnter === "function"){
            this.options.onEnter = [this.options.onEnter];
        }

        if(typeof this.options.onLeave === "function"){
            this.options.onLeave = [this.options.onLeave];
        }

        if(typeof this.options.onResize === "function"){
            this.options.onResize = [this.options.onResize];
        }

        if(typeof this.options.onFirstRun === "function"){
            this.options.onFirstRun = [this.options.onFirstRun];
        }

        //Test the one time tests first, if the test is invalid we wont create the config option
        if (this.testConfigOptions('once') === false) {
            this.valid = false;
            return false;
        }

        this.valid = true;
        this.active = false;
        this.init();
    }

    State.prototype = {
        init: function() {
            this.test = window.matchMedia(this.query);

            if (this.test.matches && this.testConfigOptions('match')) {
                this.enterState();
            }

            this.listener = function(test){
                var changed = false;

                if (test.matches) {
                    if (this.testConfigOptions('match')) {
                        this.enterState();
                        changed = true;
                    }
                }
                else {
                    this.leaveState();
                    changed = true;
                }

                if (changed) {
                    stateChangeMethod();
                }
            }.bind(this);
          
            this.test.addListener(this.listener);
        },
        
        //Handle entering a state
        enterState: function() {
            fireAllMethodsInArray(this.options.onFirstRun);
            fireAllMethodsInArray(this.options.onEnter);
            this.options.onFirstRun = [];
            this.active = true;
        },

        //Handle leaving a state
        leaveState: function() {
            fireAllMethodsInArray(this.options.onLeave);
            this.active = false;
        },

        //Handle the user resizing the browser
        resizeState: function() {
            if (this.testConfigOptions('resize')) {
                fireAllMethodsInArray(this.options.onResize);
            }
        },

        //When the StateManager removes a state we want to remove the event listener
        destroy: function() {
            this.test.removeListener(this.listener);
        },

        testConfigOptions: function(when) {
            var totalConfigOptions = this.configOptions.length;

            for (var j = 0; j < totalConfigOptions; j++) {
                var configOption = this.configOptions[j];

                if (typeof this.options[configOption.name] !== "undefined") {
                    if (configOption.when === when && configOption.test.bind(this)() === false) {
                        return false;
                    }
                }

                //Skip any config options the state does not define
                // if(typeof tempObj.state[configOptions[j].name] !== "undefined"){
                //     tempObj.callback = configOptions[j].test;
                //     if(tempObj.callback() === false){
                //         validState = false;
                //         break;
                //     }
                // }
            }

            return true;
        },

        //An array of avaliable config options, this can be pushed to by the State Manager
        configOptions: []
    };  

    //State Manager Constructor

    function StateManager(options) {
        this.states = [];
        this.resizeTimer = null;
        this.configOptions = [];

        window.addEventListener("resize", debounce(this.resizeBrowser.bind(this), resizeTimeout), true);    
    }

    StateManager.prototype = {
        addState: function(options) {
            var newState = new State(options);
            
            if (newState.valid) {
                this.states.push(newState);
            }

            return newState;
        },

        addStates: function (statesArray) {
            for (var i = statesArray.length - 1; i >= 0; i--) {
                this.addState(statesArray[i]);
            }

            return this;
        },

        getState: function(id) {
            for (var i = this.states.length - 1; i >= 0; i--) {
                var state = this.states[i];

                if(state.id === id){
                    return state;
                }
            }
        },

        isActive: function(id) {
            var selectedState = this.getState(id) || {};

            return selectedState.active || false;
        },

        getStates: function(idArr) {
            var idCount = null, returnArr = [];

            if (typeof(idArr) === "undefined") {
                return this.states;
            }
            else {
                idCount = idArr.length;
                
                for (var i = 0; i < idCount; i++) {
                    returnArr.push(this.getState(idArr[i]));
                }

                return returnArr;
            }
        },

        removeState: function (id) {
            for (var i = this.states.length - 1; i >= 0; i--) {
                var state = this.states[i];

                if (state.id === id) {
                    state.destroy();
                    this.states.splice(i, 1);
                }
            }

            return this;
        },

        removeStates: function (idArray) {
            for (var i = idArray.length - 1; i >= 0; i--) {
                this.removeState(idArray[i]);
            }

            return this;
        },

        removeAllStates: function() {
            for (var i = this.states.length - 1; i >= 0; i--) {
                var state = this.states[i];
                state.destroy();
            }

            this.states = [];
        },


        addConfigOption: function(options){
            var defaultOptions = {
                name: '', // name, this is used to apply to a state
                test: null, //function which will perform the test
                when: 'resize' // resize or match (match will mean that resize will never fire either), or once (which will test once, then delete state if test doesnt pass)
            };

            //Merge options with defaults
            options = mergeOptions(defaultOptions, options);

            if(options.name !== '' && options.test !== null){
                State.prototype.configOptions.push(options);
            }
        },

        removeConfigOption: function(name){
            var configOptions = State.prototype.configOptions;

            for (var i = configOptions.length - 1; i >= 0; i--) {
                if (configOptions[i].name === name) {
                    configOptions.splice(i, 1);
                }
            }

            State.prototype.configOptions = configOptions;
        },

        getConfigOption: function(name){
            var configOptions = State.prototype.configOptions;

            if(typeof name === "string"){
                for (var i = configOptions.length - 1; i >= 0; i--) {
                    if(configOptions[i].name === name){
                        return configOptions[i];
                    }
                }
            }
            else{
                return configOptions;
            }
        },

        getConfigOptions: function(){
            return State.prototype.configOptions;
        },

        resizeBrowser: function() {
            var activeStates = filterStates(this.states, 'active', true);
            var len = activeStates.length;

            for (var i = 0; i < len; i++) {
                activeStates[i].resizeState();
            }
        },

        stateChange: function(func) {
            if (typeof func === "function") {
                stateChangeMethod = func;
            }
            else {
                throw new Error('Not a function');
            }
        }
    };

    //Utility functions

    function filterStates(states, key, value) {
        var len = states.length;
        var returnStates = [];

        for (var i = 0; i < len; i++) {
            var state = states[i];

            if (state[key] && state[key] === value) {
                returnStates.push(state);
            }
        }

        return returnStates;
    }

    function mergeOptions(obj1, obj2) {
        var obj3 = {};

        for (var attrname in obj1) {
            obj3[attrname] = obj1[attrname];
        }

        for (var attrname2 in obj2) {
            obj3[attrname2] = obj2[attrname2];
        }

        return obj3;
    }

    function makeID() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 10; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    function fireAllMethodsInArray(arr) {
        var arrLength = arr.length;

        for (var i = 0; i < arrLength; i++) {
            arr[i]();
        }
    }

    function funcToArray(func) {
        if (typeof func === 'function') {
            return [func];
        }
        else {
            return func;
        }
    }

    //
    // David Walsh's Debounce - http://davidwalsh.name/javascript-debounce-function
    //

    function debounce(func, wait, immediate) {
        var timeout;
        
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    return new StateManager();
});
