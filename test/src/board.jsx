/* eslint-disable */

import React, { Component } from "react";
import InfoCard from "./info-card";
import Heading from "./heading";

export default class Board extends Component {
  _renderUser (user) {
    return <InfoCard {...user} />;
  }

  render () {
    return <div>
      <Heading title="Board" />
      {this.props.users.map(this._renderUser)}
    </div>;
  }
}
