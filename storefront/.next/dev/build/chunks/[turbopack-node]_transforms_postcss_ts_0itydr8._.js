module.exports = [
"[turbopack-node]/transforms/postcss.ts?config=[project]/storefront/postcss.config.js { CONFIG => \"[project]/storefront/postcss.config.js_.loader.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "chunks/node_modules__pnpm_1cl3qv5._.js",
  "chunks/[root-of-the-server]__1-kn14p._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts?config=[project]/storefront/postcss.config.js { CONFIG => \"[project]/storefront/postcss.config.js_.loader.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];