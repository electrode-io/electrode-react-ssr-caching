# electrode-react-ssr-profiler

Support React Server Side Rendering profiling to inspect the time each component took to render and provide component caching to help you speed up SSR.

# Installing

```
npm i @walmart/electrode-react-ssr-profiler
```

# Usage

## Profiling

You can use this module to inspect the time each component took to render.

```js
import SSRProfiler from "@walmart/electrode-react-ssr-profiler";
import { renderToString } from "react-dom/server";
import MyComponent from "mycomponent";

// First you should render your component in a loop to prime the JS engine (i.e: V8 for NodeJS)
for( let i = 0; i < 10; i ++ ) {
    renderToString(<MyComponent />);
}

SSRProfiler.clearProfileData();
SSRProfiler.enableProfiling();
const html = renderToString(<MyComponent />);
SSRProfiler.enableProfiling(false);
console.log(JSON.stringify(SSRProfiler.profileData, null, 2));
```

## Caching

Once you determined the most expensive components with profiling, you can enable component caching this module provides to speed up SSR performance.

The basic steps to enabling caching are:

```js
import SSRProfiler from "@walmart/electrode-react-ssr-profiler";

SSRProfiler.enableCaching();
SSRProfiler.setCachingConfig(cacheConfig);
```

Where `cacheConfig` contains information on what component to apply caching.  See below for details.

### cacheConfig

SSR component caching was first demonstrated in [Sasha Aickin's talk].

His demo requires each component to provide a function for generating the cache key.

Here we implemented two cache key generation strategies: `simple` and `template`.

You are required to pass in the `cacheConfig` to tell this module what component to apply caching.

For example:

```js
const cacheConfig = {
    components: {
        "Component1": {
            strategy: "simple",
            enable: true
        },
        "Component2": {
            strategy: "template",
            enable: true
        }
    }
}

SSRProfiler.setCachingConfig(cacheConfig);
```

### Caching Strategies

#### simple

The `simple` caching strategy is basically doing a `JSON.stringify` on the component's props.  You can also specify a callback in `cacheConfig` to return the key.

For example:

```js
const cacheConfig = {
    components: {
        Component1: {
            strategy: "simple",
            enable: true,
            genCacheKey: (props) => JSON.stringify(props)
        }
    }
};
```

This strategy is not very flexible.  You need a cache entry for each different props.  However it requires very little processing time.

#### template

The `template` is more complex but flexible.  

The idea is akin to generating logic-less handlebars template from your React components and then use string replace to process the template with different props. 

[Sasha Aickin's talk]: https://www.youtube.com/watch?v=PnpfGy7q96U
