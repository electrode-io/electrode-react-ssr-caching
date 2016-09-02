/* eslint-disable */

import React, {Component} from "react";
import Hello from "./hello";
import RecursiveDivs from "./recursive-divs"

export default class InfoCard extends Component {
  _link(url, x) {
    if (url.startsWith("http://")) {
      url = url.substr(5);
    } else if (url.startsWith("https://")) {
      url = url.substr(6);
    }
    return <a href={url}>Link {x + 1}</a>
  }

  render() {
    return <div>
      Links: {this.props.urls.map(this._link)}
      Quote: {this.props.quote}
      Random: {this.props.random}
      <Hello {...this.props} />
      <RecursiveDivs depth={4} breadth={8} secretMessage="abcdefghij"/>
    </div>;
  }
}
