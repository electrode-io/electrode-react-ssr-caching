/* eslint-disable */

import React, {Component} from "react";
import RecursiveDivs from "./recursive-divs"

export default class Hello extends Component {
  render() {
    return <div><h2>Hello, {this.props.name}</h2>
      <span dangerouslySetInnerHTML={{__html: this.props.message}}/>
      <RecursiveDivs depth={5} breadth={4} secretMessage="Hello from Electrode"/>
    </div>;
  }
}
