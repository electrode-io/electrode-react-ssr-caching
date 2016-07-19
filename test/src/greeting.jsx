/* eslint-disable */

import React, { Component } from "react";
import Hello from "./hello";

export default class Greeting extends Component {
  render () {
    return <div>
      <h1>Greetings</h1>
      <Hello {...this.props} />
    </div>;
  }
}
