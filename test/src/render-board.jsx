/* eslint-disable */

import Board from "./board";
import React from "react";
import {renderToString} from "react-dom/server";

export default function (users) {
  return renderToString(<Board users={users} />);
};
