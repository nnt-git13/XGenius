"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_ssr_src_store_useAppStore_ts";
exports.ids = ["_ssr_src_store_useAppStore_ts"];
exports.modules = {

/***/ "(ssr)/./src/store/useAppStore.ts":
/*!**********************************!*\
  !*** ./src/store/useAppStore.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   useAppStore: () => (/* binding */ useAppStore)\n/* harmony export */ });\n/* harmony import */ var zustand__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zustand */ \"(ssr)/./node_modules/zustand/esm/index.mjs\");\n/* harmony import */ var zustand_middleware__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! zustand/middleware */ \"(ssr)/./node_modules/zustand/esm/middleware.mjs\");\n/* __next_internal_client_entry_do_not_use__ useAppStore auto */ \n\nconst useAppStore = (0,zustand__WEBPACK_IMPORTED_MODULE_0__.create)()((0,zustand_middleware__WEBPACK_IMPORTED_MODULE_1__.persist)((set)=>({\n        teamId: null,\n        season: \"2024-25\",\n        theme: \"dark\",\n        currentSquad: null,\n        setTeamId: (id)=>set({\n                teamId: id\n            }),\n        setSeason: (season)=>set({\n                season\n            }),\n        setTheme: (theme)=>set({\n                theme\n            }),\n        setCurrentSquad: (squad)=>set({\n                currentSquad: squad\n            })\n    }), {\n    name: \"xgenius-storage\"\n}));\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9zcmMvc3RvcmUvdXNlQXBwU3RvcmUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O2lFQUVnQztBQUNZO0FBb0JyQyxNQUFNRSxjQUFjRiwrQ0FBTUEsR0FDL0JDLDJEQUFPQSxDQUNMLENBQUNFLE1BQVM7UUFDUkMsUUFBUTtRQUNSQyxRQUFRO1FBQ1JDLE9BQU87UUFDUEMsY0FBYztRQUVkQyxXQUFXLENBQUNDLEtBQU9OLElBQUk7Z0JBQUVDLFFBQVFLO1lBQUc7UUFDcENDLFdBQVcsQ0FBQ0wsU0FBV0YsSUFBSTtnQkFBRUU7WUFBTztRQUNwQ00sVUFBVSxDQUFDTCxRQUFVSCxJQUFJO2dCQUFFRztZQUFNO1FBQ2pDTSxpQkFBaUIsQ0FBQ0MsUUFBVVYsSUFBSTtnQkFBRUksY0FBY007WUFBTTtJQUN4RCxJQUNBO0lBQ0VDLE1BQU07QUFDUixJQUVIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8veGdlbml1cy1mcm9udGVuZC8uL3NyYy9zdG9yZS91c2VBcHBTdG9yZS50cz9mYWE5Il0sInNvdXJjZXNDb250ZW50IjpbIlwidXNlIGNsaWVudFwiXG5cbmltcG9ydCB7IGNyZWF0ZSB9IGZyb20gXCJ6dXN0YW5kXCJcbmltcG9ydCB7IHBlcnNpc3QgfSBmcm9tIFwienVzdGFuZC9taWRkbGV3YXJlXCJcblxuaW50ZXJmYWNlIEFwcFN0YXRlIHtcbiAgLy8gVXNlciBwcmVmZXJlbmNlc1xuICB0ZWFtSWQ6IG51bWJlciB8IG51bGxcbiAgc2Vhc29uOiBzdHJpbmdcbiAgXG4gIC8vIFVJIHN0YXRlXG4gIHRoZW1lOiBcImRhcmtcIiB8IFwibGlnaHRcIlxuICBcbiAgLy8gU3F1YWQgc3RhdGVcbiAgY3VycmVudFNxdWFkOiBhbnlbXSB8IG51bGxcbiAgXG4gIC8vIEFjdGlvbnNcbiAgc2V0VGVhbUlkOiAoaWQ6IG51bWJlciB8IG51bGwpID0+IHZvaWRcbiAgc2V0U2Vhc29uOiAoc2Vhc29uOiBzdHJpbmcpID0+IHZvaWRcbiAgc2V0VGhlbWU6ICh0aGVtZTogXCJkYXJrXCIgfCBcImxpZ2h0XCIpID0+IHZvaWRcbiAgc2V0Q3VycmVudFNxdWFkOiAoc3F1YWQ6IGFueVtdIHwgbnVsbCkgPT4gdm9pZFxufVxuXG5leHBvcnQgY29uc3QgdXNlQXBwU3RvcmUgPSBjcmVhdGU8QXBwU3RhdGU+KCkoXG4gIHBlcnNpc3QoXG4gICAgKHNldCkgPT4gKHtcbiAgICAgIHRlYW1JZDogbnVsbCxcbiAgICAgIHNlYXNvbjogXCIyMDI0LTI1XCIsXG4gICAgICB0aGVtZTogXCJkYXJrXCIsXG4gICAgICBjdXJyZW50U3F1YWQ6IG51bGwsXG4gICAgICBcbiAgICAgIHNldFRlYW1JZDogKGlkKSA9PiBzZXQoeyB0ZWFtSWQ6IGlkIH0pLFxuICAgICAgc2V0U2Vhc29uOiAoc2Vhc29uKSA9PiBzZXQoeyBzZWFzb24gfSksXG4gICAgICBzZXRUaGVtZTogKHRoZW1lKSA9PiBzZXQoeyB0aGVtZSB9KSxcbiAgICAgIHNldEN1cnJlbnRTcXVhZDogKHNxdWFkKSA9PiBzZXQoeyBjdXJyZW50U3F1YWQ6IHNxdWFkIH0pLFxuICAgIH0pLFxuICAgIHtcbiAgICAgIG5hbWU6IFwieGdlbml1cy1zdG9yYWdlXCIsXG4gICAgfVxuICApXG4pXG5cblxuXG5cbiJdLCJuYW1lcyI6WyJjcmVhdGUiLCJwZXJzaXN0IiwidXNlQXBwU3RvcmUiLCJzZXQiLCJ0ZWFtSWQiLCJzZWFzb24iLCJ0aGVtZSIsImN1cnJlbnRTcXVhZCIsInNldFRlYW1JZCIsImlkIiwic2V0U2Vhc29uIiwic2V0VGhlbWUiLCJzZXRDdXJyZW50U3F1YWQiLCJzcXVhZCIsIm5hbWUiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./src/store/useAppStore.ts\n");

/***/ })

};
;