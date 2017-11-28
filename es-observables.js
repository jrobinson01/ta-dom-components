/**
 * @fileoverview TC39 Observable proposal.
 * @see https://github.com/tc39/proposal-observable
 */

/* eslint-disable */

// === Symbol Polyfills ===

function polyfillSymbol(name) {

  if (!Symbol[name])
    Object.defineProperty(Symbol, name, { value: Symbol(name) });
}

polyfillSymbol("observable");

// === Abstract Operations ===

function nonEnum(obj) {

  Object.getOwnPropertyNames(obj).forEach(k => {
    Object.defineProperty(obj, k, { enumerable: false });
  });

  return obj;
}

function getMethod(obj, key) {

  let value = obj[key];

  if (value == null)
    return undefined;

  if (typeof value !== "function")
    throw new TypeError(value + " is not a function");

  return value;
}

function cleanupSubscription(subscription) {

  // Assert:  observer._observer is undefined

  let cleanup = subscription._cleanup;

  if (!cleanup)
    return;

  // Drop the reference to the cleanup function so that we won't call it
  // more than once
  subscription._cleanup = undefined;

  // Call the cleanup function
  try {
    cleanup();
  }
  catch(e) {
    // HostReportErrors(e);
  }
}

function subscriptionClosed(subscription) {

  return subscription._observer === undefined;
}

function closeSubscription(subscription) {

  if (subscriptionClosed(subscription))
    return;

  subscription._observer = undefined;
  cleanupSubscription(subscription);
}

function cleanupFromSubscription(subscription) {
  return _=> { subscription.unsubscribe() };
}

function Subscription(observer, subscriber) {
  // Assert: subscriber is callable
  // The observer must be an object
  this._cleanup = undefined;
  this._observer = observer;

  // If the observer has a start method, call it with the subscription object
  try {
    let start = getMethod(observer, "start");

    if (start) {
      start.call(observer, this);
    }
  }
  catch(e) {
    // HostReportErrors(e);
  }

  // If the observer has unsubscribed from the start method, exit
  if (subscriptionClosed(this))
    return;

  observer = new SubscriptionObserver(this);

  try {

    // Call the subscriber function
    let cleanup = subscriber.call(undefined, observer);

    // The return value must be undefined, null, a subscription object, or a function
    if (cleanup != null) {
      if (typeof cleanup.unsubscribe === "function")
        cleanup = cleanupFromSubscription(cleanup);
      else if (typeof cleanup !== "function")
        throw new TypeError(cleanup + " is not a function");

      this._cleanup = cleanup;
    }

  } catch (e) {

    // If an error occurs during startup, then send the error
    // to the observer.
    observer.error(e);
    return;
  }

  // If the stream is already finished, then perform cleanup
  if (subscriptionClosed(this)) {
    cleanupSubscription(this);
  }
}

Subscription.prototype = nonEnum({
  get closed() { return subscriptionClosed(this) },
  unsubscribe() { closeSubscription(this) },
});

function SubscriptionObserver(subscription) {
  this._subscription = subscription;
}

SubscriptionObserver.prototype = nonEnum({

  get closed() {

    return subscriptionClosed(this._subscription);
  },

  next(value) {

    let subscription = this._subscription;

    // If the stream if closed, then return undefined
    if (subscriptionClosed(subscription))
      return undefined;

    let observer = subscription._observer;

    try {
      let m = getMethod(observer, "next");

      // If the observer doesn't support "next", then return undefined
      if (!m)
        return undefined;

      // Send the next value to the sink
      m.call(observer, value);
    }
    catch(e) {
      // HostReportErrors(e);
    }
    return undefined;
  },

  error(value) {

    let subscription = this._subscription;

    // If the stream is closed, throw the error to the caller
    if (subscriptionClosed(subscription)) {
      return undefined;
    }

    let observer = subscription._observer;
    subscription._observer = undefined;

    try {

      let m = getMethod(observer, "error");

      // If the sink does not support "complete", then return undefined
      if (m) {
        m.call(observer, value);
      }
      else {
        // HostReportErrors(e);
      }
    } catch (e) {
      // HostReportErrors(e);
    }

    cleanupSubscription(subscription);

    return undefined;
  },

  complete() {

    let subscription = this._subscription;

    // If the stream is closed, then return undefined
    if (subscriptionClosed(subscription))
      return undefined;

    let observer = subscription._observer;
    subscription._observer = undefined;

    try {

      let m = getMethod(observer, "complete");

      // If the sink does not support "complete", then return undefined
      if (m) {
        m.call(observer);
      }
    } catch (e) {
      // HostReportErrors(e);
    }

    cleanupSubscription(subscription);

    return undefined;
  },

});

class Observable {

  // == Fundamental ==

