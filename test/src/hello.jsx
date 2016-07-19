/* eslint-disable */

import React, {Component} from "react";

export default class Hello extends Component {
  render() {
    return <div><h2>Hello, {this.props.name}</h2>
      <span dangerouslySetInnerHTML={{__html: this.props.message}}/>
    </div>;
  }
}
