/* eslint-disable */

import Greeting from "./greeting";
import React from "react";
import {renderToString} from "react-dom/server";

export default function (name, message) {
  return renderToString(<Greeting name={name} message={message}/>);
};
