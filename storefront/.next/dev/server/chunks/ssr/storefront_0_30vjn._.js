module.exports = [
"[project]/storefront/components/cart/add-to-cart.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AddToCart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.2_@babel+core@7.29.7_supports-color@7.2.0__@types+node@22.10.7_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.2_@babel+core@7.29.7_supports-color@7.2.0__@types+node@22.10.7_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$lib$2f$cart$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/storefront/lib/cart.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/storefront/components/ui/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$product$2f$icons$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/storefront/components/product/icons.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
function AddToCart({ product, quantity }) {
    const [added, setAdded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    if (!product.availableForSale) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
            fullWidth: true,
            disabled: true,
            "aria-disabled": "true",
            children: "Agotado"
        }, void 0, false, {
            fileName: "[project]/storefront/components/cart/add-to-cart.tsx",
            lineNumber: 31,
            columnNumber: 7
        }, this);
    }
    function handleAdd() {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$lib$2f$cart$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["writeCart"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$lib$2f$cart$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["addLine"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$lib$2f$cart$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["readCart"])(), product, quantity));
        setAdded(true);
        window.setTimeout(()=>setAdded(false), 2000);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                fullWidth: true,
                onClick: handleAdd,
                children: added ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$product$2f$icons$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CheckIcon"], {}, void 0, false, {
                            fileName: "[project]/storefront/components/cart/add-to-cart.tsx",
                            lineNumber: 48,
                            columnNumber: 13
                        }, this),
                        "Agregado"
                    ]
                }, void 0, true, {
                    fileName: "[project]/storefront/components/cart/add-to-cart.tsx",
                    lineNumber: 47,
                    columnNumber: 11
                }, this) : 'Agregar al carrito'
            }, void 0, false, {
                fileName: "[project]/storefront/components/cart/add-to-cart.tsx",
                lineNumber: 45,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "aria-live": "polite",
                "aria-atomic": "true",
                className: "sr-only",
                children: added ? `${quantity} × ${product.name} agregado al carrito.` : ''
            }, void 0, false, {
                fileName: "[project]/storefront/components/cart/add-to-cart.tsx",
                lineNumber: 57,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/storefront/components/cart/add-to-cart.tsx",
        lineNumber: 44,
        columnNumber: 5
    }, this);
}
}),
"[project]/storefront/components/product/delivery-message.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DeliveryMessage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.2_@babel+core@7.29.7_supports-color@7.2.0__@types+node@22.10.7_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
;
function DeliveryMessage({ product }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded border border-border bg-surface px-4 py-3 text-sm",
        children: [
            product.availableForSale ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-foreground",
                children: "Disponible ahora · Entrega refrigerada"
            }, void 0, false, {
                fileName: "[project]/storefront/components/product/delivery-message.tsx",
                lineNumber: 15,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-foreground",
                children: "Agotado por el momento. Vuelve a consultar: el inventario se actualiza conforme llega producto fresco."
            }, void 0, false, {
                fileName: "[project]/storefront/components/product/delivery-message.tsx",
                lineNumber: 19,
                columnNumber: 9
            }, this),
            product.storageInstructions ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-muted",
                children: product.storageInstructions
            }, void 0, false, {
                fileName: "[project]/storefront/components/product/delivery-message.tsx",
                lineNumber: 26,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/storefront/components/product/delivery-message.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
}),
"[project]/storefront/components/product/icons.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * The only icons the PDP uses.
 *
 * Inline SVG rather than an icon package: two glyphs do not justify a
 * dependency, and the storefront's personality comes from photography and
 * type, not from iconography.
 */ __turbopack_context__.s([
    "CheckIcon",
    ()=>CheckIcon,
    "MinusIcon",
    ()=>MinusIcon,
    "PlusIcon",
    ()=>PlusIcon
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.2_@babel+core@7.29.7_supports-color@7.2.0__@types+node@22.10.7_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
;
function MinusIcon() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        width: "16",
        height: "16",
        viewBox: "0 0 16 16",
        "aria-hidden": "true",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M3 8h10",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinecap: "round"
        }, void 0, false, {
            fileName: "[project]/storefront/components/product/icons.tsx",
            lineNumber: 11,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/storefront/components/product/icons.tsx",
        lineNumber: 10,
        columnNumber: 5
    }, this);
}
function PlusIcon() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        width: "16",
        height: "16",
        viewBox: "0 0 16 16",
        "aria-hidden": "true",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M8 3v10M3 8h10",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinecap: "round"
        }, void 0, false, {
            fileName: "[project]/storefront/components/product/icons.tsx",
            lineNumber: 19,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/storefront/components/product/icons.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
function CheckIcon() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        width: "16",
        height: "16",
        viewBox: "0 0 16 16",
        "aria-hidden": "true",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M3 8.5l3.5 3.5L13 5",
            stroke: "currentColor",
            strokeWidth: "1.75",
            fill: "none",
            strokeLinecap: "round",
            strokeLinejoin: "round"
        }, void 0, false, {
            fileName: "[project]/storefront/components/product/icons.tsx",
            lineNumber: 27,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/storefront/components/product/icons.tsx",
        lineNumber: 26,
        columnNumber: 5
    }, this);
}
}),
"[project]/storefront/components/product/origin-label.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OriginLabel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.2_@babel+core@7.29.7_supports-color@7.2.0__@types+node@22.10.7_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
;
function OriginLabel({ product }) {
    const parts = [
        product.presentation,
        product.origin
    ].filter(Boolean);
    if (parts.length === 0) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        className: "text-sm text-muted",
        children: parts.map((part, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: [
                    i > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        "aria-hidden": "true",
                        children: " · "
                    }, void 0, false, {
                        fileName: "[project]/storefront/components/product/origin-label.tsx",
                        lineNumber: 19,
                        columnNumber: 20
                    }, this) : null,
                    part
                ]
            }, part, true, {
                fileName: "[project]/storefront/components/product/origin-label.tsx",
                lineNumber: 18,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/storefront/components/product/origin-label.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
}),
"[project]/storefront/components/product/product-description.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ProductDescription
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.2_@babel+core@7.29.7_supports-color@7.2.0__@types+node@22.10.7_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.2_@babel+core@7.29.7_supports-color@7.2.0__@types+node@22.10.7_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$ui$2f$price$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/storefront/components/ui/price.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$cart$2f$add$2d$to$2d$cart$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/storefront/components/cart/add-to-cart.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$product$2f$variant$2d$selector$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/storefront/components/product/variant-selector.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$product$2f$quantity$2d$selector$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/storefront/components/product/quantity-selector.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$product$2f$delivery$2d$message$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/storefront/components/product/delivery-message.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$product$2f$origin$2d$label$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/storefront/components/product/origin-label.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
;
function ProductDescription({ product }) {
    const [variantId, setVariantId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(product.variants[0]?.id ?? product.id);
    const [quantity, setQuantity] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(1);
    const variant = product.variants.find((v)=>v.id === variantId) ?? product.variants[0];
    const price = variant?.price ?? product.price;
    const available = variant?.available ?? product.available;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col gap-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-4xl leading-tight md:text-5xl",
                        children: product.name
                    }, void 0, false, {
                        fileName: "[project]/storefront/components/product/product-description.tsx",
                        lineNumber: 38,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-2",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$product$2f$origin$2d$label$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            product: product
                        }, void 0, false, {
                            fileName: "[project]/storefront/components/product/product-description.tsx",
                            lineNumber: 40,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/storefront/components/product/product-description.tsx",
                        lineNumber: 39,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/storefront/components/product/product-description.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this),
            product.shortDescription ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-lg text-foreground",
                children: product.shortDescription
            }, void 0, false, {
                fileName: "[project]/storefront/components/product/product-description.tsx",
                lineNumber: 45,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-2xl",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$ui$2f$price$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        value: price,
                        unit: product.unit
                    }, void 0, false, {
                        fileName: "[project]/storefront/components/product/product-description.tsx",
                        lineNumber: 49,
                        columnNumber: 9
                    }, this),
                    product.netWeightGrams ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "ml-2 text-sm text-muted",
                        children: [
                            product.netWeightGrams,
                            " g"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/storefront/components/product/product-description.tsx",
                        lineNumber: 51,
                        columnNumber: 11
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/storefront/components/product/product-description.tsx",
                lineNumber: 48,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$product$2f$variant$2d$selector$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                variants: product.variants,
                selectedId: variantId,
                onSelect: (id)=>{
                    setVariantId(id);
                    // A variant with less stock than the current quantity would otherwise
                    // leave the shopper with a quantity the checkout will reject.
                    const next = product.variants.find((v)=>v.id === id);
                    if (next && quantity > next.available) {
                        setQuantity(Math.max(1, next.available));
                    }
                }
            }, void 0, false, {
                fileName: "[project]/storefront/components/product/product-description.tsx",
                lineNumber: 57,
                columnNumber: 7
            }, this),
            product.availableForSale ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$product$2f$quantity$2d$selector$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                value: quantity,
                max: available,
                onChange: setQuantity
            }, void 0, false, {
                fileName: "[project]/storefront/components/product/product-description.tsx",
                lineNumber: 72,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$product$2f$delivery$2d$message$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                product: product
            }, void 0, false, {
                fileName: "[project]/storefront/components/product/product-description.tsx",
                lineNumber: 79,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$cart$2f$add$2d$to$2d$cart$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                product: product,
                quantity: quantity
            }, void 0, false, {
                fileName: "[project]/storefront/components/product/product-description.tsx",
                lineNumber: 81,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/storefront/components/product/product-description.tsx",
        lineNumber: 36,
        columnNumber: 5
    }, this);
}
}),
"[project]/storefront/components/product/quantity-selector.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>QuantitySelector
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.2_@babel+core@7.29.7_supports-color@7.2.0__@types+node@22.10.7_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$product$2f$icons$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/storefront/components/product/icons.tsx [app-ssr] (ecmascript)");
'use client';
;
;
function QuantitySelector({ value, max, onChange }) {
    const canDecrease = value > 1;
    const canIncrease = max > 0 && value < max;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                htmlFor: "quantity",
                className: "mb-2 block text-sm font-medium",
                children: "Cantidad"
            }, void 0, false, {
                fileName: "[project]/storefront/components/product/quantity-selector.tsx",
                lineNumber: 26,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>onChange(value - 1),
                        disabled: !canDecrease,
                        "aria-label": "Quitar uno",
                        className: "flex h-11 w-11 items-center justify-center rounded border border-border bg-surface transition-colors duration-150 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$product$2f$icons$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MinusIcon"], {}, void 0, false, {
                            fileName: "[project]/storefront/components/product/quantity-selector.tsx",
                            lineNumber: 41,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/storefront/components/product/quantity-selector.tsx",
                        lineNumber: 34,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        id: "quantity",
                        type: "number",
                        inputMode: "numeric",
                        min: 1,
                        max: max || 1,
                        value: value,
                        onChange: (e)=>{
                            const next = Number(e.target.value);
                            if (!Number.isFinite(next)) return;
                            onChange(Math.min(Math.max(1, Math.floor(next)), max || 1));
                        },
                        className: "h-11 w-16 rounded border border-border bg-surface text-center text-sm tabular-nums"
                    }, void 0, false, {
                        fileName: "[project]/storefront/components/product/quantity-selector.tsx",
                        lineNumber: 44,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>onChange(value + 1),
                        disabled: !canIncrease,
                        "aria-label": "Agregar uno",
                        className: "flex h-11 w-11 items-center justify-center rounded border border-border bg-surface transition-colors duration-150 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$components$2f$product$2f$icons$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PlusIcon"], {}, void 0, false, {
                            fileName: "[project]/storefront/components/product/quantity-selector.tsx",
                            lineNumber: 66,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/storefront/components/product/quantity-selector.tsx",
                        lineNumber: 59,
                        columnNumber: 9
                    }, this),
                    max > 0 && max <= 5 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "ml-2 text-sm text-muted",
                        children: [
                            "Quedan ",
                            max
                        ]
                    }, void 0, true, {
                        fileName: "[project]/storefront/components/product/quantity-selector.tsx",
                        lineNumber: 70,
                        columnNumber: 11
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/storefront/components/product/quantity-selector.tsx",
                lineNumber: 33,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/storefront/components/product/quantity-selector.tsx",
        lineNumber: 25,
        columnNumber: 5
    }, this);
}
}),
"[project]/storefront/components/product/variant-selector.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>VariantSelector
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.2_@babel+core@7.29.7_supports-color@7.2.0__@types+node@22.10.7_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$lib$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/storefront/lib/format.ts [app-ssr] (ecmascript)");
'use client';
;
;
function VariantSelector({ variants, selectedId, onSelect }) {
    if (variants.length <= 1) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("fieldset", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("legend", {
                className: "mb-2 text-sm font-medium",
                children: "Presentación"
            }, void 0, false, {
                fileName: "[project]/storefront/components/product/variant-selector.tsx",
                lineNumber: 34,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap gap-2",
                children: variants.map((variant)=>{
                    const selected = variant.id === selectedId;
                    const disabled = !variant.availableForSale;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>onSelect(variant.id),
                        disabled: disabled,
                        "aria-pressed": selected,
                        className: [
                            'rounded border px-4 py-2 text-sm transition-colors duration-150',
                            selected ? 'border-brand bg-brand text-background' : 'border-border bg-surface hover:border-brand',
                            disabled ? 'cursor-not-allowed line-through opacity-50' : ''
                        ].join(' '),
                        children: [
                            variant.title,
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "ml-2 text-xs opacity-80",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$lib$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatMoney"])(variant.price)
                            }, void 0, false, {
                                fileName: "[project]/storefront/components/product/variant-selector.tsx",
                                lineNumber: 56,
                                columnNumber: 15
                            }, this),
                            disabled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "sr-only",
                                children: " — agotado"
                            }, void 0, false, {
                                fileName: "[project]/storefront/components/product/variant-selector.tsx",
                                lineNumber: 59,
                                columnNumber: 27
                            }, this) : null
                        ]
                    }, variant.id, true, {
                        fileName: "[project]/storefront/components/product/variant-selector.tsx",
                        lineNumber: 41,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/storefront/components/product/variant-selector.tsx",
                lineNumber: 35,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/storefront/components/product/variant-selector.tsx",
        lineNumber: 33,
        columnNumber: 5
    }, this);
}
}),
"[project]/storefront/components/ui/button.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Button
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.2_@babel+core@7.29.7_supports-color@7.2.0__@types+node@22.10.7_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
;
function Button({ variant = 'primary', fullWidth = false, className = '', ...rest }) {
    const base = 'inline-flex items-center justify-center gap-2 rounded px-6 py-3 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45';
    const look = variant === 'primary' ? 'bg-brand text-background hover:bg-brand-dark' : 'border border-border bg-surface text-foreground hover:bg-sand';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        className: `${base} ${look} ${fullWidth ? 'w-full' : ''} ${className}`,
        ...rest
    }, void 0, false, {
        fileName: "[project]/storefront/components/ui/button.tsx",
        lineNumber: 27,
        columnNumber: 5
    }, this);
}
}),
"[project]/storefront/components/ui/price.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Price
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.2_@babel+core@7.29.7_supports-color@7.2.0__@types+node@22.10.7_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$lib$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/storefront/lib/format.ts [app-ssr] (ecmascript)");
;
;
function Price({ value, unit, className = '' }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `tabular-nums ${className}`,
        children: [
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$lib$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatMoney"])(value),
            unit ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$2_$40$babel$2b$core$40$7$2e$29$2e$7_supports$2d$color$40$7$2e$2$2e$0_$5f40$types$2b$node$40$22$2e$10$2e$7_react$2d$dom$40$19$2e$2$2e$8_react$40$19$2e$2$2e$8_$5f$react$40$19$2e$2$2e$8$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-muted",
                children: [
                    " / ",
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$lib$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatUnit"])(unit)
                ]
            }, void 0, true, {
                fileName: "[project]/storefront/components/ui/price.tsx",
                lineNumber: 24,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/storefront/components/ui/price.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
}),
"[project]/storefront/lib/cart.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Cart store.
 *
 * The cart lives in the browser, never on the server: `RF-TDA-006` says adding
 * to the cart must not reserve stock, and a server-side cart would invite
 * exactly that. Stock is reserved once, at checkout.
 *
 * Only ids and quantities are ever sent to the API. The prices kept here are
 * for display; the authoritative total is computed server-side from the
 * catalogue (RN-008), so a tampered localStorage cannot change what is charged.
 *
 * This module is the storage layer. The provider and drawer are built on top of
 * it and share this same key, so nothing here is throwaway.
 */ __turbopack_context__.s([
    "EMPTY_CART",
    ()=>EMPTY_CART,
    "addLine",
    ()=>addLine,
    "cartCount",
    ()=>cartCount,
    "cartSubtotalCents",
    ()=>cartSubtotalCents,
    "readCart",
    ()=>readCart,
    "removeLine",
    ()=>removeLine,
    "setLineQuantity",
    ()=>setLineQuantity,
    "writeCart",
    ()=>writeCart
]);
const STORAGE_KEY = 'amoramar.cart.v1';
const EMPTY_CART = {
    lines: []
};
function readCart() {
    if ("TURBOPACK compile-time truthy", 1) return EMPTY_CART;
    //TURBOPACK unreachable
    ;
}
function writeCart(cart) {
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
}
function addLine(cart, product, quantity) {
    const existing = cart.lines.find((l)=>l.productId === product.id);
    if (existing) {
        return {
            lines: cart.lines.map((l)=>l.productId === product.id ? {
                    ...l,
                    quantity: l.quantity + quantity
                } : l)
        };
    }
    const line = {
        productId: product.id,
        handle: product.handle,
        name: product.name,
        unitPrice: product.price,
        quantity,
        image: product.featuredImage
    };
    return {
        lines: [
            ...cart.lines,
            line
        ]
    };
}
function setLineQuantity(cart, productId, quantity) {
    if (quantity <= 0) return removeLine(cart, productId);
    return {
        lines: cart.lines.map((l)=>l.productId === productId ? {
                ...l,
                quantity
            } : l)
    };
}
function removeLine(cart, productId) {
    return {
        lines: cart.lines.filter((l)=>l.productId !== productId)
    };
}
function cartCount(cart) {
    return cart.lines.reduce((n, l)=>n + l.quantity, 0);
}
function cartSubtotalCents(cart) {
    return cart.lines.reduce((sum, l)=>sum + l.unitPrice.amountCents * l.quantity, 0);
}
}),
"[project]/storefront/lib/commerce/constants.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Commerce configuration.
 *
 * Business thresholds live here, never inline in a component: the shipping
 * banner and the cart both need the same number, and two copies of it will
 * disagree eventually.
 */ /**
 * Free-shipping threshold in centavos, or null when the rule is not configured.
 *
 * Null is meaningful: the ShippingProgress component hides itself rather than
 * inventing a target. Delivery pricing is not modelled in the backend yet.
 */ __turbopack_context__.s([
    "CURRENCY",
    ()=>CURRENCY,
    "FREE_SHIPPING_THRESHOLD_CENTS",
    ()=>FREE_SHIPPING_THRESHOLD_CENTS,
    "LOCALE",
    ()=>LOCALE,
    "NAV_COLLECTIONS",
    ()=>NAV_COLLECTIONS
]);
const FREE_SHIPPING_THRESHOLD_CENTS = null;
const CURRENCY = 'MXN';
const LOCALE = 'es-MX';
const NAV_COLLECTIONS = [
    {
        handle: 'pescados',
        title: 'Pescados'
    },
    {
        handle: 'mariscos',
        title: 'Mariscos'
    },
    {
        handle: 'de-temporada',
        title: 'De temporada'
    }
];
}),
"[project]/storefront/lib/format.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "formatMoney",
    ()=>formatMoney,
    "formatUnit",
    ()=>formatUnit
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$lib$2f$commerce$2f$constants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/storefront/lib/commerce/constants.ts [app-ssr] (ecmascript)");
;
const formatter = new Intl.NumberFormat(__TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$lib$2f$commerce$2f$constants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LOCALE"], {
    style: 'currency',
    currency: __TURBOPACK__imported__module__$5b$project$5d2f$storefront$2f$lib$2f$commerce$2f$constants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CURRENCY"]
});
function formatMoney(money) {
    return formatter.format(money.amountCents / 100);
}
const UNIT_LABEL = {
    piece: 'pieza',
    pack: 'paquete',
    kg: 'kg'
};
function formatUnit(unit) {
    return UNIT_LABEL[unit] ?? unit;
}
}),
];

//# sourceMappingURL=storefront_0_30vjn._.js.map