/* eslint-disable */

import React, {Component} from "react";

export default class RecursiveDivs extends Component {
  render() {
    const {depth, breadth, secretMessage} = this.props;

    if (depth <= 0) {
      return <div>{secretMessage}</div>;
    }

    let children = [];
    for (let i = 0; i < breadth; i++) {
      children.push(<RecursiveDivs key={i} depth={depth-1} breadth={breadth} secretMessage={secretMessage}/>);
    }
    return <div onClick={() => this.click()}>{children}</div>;
  }

  click() {
    alert("clicked!");
  }
}
