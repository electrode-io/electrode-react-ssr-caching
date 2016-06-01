# ssr-react-profiler

Helps profiling time each React composite component takes in SSR

# Installing

```
$npm i @walmart/ssr-react-profiler
```

# Usage

This module should be loaded as early as possible in order to install the hook to profile React SSR.

You just need to require it:

```js
require("@walmart/ssr-react-profiler");
```

Then when you call `ReactDOM.renderToString`, do:

```
ssrReactProfiler.clearProfileData();
var html = ReactDOM.renderToString();
console.log(JSON.stringify(ssrReactProfiler, null, 2));
```