  constructor(subscriber) {

    // The stream subscriber must be a function
    if (typeof subscriber !== "function")
      throw new
      TypeError("Observable initializer must be a function");

    this._subscriber = subscriber;
  }

  subscribe(observer, ...args) {
    if (typeof observer === "function") {
      observer = {
        next: observer,
        error: args[0],
        complete: args[1]
      };
    }
    else if (typeof observer !== "object") {
      observer = {};
    }

    return new Subscription(observer, this._subscriber);
  }

  [Symbol.observable]() { return this }

  // == Derived ==

  static from(x) {

    let C = typeof this === "function" ? this : Observable;

    if (x == null)
      throw new TypeError(x + " is not an object");

    let method = getMethod(x, Symbol.observable);

    if (method) {

      let observable = method.call(x);

      if (Object(observable) !== observable)
        throw new TypeError(observable + " is not an object");

      if (observable.constructor === C)
        return observable;

      return new C(observer => observable.subscribe(observer));
    }

    method = getMethod(x, Symbol.iterator);

    if (!method)
      throw new TypeError(x + " is not observable");

    return new C(observer => {

      for (let item of method.call(x)) {

        observer.next(item);

        if (observer.closed)
          return;
      }

      observer.complete();
    });
  }

  static of(...items) {

    let C = typeof this === "function" ? this : Observable;

    return new C(observer => {

      for (let i = 0; i < items.length; ++i) {

        observer.next(items[i]);

        if (observer.closed)
          return;
      }

      observer.complete();
    });
  }
  // JR: adding things!
  static fromEvent(element, eventName) {
    let C = typeof this === 'function' ? this : Observable;
    return new C(observer => {
      let handler = event => {
        observer.next(event);
      }
      element.addEventListener(eventName, handler, true);
      if (observer.closed) {
        return;
      }
      return () => {
        element.removeEventListener(eventName, handler, true);
      }
    });
  }

  // TODO: come up with sure easier method (less duplication)
  // to add operators.
  // ...
  map(mapFn) {
    return new Observable(observer => {
      return this.subscribe({
        next: value => {
          observer.next(mapFn(value));
        },
        error: err => observer.error(err),
        complete: () => observer.complete()
      });
    });
  };

  filter(filterFn) {
    return new Observable(observer => {
      return this.subscribe({
        next: value => {
          if (filterFn(value)){
            observer.next(value)
          }
        },
        error: err => observer.error(err),
        complete: () => observer.complete()
      });
    });
  };

  debounce(ms) {
    return new Observable(observer => {
      let timeout = null;
      return this.subscribe({
        next: value => {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            observer.next(value);
          }, ms);
        },
        error: err => {
          clearTimeout(timeout);
          observer.error(err);
        },
        complete: () => {
          clearTimeout(timeout);
          observer.complete();
        }
      });
    });
  }

  /**
  * The Reduce operator applies a function to the first item emitted
  * by the source Observable and then feeds the result of the function
  * back into the function along with the second item emitted by the
  * source Observable, continuing this process until the source
  * Observable emits its final item and completes, whereupon the
  * Observable returned from Reduce emits the final value returned
  * from the function.
  */
  reduce(reduceFn) {
    return new Observable(observer => {
      let res;
      return this.subscribe({
        next: value => {
          res = reduceFn(res, value);
        },
        error: err => {
          observer.error(err);
        },
        complete: () => {
          observer.next(res);
          observer.complete();
        }
      });
    });
  }

  // Take the first n items and then complete.
  take(count) {
    return new Observable(observer => {
      return this.subscribe({
        next: function(value) {
          if (count > 0) {
            observer.next(value);
            count -= 1;
          } else {
            this.complete();
          }
        },
        error: err => {
          observer.error(err);
        },
        complete: () => {
          observer.complete();
        }
      });
    });
  }

  // take the last n items
  takeLast(count) {
    return new Observable(observer => {
      const cache = [];
      return this.subscribe({
        next: value => {
          cache.push(value);
          if(cache.length > count) {
            cache.shift();//
          }
        },
        error: err => observer.error(err),
        complete: () => {
          while(cache.length > 0) {
            observer.next(cache.shift());
          }
          observer.complete();
        }
      });
    });
  }

  // take while fn returns true
  takeWhile(whileFn) {
    return new Observable(observer => {
      return this.subscribe({
        next: function(value) {
          if (!whileFn(value)) {
            this.complete();
          } else {
            observer.next(value);
          }
        },
        error: err => observer.error(err),
        complete: () => observer.complete()
      });
    });
  }

  //
  interval(ms) {
    return new Observable(observer => {
      let count = 0;
      let interval = setInterval(() => {
        observer.next(count);
        count += 1;
      }, ms);
      return this.subscribe({
        next: value => {},
        error: err => observer.error(err),
        complete: () => {
          clearInterval(interval);
          observer.complete()
        }
      });
    });
  }
}

window.Observable = Observable;
