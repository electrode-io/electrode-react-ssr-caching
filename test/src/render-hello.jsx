/* eslint-disable */

import Hello from "./hello";
import React from "react";
import {renderToString} from "react-dom/server";

export default function (name, message) {
  return renderToString(<Hello name={name} message={message}/>);
};
