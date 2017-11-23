import TaDom from '/node_modules/ta-dom/index.js';
import morphdom from '/node_modules/morphdom/dist/morphdom-esm.js';

// generate getter/setter pair for prop
const generateProp = function(element, key, obj) {
  const ret = {};
  if (typeof obj.value === 'function') {
    // function types can only have getters
    ret.get = function() {
      return obj.value();
    }
  } else {
    ret.get = function() {
      return element.state_[key];
    }
    ret.set = function(newVal) {
      const newState = {};
      newState[key] = newVal;
      const oldVal = this.state_[key];
      // don't reflect arrays or objects to attributes
      // TODO: should probably warn here
      // ...
      if (obj.reflectToAttribute && typeof newVal !== 'object' && !Array.isArray(newVal)) {
        this.setAttribute(key, newVal);
      }
      element.setState(newState);
      //
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
  return ret;
}

const compareNodes = function(newNode, oldNode) {
  return morphdom(oldNode, newNode, {
    onNodeDiscarded: node => {
      // TODO: do we have to remove event listeners from discarded nodes?
      console.log('node discarded', node);
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
    // define customer getter/setters for each property
    const sProps = this.constructor.properties;
    this.state_ = {};
    const props = {};
    // const observedAttributes = [];
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
    // initial state
    this.setState(this.state_);
  }

  attributeChangedCallback(attribute, oldVal, newVal) {
    if (newVal !== oldVal) {
      if (this[attribute] !== newVal) {
        this[attribute] = newVal;
      }
    }
  }

  render() {
    //no-op
  }

  updateStyles(newStyle) {
    if (!this.styles) {
      // append style!
      const css = style({}, newStyle);
      this.styles = css;
      this.shadowRoot.prepend(css);
    } else {
      this.styles = compareNodes(style({}, newStyle), this.styles);
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

    // update state
    for(let key in update) {
      const val = update[key];
      if (this.state_[key] !== update[key]) {
        this.state_[key] = update[key];
      }
    }
    // redraw dom async
    window.requestAnimationFrame(() => {
      const newDom = this.render();
      if (!newDom){
        return;
      }
      if (!this.dom) {
        // first render
        this.updateStyles(this.constructor.css);
        this.dom = newDom;
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
const customElement = function(fnName, tag, klass) {
  customElements.define(tag, klass);
  return TaDom.generate(tag);
};

export default {customElement, TaDomElement};
