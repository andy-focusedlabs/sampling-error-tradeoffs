# Breaking the Code into Modules

## Current Structure

The code is currently in a single file, `index.js`. This makes it hard to navigate and understand.

This does make it very easy to deploy, however. No compilation required, just serve the file

This app is (and always will be) a proof of concept. I don't need to optimize for loading performance, so there is no need to minimize bundle size. However, further development will be easier with a modular structure.

It is NOT yet time to consider which modules to make.

## Step 1: Make Modularity Possible

What build tools should we add to the project to make modularity possible? We want transparency and simplicity, not performance.

Please list options here:

**1. Native ES Modules (No Build Tool)**
- Use `<script type="module">` in HTML
- Import/export syntax works directly in modern browsers
- Zero configuration, maximum transparency
- Simply split `index.js` into modules and import them

**2. Vite**
- Minimal configuration (`npm create vite@latest . -- --template vanilla`)
- Native ES modules in development, optional bundling for production
- Hot module replacement for development
- Very transparent, builds only when needed

**3. Parcel**
- Zero-config bundler (`npm install -D parcel`)
- Automatically handles ES modules
- Simple `parcel index.html` command
- Good balance of simplicity and features

**4. esbuild (standalone)**
- Minimal setup, very fast
- Can bundle or just transform modules
- Single command: `esbuild index.js --bundle --outfile=dist/index.js`
- Excellent for proof-of-concept work

**5. Rollup**
- Designed specifically for libraries and simple bundling
- Clean ES module handling
- Good for understanding what's happening in the build

**Recommendation**: Start with **Native ES Modules** - split your code into modules and use browser-native imports. If you need a build step later, add **Vite** for its simplicity and transparency.
