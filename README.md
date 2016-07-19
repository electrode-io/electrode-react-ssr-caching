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
var SSRProfiler = require("@walmart/electrode-react-ssr-profiler");
```

Then when you call `ReactDOM.renderToString`, do:

```
// First you should render your component in a loop to prime the V8 engine

SSRProfiler.clearProfileData();
SSRProfiler.enableProfiling();
var html = ReactDOM.renderToString(<MyComponent />);
console.log(JSON.stringify(SSRProfiler.profileData, null, 2));
```

