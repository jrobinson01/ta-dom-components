import TaDom from '/ta-dom-element.js';
import MyElement from './my-element.js';

const reverse = string => string.split('').reverse().join('');

export class MyOtherElement extends MyElement {

  // completely override css
  static get css() {
    return `
      :host {
        font-size: 12px;
      }
    `
  }

  // inherit base class properties, merging our own
  static get properties() {
    const props = {
      somethingNew: {
        value: 'hello'
      }
    };
    return Object.assign(props, MyElement.properties);
  }

  // override base click to do other things
  onClickAdd(event) {
    this.somethingNew = reverse(this.somethingNew);
    super.onClickAdd(event);
  }

  // extend render, appending our content onto the end of the super classes' content
  render() {
    const baseEl = super.render();
    const myEl = div(`${this.somethingNew}`);
    baseEl.appendChild(myEl);
    return baseEl;
  }
};

export const myOtherElement = TaDom.customElement('my-other-element', MyOtherElement);
