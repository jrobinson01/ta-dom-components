import TaDom from '/ta-dom-element.js';

export class AnotherElement extends TaDom.TaDomElement {
  static get css() {
    return link({rel:'stylesheet', href:'./another-element.css'});
  }
  static get properties() {
    return {
      name:{
        value: 'bob',
        reflectToAttribute: true
      }
    };
  }

  static get observedAttributes() {
    return ['name'];
  }

  render() {
    return div(`hello there, ${this.name}!`);
  }
};
export const anotherElement = TaDom.customElement('another-element', AnotherElement);
