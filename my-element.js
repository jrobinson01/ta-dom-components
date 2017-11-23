import TaDom from './ta-dom-element.js';

export class MyElement extends TaDom.TaDomElement {

    // static getter for css
    static get css() {
      return `
      :host {
        font-size: 24px;
        color: green;
      }
      .time {
        color: red;
      }
      .num-display {
        font-size: 16px;
        color: orange;
      }
      `
    }

    // declare attributes that should be reflected to properties
    static get observedAttributes() {
      return ['name'];
    }

    // declare our properties
    static get properties() {
      return {
        name: {
          value: 'bob',
          reflectToAttribute: true
        },
        time: {
          value: function(){
            return new Date().toLocaleString('en-US', {hour:'numeric', minute:'numeric', second:'numeric'});
          }
        },
        greeting: {
          value: 'hello, stranger.',
          computed: function(name) {
            return `hello, ${name}!`;
          }
        },
        items: {
          value: ['c','b','a']
        }
      }
    }

    connectedCallback() {
      this.timer = setInterval(() => {
        this.setState({time:this.time});
      }, 500);
    }

    disconnectedCallback() {
      clearInterval(this.timer);
    }

    onClick(event) {
      const rn = Math.round(Math.random() * 100);
      this.items.push(rn);
      this.setState({items: this.items});
    }

    render() {
      const list = items => items
      .map(i => span({class:"num-display"}, `${i}, `))
      .sort();
      const el =
      div({class:'outer'},
        h1(`${this.greeting}`),
        div({
          class: 'time',
          'on-click': event => this.onClick(event)
          }, `the time is: ${this.time}`),
            list(this.items),
            slot()
          );
      return el;
    }

  };

  // define a TaDom tag function as well as customElement
  TaDom.customElement('myElement', 'my-element', MyElement);
