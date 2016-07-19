/* eslint-disable */

import React, { Component } from "react";
import InfoCard from "./info-card";

export default class Board extends Component {
  _renderUser (user) {
    return <InfoCard {...user} />;
  }

  render () {
    return <div>
      <h1>Board</h1>
      {this.props.users.map(this._renderUser)}
    </div>;
  }
}
