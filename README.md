## Ta-Dom! 🎉  Components ##

A tiny web components library using [ta-dom](https://github.com/jrobinson01/ta-dom) and [morphdom](https://github.com/patrick-steele-idem/morphdom)

### What is it? ###
Ta-Dom! Components is a small library that combines some of the best features of the React and Polymer libraries to make writing web components fast, fun, and easy.

#### How it Works ####
Ta-Dom! Components are built a lot like Polymer components, using a class to define your component. However, it also leverages the virtual DOM concept from React to allow writing a pure render function instead of a template (string!) littered with `<dom-if>`'s and `<dom-repeat>`'s. This lets you keep your display logic neatly in one place, where you can leverage the full power of javascript.

Like Polymer, Ta-Dom! Components expose their state as local instance properties that can be manipulated however you see fit without having to learn any new api's. Whether you change a property directly, or batch your changes through the inherited `setState({key:value})` interface, the Ta-Dom! base class will handle updating your screen for you in a fast and efficient manner thanks to [Morphdom](https://github.com/patrick-steele-idem/morphdom).

Unlike React's virtual DOM, in Ta-Dom! you're always dealing with real DOM elements. It's encouraged to use the Ta-Dom! DOM creation library because it's awesome, but you're free to construct your DOM however you see fit. All of the native DOM api's available.

#### Getting Started ####
`npm install --save jrobinson01/ta-dom-components`

#### A Simple Ta-Dom Component ####
```javascript
// import TaDomElement
import TaDom from './node-modules/ta-dom-components/ta-dom-element.js';

// define your element's class
MyElement extends TaDom.TaDomElement {

  // define a static getter for your css
  static get css() {
    return `
      :host {
        display: block;
        background: gray;
      }
      :host([read]) {
        background: green;
      }
      h1 {
        color: brown;
      }
      article {
        background: brown;
        color: white;
      }

    `
  }

  // define a static getter for your properties
  static get properties() {
    return {
      header:{
        value: '',
      },
      content: {
        value: ''
      },
      read: {
        value: false,
        reflectToAttribute: true
      }
    }
  }

  // a static getter for any attributes you want to observe
  static get observedAttributes() {
    return ['header', 'content', 'read']
  }

  // a render function returns the current state of your dom
  render() {
    return div({class:'wrapper'},
            h1(`${this.header}`),
            article({'on-click':(event) => this.onClickArticle(event)}, `${this.content}`)
    );
  }

  // event handler called when the article is clicked
  onClickArticle(event) {
    this.read = true;
  }
}
// register your element
TaDom.customElement('myElement', 'my-element', MyElement);
```

##### Contributing #####
