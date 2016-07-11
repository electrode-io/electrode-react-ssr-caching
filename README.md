# electrode-react-ssr-profiler

Helps profiling time each React composite component takes in SSR

# Installing

```
$npm i @walmart/electrode-react-ssr-profiler
```

# Usage

This module should be loaded as early as possible in order to install the hook to profile React SSR.

You just need to require it:

```js
var ssrReactProfiler = require("@walmart/electrode-react-ssr-profiler");
```

Then when you call `ReactDOM.renderToString`, do:

```
ssrReactProfiler.clearProfileData();
var html = ReactDOM.renderToString();
console.log(JSON.stringify(ssrReactProfiler.profileData, null, 2));
```

