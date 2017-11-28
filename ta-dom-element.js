import TaDom from '/node_modules/ta-dom/index.js';
import morphdom from '/node_modules/morphdom/dist/morphdom-esm.js';

//helloWorld -> hello-world
const camelToDash = function(str){
  return str
    .replace(/(^[A-Z])/, ([first]) => first.toLowerCase())
    .replace(/([A-Z])/g, ([letter]) => `-${letter.toLowerCase()}`)
}

// hello-world -> helloWorld
const dashToCamel = function(str) {
  return str.split('-').map((w, i) => {
    if(i === 0) {
      // don't capitalize first word
      return w;
    }
    return w.replace(/(^[a-z])/, ([first]) => first.toUpperCase())
  }).join('');
};

// generate getter/setter pair for prop
const generateProp = function(element, key, obj) {
  const prop = {};
  if (typeof obj.value === 'function') {
    // function types can only have getters
    prop.get = function() {
      return obj.value();
    }
  } else {
    prop.get = function() {
      return element.state_[key];
    }
    prop.set = function(newVal) {
      const oldVal = this.state_[key];
      // short-circuit if values are the same
      if (newVal === oldVal) {
        return;
      }
      const newState = {};
      newState[key] = newVal;
      // update state
      element.setState(newState);
      // dispatch a changed event
      element.dispatchEvent(new CustomEvent(`${key}-changed`, {
        bubbles: true,
        composed: true,
        detail:{
          newValue: newVal,
          oldValue: oldVal
        }
      }));
    }
  }
  return prop;
}

const compareNodes = function(newNode, oldNode) {
  return morphdom(oldNode, newNode, {
    onNodeDiscarded: node => {
      // TODO: do we have to remove event listeners from discarded nodes?
      // console.log('node discarded', node);
    }
  });
}

const TaDomElement = class extends HTMLElement {

  static get properties() {
    // no-op
  }

  static get css() {
    return ``;
  }

  constructor() {
    super();
    // requestAnimationFrame id
    this.drawId_ = null;
    // define customer getter/setters for each property
    const sProps = this.constructor.properties;
    this.state_ = {};
    const props = {};
    this.computedProps_ = [];
    for(let key in sProps) {
      const obj = sProps[key];
      // define instance prop
      props[key] = generateProp(this, key, obj);
      // state prop
      if(typeof obj.value == 'function') {
        this.state_[key] = obj.value();
      } else {
        this.state_[key] = obj.value;
      }
      // check for computed props
      if (typeof obj.computed === 'function') {
        const params = obj.computed.toString().split('(')[1].split(')')[0].trim().split(',').map(p => p.trim());
        if (params[0] !== '') {
          this.computedProps_.push({key, params, fn: obj.computed});
        }
      }
    }
    // setup instance properties
    Object.defineProperties(this, props);
    // create our shadowRoot
    this.attachShadow({mode: 'open'});
  }

  connectedCallback() {
    // initialize state
    this.setState(this.state_);
  }

  // handle attribute changes
  attributeChangedCallback(attribute, oldVal, newVal) {
    if (newVal !== oldVal) {
      const key = dashToCamel(attribute);
      if(typeof this.constructor.properties[key].value === 'boolean') {
        if(newVal === '') {
          this[key] = true;
        } else {
          this[key] = false;
        }
      } else if (this[key] !== newVal) {
        this[key] = newVal;
      }
    }
  }

  render() {
    //no-op
  }

  // override dispatchEvent
  dispatchEvent(name, detail) {
    // pass-thru if first param is an event
    if(name instanceof Event) {
      return super.dispatchEvent(name);
    }
    // default events to composed, bubbles
    return super.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail
    }));
  }

  // replaces the entire style sheet
  updateStyles(newStyle) {
    // first render
    if (!this.styles) {
      // append style!
      let css;
      // if inline string, create a style element
      if (typeof newStyle === 'string') {
        css = style(newStyle);
      } else {
        // if a link element is passed, append
        css = newStyle;
      }
      // const css = style({}, newStyle);
      this.styles = css;
      this.shadowRoot.prepend(css);
    } else {
      if (typeof newStyle === 'string') {
        this.styles = compareNodes(style({}, newStyle), this.styles);
      } else {
        // it's an element
        this.styles = compareNodes(newStyle, this.styles);
      }

    }
  }

  setState(update) {
    // check/run computedProps_
    this.computedProps_.forEach(p => {
      const params = [];
      p.params.forEach(pr => {
        if (update[pr]) {
          // use new value
          params.push(update[pr]);
        } else {
          // use existing value
          params.push(this[pr]);
        }
      });
      update[p.key] = p.fn.apply(null, params);
    });

    // update internal state and possible attributes
    for(let key in update) {
      const val = update[key];
      if (this.state_[key] !== update[key]) {
        this.state_[key] = update[key];
      }
      if (this.constructor.properties[key].reflectToAttribute) {
        if (typeof val !== 'object' && !Array.isArray(val)){
          if(val) {

            this.setAttribute(camelToDash(key), typeof val === 'boolean' ? '' : val);
          } else {
            this.removeAttribute(camelToDash(key));
          }

        } else {
          console.warn('attempted to reflect an object or array to attribute:', key);
        }
      }
    }
    // redraw dom on next animation frame
    window.cancelAnimationFrame(this.drawId);
    this.drawId_ = window.requestAnimationFrame(() => {
      const newDom = this.render();
      if (!newDom){
        return;
      }
      if (!this.dom) {
        // first render
        this.dom = newDom;
        this.updateStyles(this.constructor.css);
        this.shadowRoot.appendChild(this.dom);
      } else {
        // after first render
        this.dom = compareNodes(newDom, this.dom);
      }
    });
  }
};
// wrapper for generate() and customElements.define()
// returns the ta-dom function to generate the custom element
const customElement = function(tag, klass) {
  customElements.define(tag, klass);
  return TaDom.generate(tag);
};


export default {customElement, TaDomElement};
