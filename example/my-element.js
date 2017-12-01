import TaDom from '/ta-dom-element.js';
import {anotherElement} from './another-element.js';

export default class MyElement extends TaDom.TaDomElement {

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
      .time strong {
        color: maroon;
      }
      .num-display {
        font-size: 16px;
        color: orange;
      }
      .mouse-pos {
        color: pink;
      }
      .the-thing {
        width: 200px;
        height: 100px;
        background: orange;
        color: white;
      }
      `
    }

    // declare attributes that should be reflected to properties
    static get observedAttributes() {
      return ['first-name', 'has-thing'];
    }

    // declare our properties
    static get properties() {
      return {
        firstName: {
          value: 'bob',
          reflectToAttribute: true
        },
        time: {
          value: new Date().toLocaleString('en-US', {hour:'numeric', minute:'numeric', second:'numeric'})
        },
        greeting: {
          value: 'hello, stranger.',
          computed: function(firstName) {
            return `hello, ${firstName}!`;
          }
        },
        items: {
          value: ['c','b','a']
        },
        mousePos: {
          value: {x:0, y:0}
        },
        hasThing: {
          value: true,
          reflectToAttribute: true
        }
      }
    }
    constructor() {
      super();
      this.mousePos$ = Observable.fromEvent(window, 'mousemove')
        .map(event => {
          return {x: event.clientX, y: event.clientY};
        })
        .debounce(1000);
      this.timer$ = new Observable(() => {}).interval(500)
        .map(() => new Date().toLocaleString('en-US',
          {hour:'numeric', minute:'numeric', second:'numeric'})
        )
    }
    connectedCallback() {
      super.connectedCallback();
      this.mousePos$.subscribe(pos => {
        this.mousePos = pos;
      });
      this.timer$.subscribe(time => {
        this.time = time;
      });
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this.mousePos$.unsubscribe();
      this.timer$.unsubscribe();
    }

    onClickAdd(event) {
      const rn = Math.round(Math.random() * 100);
      this.items.push(rn);
      // update items
      this.setState({items: this.items});
    }

    onClickRemove(event) {
      const rn = Math.round(Math.random() * this.items.length);
      this.items.splice(rn, 1);
      this.setState({items: this.items});
    }

    render() {

      // generate a list element with buttons
      const list = items => {
        return div(
          button({type:'button', 'on-click': event => this.onClickAdd(event)}, 'add'),
          button({type:'button', 'on-click': event => this.onClickRemove(event)}, 'remove'),
          ul(items.sort().map(i => li({class:"num-display"}, `${i}`)))
        );
      };

      // only show the mouse pos div if we have real values
      const maybeMousePos = () => {
        if (this.mousePos.x !== 0 || this.mousePos.y !== 0) {
          return div({class:'mouse-pos'}, `the mouse last stopped at (${this.mousePos.x}, ${this.mousePos.y})`)
        }
      };

      const maybeThing = () => {
        if(this.hasThing) {
          return div({class:'the-thing'}, 'a thing I have!');
        }
      };
      // return the current dom
      return (
        div({class:'outer'},
          h1(`${this.greeting}`),
          div({class: 'time'}, 'the time is: ', strong(`${this.time}`)),
          list(this.items),
          slot(),
          maybeMousePos(),
          button({type:'button','on-click': event => this.hasThing = !this.hasThing}, 'toggle thing'),
          maybeThing(),
          anotherElement({name:'Howard', 'on-click':event => console.log('clicked another')})
        )
      )
    }

  };

  // define a TaDom tag function as well as a custom element
  TaDom.customElement('my-element', MyElement);
