# Breaking the Code into Modules

## Current Structure

The code is currently in a single file, `index.js`. This makes it hard to navigate and understand.

This does make it very easy to deploy, however. No compilation required, just serve the file

This app is (and always will be) a proof of concept. I don't need to optimize for loading performance, so there is no need to minimize bundle size. However, further development will be easier with a modular structure.

It is NOT yet time to consider which modules to make.

## Step 1: Make Modularity Possible

What build tools should we add to the project to make modularity possible? We want transparency and simplicity, not performance.

Please list options here:
