/*!
 * QUnit - A JavaScript Unit Testing Framework
 *
 * Original code by John Resig, Jörn Zaefferer
 * http://docs.jquery.com/QUnit
 * Dual licensed under the MIT or GPL licenses.
 */

if (!this.lib_qunit) this.lib_qunit = lib_qunit;
function lib_qunit() {

  var JSON = lib('json');

  var defined = {
    setTimeout: false,
    sessionStorage: (function() {
      try {
        return !!sessionStorage.getItem;
      } catch (e) {
        return false;
      }
    })()
  };

  var testId = 0;

  var Test = function(name, testName, expected, testEnvironmentArg, async, callback) {
      this.name = name;
      this.testName = testName;
      this.expected = expected;
      this.testEnvironmentArg = testEnvironmentArg;
      this.callback = callback;
      this.assertions = [];
      };
  Test.prototype = {
    init: function() {
    },

    setup: function() {
      if (this.module != config.previousModule) {
        if (config.previousModule) {
          QUnit.moduleDone({
            name: config.previousModule,
            failed: config.moduleStats.bad,
            passed: config.moduleStats.all - config.moduleStats.bad,
            total: config.moduleStats.all
          });
        }
        config.previousModule = this.module;
        config.moduleStats = {
          all: 0,
          bad: 0
        };
        QUnit.moduleStart({
          name: this.module
        });
      }
      config.current = this;
      this.testEnvironment = extend({
        setup: function() {},
        teardown: function() {}
      }, this.moduleTestEnvironment);
      if (this.testEnvironmentArg) {
        extend(this.testEnvironment, this.testEnvironmentArg);
      }
      QUnit.testStart({
        name: this.testName
      });
      // allow utility functions to access the current test environment
      QUnit.current_testEnvironment = this.testEnvironment;
      try {
        this.testEnvironment.setup.call(this.testEnvironment);
      } catch (e) {
        QUnit.ok(false, "Setup failed on " + this.testName + ": " + e.message);
      }
    },

    run: function() {
      if (config.notrycatch) {
        this.callback.call(this.testEnvironment);
        return;
      }
      try {
        this.callback.call(this.testEnvironment);
      } catch (e) {
        fail("Test " + this.testName + " died, exception and test follows", e, this.callback);
        QUnit.ok(false, "Died on test #" + (this.assertions.length + 1) + ": " + e.message + " - " + JSON.stringify(e));
      }
    },

    teardown: function() {
      try {
        this.testEnvironment.teardown.call(this.testEnvironment);
      } catch (e) {
        QUnit.ok(false, "Teardown failed on " + this.testName + ": " + e.message);
      }
    },

    finish: function() {
      if (this.expected && this.expected != this.assertions.length) {
        QUnit.ok(false, "Expected " + this.expected + " assertions, but " + this.assertions.length + " were run");
      }
      var good = 0, bad = 0;
      config.stats.all += this.assertions.length;
      config.moduleStats.all += this.assertions.length;
      for (var i = 0; i < this.assertions.length; i++) {
        if (!this.assertions[i].result) {
          bad++;
          config.stats.bad++;
          config.moduleStats.bad++;
        }
      }
      QUnit.testDone({
        name: this.testName,
        failed: bad,
        passed: this.assertions.length - bad,
        total: this.assertions.length
      });
    },

    exec: function() {
      var test = this;
      test.init();
      test.setup();
      test.run();
      test.teardown();
      test.finish();
    }

  };

  var QUnit = {

    // call on start of module test to prepend name to all tests
    module: function(name, testEnvironment) {
      config.currentModule = name;
      config.currentModuleTestEnviroment = testEnvironment;
    },

    test: function(testName, expected, callback, async) {
      var name = testName + '', testEnvironmentArg;

      if (arguments.length === 2) {
        callback = expected;
        expected = null;
      }
      // is 2nd argument a testEnvironment?
      if (expected && typeof expected === 'object') {
        testEnvironmentArg = expected;
        expected = null;
      }

      if (config.currentModule) {
        name = config.currentModule + ": " + name;
      }

      if (!validTest(config.currentModule + ": " + testName)) {
        return;
      }

      var test = new Test(name, testName, expected, testEnvironmentArg, async, callback);
      test.module = config.currentModule;
      test.moduleTestEnvironment = config.currentModuleTestEnviroment;
      test.exec();
    },

    /**
     * Specify the number of expected assertions to gurantee that failed test (no assertions are run at all) don't slip through.
     */
    expect: function(asserts) {
      config.current.expected = asserts;
    },

    /**
     * Asserts true.
     * @example ok( "asdfasdf".length > 5, "There must be at least 5 chars" );
     */
    ok: function(a, msg) {
      a = !! a;
      var details = {
        result: a,
        message: msg
      };
      QUnit.log(details);
      config.current.assertions.push({
        result: a,
        message: msg
      });
    },

    /**
     * Checks that the first two arguments are equal, with an optional message.
     * Prints out both actual and expected values.
     *
     * Prefered to ok( actual == expected, message )
     *
     * @example equal( format("Received {0} bytes.", 2), "Received 2 bytes." );
     *
     * @param Object actual
     * @param Object expected
     * @param String message (optional)
     */
    equal: function(actual, expected, message) {
      QUnit.push(expected == actual, actual, expected, message);
    },

    notEqual: function(actual, expected, message) {
      QUnit.push(expected != actual, actual, expected, message);
    },

    deepEqual: function(actual, expected, message) {
      QUnit.push(QUnit.equiv(actual, expected), actual, expected, message);
    },

    notDeepEqual: function(actual, expected, message) {
      QUnit.push(!QUnit.equiv(actual, expected), actual, expected, message);
    },

    strictEqual: function(actual, expected, message) {
      QUnit.push(expected === actual, actual, expected, message);
    },

    notStrictEqual: function(actual, expected, message) {
      QUnit.push(expected !== actual, actual, expected, message);
    },

    raises: function(block, expected, message) {
      var actual, ok = false;

      if (typeof expected === 'string') {
        message = expected;
        expected = null;
      }

      try {
        block();
      } catch (e) {
        actual = e;
      }

      if (actual) {
        // we don't want to validate thrown error
        if (!expected) {
          ok = true;
          // expected is a regexp
        } else
        if (QUnit.objectType(expected) === "regexp") {
          ok = expected.test(actual);
          // expected is a constructor
        } else
        if (actual instanceof expected) {
          ok = true;
          // expected is a validation function which returns true is validation passed
        } else
        if (expected.call({}, actual) === true) {
          ok = true;
        }
      }

      QUnit.ok(ok, message);
    }
  };

  // Backwards compatibility, deprecated
  QUnit.equals = QUnit.equal;
  QUnit.same = QUnit.deepEqual;

  // Maintain internal state
  var config = {
    stats: {all: 0, bad: 0},
    // by default, run previously failed tests first (useful in with "Hide passed tests" checked)
    reorder: true,
    noglobals: false,
    notrycatch: false
  };

  // Expose the API as global variables
  //module, test, expect, ok, equal, notEqual, deepEqual, notDeepEqual, strictEqual, notStrictEqual,
  // raises, [equals], [same]
  setGlobal(QUnit);

  // define these after exposing globals to keep them in these QUnit namespace only
  extend(QUnit, {
    config: config,

    // Initialize the configuration options
    init: function() {
      extend(config, {
        stats: {
          all: 0,
          bad: 0
        },
        moduleStats: {
          all: 0,
          bad: 0
        },
        started: +new Date,
        filter: ""
      });

    },

    // Safe object type checking
    is: function(type, obj) {
      return QUnit.objectType(obj) == type;
    },

    objectType: function(obj) {
      if (typeof obj === "undefined") {
        return "undefined";
      }
      if (obj === null) {
        return "null";
      }
      var type = Object.prototype.toString.call(obj).slice(8, -1);
      switch (type) {
        case 'Number':
          return isNaN(obj) ? 'nan' : 'number';
        case 'String':
        case 'Boolean':
        case 'Array':
        case 'Date':
        case 'RegExp':
        case 'Function':
          return type.toLowerCase();
      }
      if (obj instanceof Object) {
        return "object";
      }
      return undefined;
    },

    push: function(result, actual, expected, message) {
      var details = {
        result: result,
        message: message,
        actual: actual,
        expected: expected
      };

      message = message || (result ? "okay" : "failed");
      expected = JSON.stringify(expected);
      actual = JSON.stringify(actual);
      var output = message + '' + expected + '';
      if (actual != expected) {
        output += 'Result: ' + actual + '';
      }

      QUnit.log(details);

      config.current.assertions.push({
        result: !! result,
        message: output
      });
    },

    url: function(params) {
      params = extend({}, params);
      var querystring = "?", key;
      forEach(params, function(key, param) {
        querystring += encodeURIComponent(key) + "=" + encodeURIComponent(param) + "&";
      });
      return req.url('path') + querystring.slice(0, -1);
    },

    // Logging callbacks; all receive a single argument with the listed properties
    begin: function() {},
    // done: { failed, passed, total, runtime }
    done: function() {},
    // log: { result, actual, expected, message }
    log: function() {},
    // testStart: { name }
    testStart: function() {},
    // testDone: { name, failed, passed, total }
    testDone: function() {},
    // moduleStart: { name }
    moduleStart: function() {},
    // moduleDone: { name, failed, passed, total }
    moduleDone: function() {}
  });

  function done() {
    // Log the last module results
    if (config.currentModule) {
      QUnit.moduleDone({
        name: config.currentModule,
        failed: config.moduleStats.bad,
        passed: config.moduleStats.all - config.moduleStats.bad,
        total: config.moduleStats.all
      });
    }
    var runtime = +new Date - config.started, passed = config.stats.all - config.stats.bad;
    QUnit.done({
      failed: config.stats.bad,
      passed: passed,
      total: config.stats.all,
      runtime: runtime
    });
  }

  function validTest(name) {
    var filter = config.filter, run = false;
    if (!filter) {
      return true;
    }
    var not = filter.charAt(0) === "!";
    if (not) {
      filter = filter.slice(1);
    }
    if (name.indexOf(filter) !== -1) {
      return !not;
    }
    if (not) {
      run = true;
    }
    return run;
  }

  // returns a new Array with the elements that are in a but not in b
  function diff(a, b) {
    var result = a.slice();
    for (var i = 0; i < result.length; i++) {
      for (var j = 0; j < b.length; j++) {
        if (result[i] === b[j]) {
          result.splice(i, 1);
          i--;
          break;
        }
      }
    }
    return result;
  }

  function fail(message, exception, callback) {
    //console.error(message);
    //console.error(exception);
    //console.warn(callback.toString());
  }

  function extend(a, b) {
    for (var prop in b) {
      if (b[prop] === undefined) {
        delete a[prop];
      } else {
        a[prop] = b[prop];
      }
    }
    return a;
  }

  // Test for equality any JavaScript type.
  // Discussions and reference: http://philrathe.com/articles/equiv
  // Test suites: http://philrathe.com/tests/equiv
  // Author: Philippe Rathé <prathe@gmail.com>
  QUnit.equiv = function() {

    var innerEquiv; // the real equiv function
    var callers = []; // stack to decide between skip/abort functions
    var parents = []; // stack to avoiding loops from circular referencing

    // Call the o related callback with the given arguments.
    function bindCallbacks(o, callbacks, args) {
      var prop = QUnit.objectType(o);
      if (prop) {
        if (QUnit.objectType(callbacks[prop]) === "function") {
          return callbacks[prop].apply(callbacks, args);
        } else {
          return callbacks[prop]; // or undefined
        }
      }
    }

    var callbacks = (function() {

      // for string, boolean, number and null
      function useStrictEquality(b, a) {
        if (b instanceof a.constructor || a instanceof b.constructor) {
          // to catch short annotaion VS 'new' annotation of a declaration
          // e.g. var i = 1;
          //      var j = new Number(1);
          return a == b;
        } else {
          return a === b;
        }
      }

      return {
        "string": useStrictEquality,
        "boolean": useStrictEquality,
        "number": useStrictEquality,
        "null": useStrictEquality,
        "undefined": useStrictEquality,

        "nan": function(b) {
          return isNaN(b);
        },

        "date": function(b, a) {
          return QUnit.objectType(b) === "date" && a.valueOf() === b.valueOf();
        },

        "regexp": function(b, a) {
          return QUnit.objectType(b) === "regexp" && a.source === b.source && // the regex itself
          a.global === b.global && // and its modifers (gmi) ...
          a.ignoreCase === b.ignoreCase && a.multiline === b.multiline;
        },

        // - skip when the property is a method of an instance (OOP)
        // - abort otherwise,
        //   initial === would have catch identical references anyway
        "function": function() {
          var caller = callers[callers.length - 1];
          return caller !== Object && typeof caller !== "undefined";
        },

        "array": function(b, a) {
          var i, j, loop;
          var len;
          // b could be an object literal here
          if (!(QUnit.objectType(b) === "array")) {
            return false;
          }
          len = a.length;
          if (len !== b.length) { // safe and faster
            return false;
          }
          //track reference to avoid circular references
          parents.push(a);
          for (i = 0; i < len; i++) {
            loop = false;
            for (j = 0; j < parents.length; j++) {
              if (parents[j] === a[i]) {
                loop = true; //dont rewalk array
              }
            }
            if (!loop && !innerEquiv(a[i], b[i])) {
              parents.pop();
              return false;
            }
          }
          parents.pop();
          return true;
        },

        "object": function(b, a) {
          var i, j, loop;
          var eq = true; // unless we can proove it
          var aProperties = [],
              bProperties = []; // collection of strings
          // comparing constructors is more strict than using instanceof
          if (a.constructor !== b.constructor) {
            return false;
          }
          // stack constructor before traversing properties
          callers.push(a.constructor);
          //track reference to avoid circular references
          parents.push(a);
          for (i in a) { // be strict: don't ensures hasOwnProperty and go deep
            loop = false;
            for (j = 0; j < parents.length; j++) {
              if (parents[j] === a[i]) loop = true; //don't go down the same path twice
            }
            aProperties.push(i); // collect a's properties
            if (!loop && !innerEquiv(a[i], b[i])) {
              eq = false;
              break;
            }
          }

          callers.pop(); // unstack, we are done
          parents.pop();

          for (i in b) {
            bProperties.push(i); // collect b's properties
          }

          // Ensures identical properties name
          return eq && innerEquiv(aProperties.sort(), bProperties.sort());
        }
      };
    })();

    innerEquiv = function() { // can take multiple arguments
      var args = Array.prototype.slice.apply(arguments);
      if (args.length < 2) {
        return true; // end transition
      }
      return (function(a, b) {
        if (a === b) {
          return true; // catch the most you can
        } else
        if (a === null || b === null || typeof a === "undefined" || typeof b === "undefined" || QUnit.objectType(a) !== QUnit.objectType(b)) {
          return false; // don't lose time with error prone cases
        } else {
          return bindCallbacks(a, callbacks, [b, a]);
        }
        // apply transition with (1..n) arguments
      })(args[0], args[1]) && arguments.callee.apply(this, args.splice(1, args.length - 1));
    };

    return innerEquiv;

  }();

  return QUnit;

}