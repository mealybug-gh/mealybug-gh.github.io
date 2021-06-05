(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["main"], {
        /***/ "./$$_lazy_route_resource lazy recursive": 
        /*!******************************************************!*\
          !*** ./$$_lazy_route_resource lazy namespace object ***!
          \******************************************************/
        /*! no static exports found */
        /***/ (function (module, exports) {
            function webpackEmptyAsyncContext(req) {
                // Here Promise.resolve().then() is used instead of new Promise() to prevent
                // uncaught exception popping up in devtools
                return Promise.resolve().then(function () {
                    var e = new Error("Cannot find module '" + req + "'");
                    e.code = 'MODULE_NOT_FOUND';
                    throw e;
                });
            }
            webpackEmptyAsyncContext.keys = function () { return []; };
            webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
            module.exports = webpackEmptyAsyncContext;
            webpackEmptyAsyncContext.id = "./$$_lazy_route_resource lazy recursive";
            /***/ 
        }),
        /***/ "./node_modules/raw-loader/dist/cjs.js!./src/app/app.component.html": 
        /*!**************************************************************************!*\
          !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/app.component.html ***!
          \**************************************************************************/
        /*! exports provided: default */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony default export */ __webpack_exports__["default"] = ("<nav class=\"navbar navbar-expand-md navbar-dark bg-dark mb-4\">\n\t<a class=\"navbar-brand\" href=\"#\">HTML Bin</a> <button aria-controls=\"navbarCollapse\" aria-expanded=\"false\" aria-label=\"Toggle navigation\" class=\"navbar-toggler\" type=\"button\" (click)=\"navbarShow = !navbarShow\"><span class=\"navbar-toggler-icon\"></span></button>\n\t<div class=\"collapse navbar-collapse\" id=\"navbarCollapse\" [class.show]=\"navbarShow\">\n\t\t<ul class=\"navbar-nav mr-auto\" style=\"padding-left: 7px; padding-right: 7px;\">\n\t\t\t<li class=\"nav-item active\">\n\t\t\t\t<a class=\"nav-link\" [routerLink]=\"'/'\">Home</a>\n\t\t\t</li>\n\t\t\t<li class=\"nav-item\">\n\t\t\t\t<a class=\"nav-link\" [routerLink]=\"'/upload'\">Upload</a>\n\t\t\t</li>\n\t\t</ul>\n\t</div>\n</nav>\n<main class=\"container\" role=\"main\">\n\t<div class=\"row\">\n\t\t<div class=\"col-12\">\n\t\t\t<router-outlet></router-outlet>\n\t\t</div>\n\t</div>\n</main>\n");
            /***/ 
        }),
        /***/ "./node_modules/raw-loader/dist/cjs.js!./src/app/start/start.component.html": 
        /*!**********************************************************************************!*\
          !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/start/start.component.html ***!
          \**********************************************************************************/
        /*! exports provided: default */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony default export */ __webpack_exports__["default"] = ("<h1>HTML Bin for Text and HTML</h1>\n<p><strong>Fully encrypted documents</strong></p>\n<p><em>On-site upload is not supported for this instance.</em></p>\n<p><em>You can encrypt content manually and use git to upload to the uploads folder if you have access to the repository.</em></p>\n");
            /***/ 
        }),
        /***/ "./node_modules/raw-loader/dist/cjs.js!./src/app/upload/upload.component.html": 
        /*!************************************************************************************!*\
          !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/upload/upload.component.html ***!
          \************************************************************************************/
        /*! exports provided: default */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony default export */ __webpack_exports__["default"] = ("<h1>Upload</h1>\n<p><strong>On-site upload is not supported for this instance.</strong> If you have access to the upload folder of this instance, you can create the encrypted file here and upload it manually.</p>\n<p><em>Please note:</em> Input of the type \"HTML document\" will be displayed window-filling, but not open in a new window or frame. Bootstrap 4 classes can be used for styling.</p>\n<div class=\"row\">\n  <div class=\"col-12\" *ngIf=\"errorMessage\">\n    <div class=\"alert alert-warning\">{{errorMessage}}</div>\n  </div>\n</div>\n<form *ngIf=\"!isDownload\">\n    <div class=\"row mb-3\">\n      <div class=\"col-12\">\n        <div class=\"dropdown d-block d-sm-inline-block mr-3\">\n          <button class=\"btn btn-secondary dropdown-toggle\" type=\"button\" id=\"dropdownMenuButton\" data-toggle=\"dropdown\" aria-haspopup=\"true\" aria-expanded=\"false\" (click)=\"showFileDropdown=!showFileDropdown\">\n            {{contentTypeName}}\n          </button>\n          <div class=\"dropdown-menu\" [class.show]=\"showFileDropdown\" aria-labelledby=\"dropdownMenuButton\">\n            <span class=\"dropdown-item\" (click)=\"onFileDropdownSelect('text', 'Text')\">Text</span>\n            <span class=\"dropdown-item\" (click)=\"onFileDropdownSelect('html', 'HTML')\">HTML</span>\n            <span class=\"dropdown-item\" (click)=\"onFileDropdownSelect('document', 'HTML Dokument')\">HTML Document</span>\n          </div>\n        </div>\n\n        <button class=\"btn btn-success my-2 my-sm-0 mr-3\" type=\"button\" (click)=\"onEncrypt()\"\n          [attr.disabled]=\"contentText.length > 0 ? null : ''\">Encrypt</button>\n\n      </div>\n    </div>\n    <div class=\"row\">\n      <div class=\"col-12\">\n        <div class=\"row\">\n          <div class=\"col-12 col-sm-6\">\n            <input type=\"text\" class=\"d-block w-100 text-dark bg-light form-control\" name=\"fileName\" [(ngModel)]=\"fileName\" placeholder=\"filename\">\n          </div>\n          <div class=\"col-12 col-sm-6\">\n            <input type=\"password\" class=\"d-block w-100 text-dark bg-light form-control\" name=\"encryptionPassword\" [(ngModel)]=\"encryptionPassword\" placeholder=\"password\">\n          </div>\n          <div class=\"col-12\"><small>Filename and password are optional fields. If left empty, or if the password is shorter than 12 characters, a value will be generated automatically. Use manually set filename and password for readable links.</small></div>\n        </div>\n      </div>\n      <div class=\"col-12 mt-3\">\n          <textarea class=\"d-block w-100 text-dark bg-light form-control\" style=\"height: 40vh;\" name=\"contentText\" [(ngModel)]=\"contentText\" placeholder=\"content\"></textarea>\n      </div>\n    </div>\n</form>\n<div class=\"row\" *ngIf=\"isDownload\">\n  <div class=\"col-12\">\n    <p class=\"text-center\">\n      <a disabled class=\"btn btn-outline-success my-2 my-sm-0\" type=\"button\" [href]=\"dataURI\" target=\"_blank\" download>Download</a>\n    </p>\n    <p>Please download the encrypted file, name it \"{{serverFileName}}.json\" and upload it into the uploads directory.</p>\n    <p>You can then open the file using the following link:</p>\n    <p>\n      <span class=\"d-block form-control text-dark bg-light w-100\">{{applicationOrigin}}/htmlbin/#/view/{{fileName}}/{{encryptionPassword}}</span>\n    </p>\n  </div>\n</div>\n");
            /***/ 
        }),
        /***/ "./node_modules/raw-loader/dist/cjs.js!./src/app/viewer/viewer.component.html": 
        /*!************************************************************************************!*\
          !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/viewer/viewer.component.html ***!
          \************************************************************************************/
        /*! exports provided: default */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony default export */ __webpack_exports__["default"] = ("<div class=\"showDocument\" *ngIf=\"isLoading\"></div>\n<div class=\"row\" *ngIf=\"!errorMessage\">\n  <div class=\"col-12\">\n    <div class=\"row\" *ngIf=\"fileType === 'text'\">\n      <div class=\"col-12\">\n        <pre class=\"d-block p-3 rounded text-dark bg-light w-100\">\n          {{decryptedText}}\n        </pre>\n      </div>\n    </div>\n    <div class=\"row\" *ngIf=\"fileType === 'html'\">\n      <div class=\"col-12\">\n        <div class=\"d-block p-3 rounded text-dark bg-light w-100\" [innerHTML]=\"documentHTML\"></div>\n      </div>\n    </div>\n    <div class=\"row\" *ngIf=\"fileType === 'document'\">\n      <div class=\"col-12\">\n        <div class=\"showDocument\" [innerHTML]=\"documentHTML | safeHtml\"></div>\n      </div>\n    </div>\n  </div>\n</div>\n<div class=\"row\" *ngIf=\"errorMessage\">\n  <div class=\"col-12\">\n    <div class=\"alert alert-warning\">{{errorMessage}}</div>\n  </div>\n</div>\n");
            /***/ 
        }),
        /***/ "./node_modules/tslib/tslib.es6.js": 
        /*!*****************************************!*\
          !*** ./node_modules/tslib/tslib.es6.js ***!
          \*****************************************/
        /*! exports provided: __extends, __assign, __rest, __decorate, __param, __metadata, __awaiter, __generator, __exportStar, __values, __read, __spread, __spreadArrays, __await, __asyncGenerator, __asyncDelegator, __asyncValues, __makeTemplateObject, __importStar, __importDefault */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__extends", function () { return __extends; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__assign", function () { return __assign; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__rest", function () { return __rest; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__decorate", function () { return __decorate; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__param", function () { return __param; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__metadata", function () { return __metadata; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__awaiter", function () { return __awaiter; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__generator", function () { return __generator; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__exportStar", function () { return __exportStar; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__values", function () { return __values; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__read", function () { return __read; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__spread", function () { return __spread; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__spreadArrays", function () { return __spreadArrays; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__await", function () { return __await; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__asyncGenerator", function () { return __asyncGenerator; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__asyncDelegator", function () { return __asyncDelegator; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__asyncValues", function () { return __asyncValues; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__makeTemplateObject", function () { return __makeTemplateObject; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__importStar", function () { return __importStar; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__importDefault", function () { return __importDefault; });
            /*! *****************************************************************************
            Copyright (c) Microsoft Corporation. All rights reserved.
            Licensed under the Apache License, Version 2.0 (the "License"); you may not use
            this file except in compliance with the License. You may obtain a copy of the
            License at http://www.apache.org/licenses/LICENSE-2.0
            
            THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
            KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
            WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
            MERCHANTABLITY OR NON-INFRINGEMENT.
            
            See the Apache Version 2.0 License for specific language governing permissions
            and limitations under the License.
            ***************************************************************************** */
            /* global Reflect, Promise */
            var extendStatics = function (d, b) {
                extendStatics = Object.setPrototypeOf ||
                    ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                    function (d, b) { for (var p in b)
                        if (b.hasOwnProperty(p))
                            d[p] = b[p]; };
                return extendStatics(d, b);
            };
            function __extends(d, b) {
                extendStatics(d, b);
                function __() { this.constructor = d; }
                d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
            }
            var __assign = function () {
                __assign = Object.assign || function __assign(t) {
                    for (var s, i = 1, n = arguments.length; i < n; i++) {
                        s = arguments[i];
                        for (var p in s)
                            if (Object.prototype.hasOwnProperty.call(s, p))
                                t[p] = s[p];
                    }
                    return t;
                };
                return __assign.apply(this, arguments);
            };
            function __rest(s, e) {
                var t = {};
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
                        t[p] = s[p];
                if (s != null && typeof Object.getOwnPropertySymbols === "function")
                    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                            t[p[i]] = s[p[i]];
                    }
                return t;
            }
            function __decorate(decorators, target, key, desc) {
                var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
                if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
                    r = Reflect.decorate(decorators, target, key, desc);
                else
                    for (var i = decorators.length - 1; i >= 0; i--)
                        if (d = decorators[i])
                            r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
                return c > 3 && r && Object.defineProperty(target, key, r), r;
            }
            function __param(paramIndex, decorator) {
                return function (target, key) { decorator(target, key, paramIndex); };
            }
            function __metadata(metadataKey, metadataValue) {
                if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
                    return Reflect.metadata(metadataKey, metadataValue);
            }
            function __awaiter(thisArg, _arguments, P, generator) {
                return new (P || (P = Promise))(function (resolve, reject) {
                    function fulfilled(value) { try {
                        step(generator.next(value));
                    }
                    catch (e) {
                        reject(e);
                    } }
                    function rejected(value) { try {
                        step(generator["throw"](value));
                    }
                    catch (e) {
                        reject(e);
                    } }
                    function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
                    step((generator = generator.apply(thisArg, _arguments || [])).next());
                });
            }
            function __generator(thisArg, body) {
                var _ = { label: 0, sent: function () { if (t[0] & 1)
                        throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
                return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
                function verb(n) { return function (v) { return step([n, v]); }; }
                function step(op) {
                    if (f)
                        throw new TypeError("Generator is already executing.");
                    while (_)
                        try {
                            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                                return t;
                            if (y = 0, t)
                                op = [op[0] & 2, t.value];
                            switch (op[0]) {
                                case 0:
                                case 1:
                                    t = op;
                                    break;
                                case 4:
                                    _.label++;
                                    return { value: op[1], done: false };
                                case 5:
                                    _.label++;
                                    y = op[1];
                                    op = [0];
                                    continue;
                                case 7:
                                    op = _.ops.pop();
                                    _.trys.pop();
                                    continue;
                                default:
                                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                                        _ = 0;
                                        continue;
                                    }
                                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                                        _.label = op[1];
                                        break;
                                    }
                                    if (op[0] === 6 && _.label < t[1]) {
                                        _.label = t[1];
                                        t = op;
                                        break;
                                    }
                                    if (t && _.label < t[2]) {
                                        _.label = t[2];
                                        _.ops.push(op);
                                        break;
                                    }
                                    if (t[2])
                                        _.ops.pop();
                                    _.trys.pop();
                                    continue;
                            }
                            op = body.call(thisArg, _);
                        }
                        catch (e) {
                            op = [6, e];
                            y = 0;
                        }
                        finally {
                            f = t = 0;
                        }
                    if (op[0] & 5)
                        throw op[1];
                    return { value: op[0] ? op[1] : void 0, done: true };
                }
            }
            function __exportStar(m, exports) {
                for (var p in m)
                    if (!exports.hasOwnProperty(p))
                        exports[p] = m[p];
            }
            function __values(o) {
                var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
                if (m)
                    return m.call(o);
                return {
                    next: function () {
                        if (o && i >= o.length)
                            o = void 0;
                        return { value: o && o[i++], done: !o };
                    }
                };
            }
            function __read(o, n) {
                var m = typeof Symbol === "function" && o[Symbol.iterator];
                if (!m)
                    return o;
                var i = m.call(o), r, ar = [], e;
                try {
                    while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
                        ar.push(r.value);
                }
                catch (error) {
                    e = { error: error };
                }
                finally {
                    try {
                        if (r && !r.done && (m = i["return"]))
                            m.call(i);
                    }
                    finally {
                        if (e)
                            throw e.error;
                    }
                }
                return ar;
            }
            function __spread() {
                for (var ar = [], i = 0; i < arguments.length; i++)
                    ar = ar.concat(__read(arguments[i]));
                return ar;
            }
            function __spreadArrays() {
                for (var s = 0, i = 0, il = arguments.length; i < il; i++)
                    s += arguments[i].length;
                for (var r = Array(s), k = 0, i = 0; i < il; i++)
                    for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                        r[k] = a[j];
                return r;
            }
            ;
            function __await(v) {
                return this instanceof __await ? (this.v = v, this) : new __await(v);
            }
            function __asyncGenerator(thisArg, _arguments, generator) {
                if (!Symbol.asyncIterator)
                    throw new TypeError("Symbol.asyncIterator is not defined.");
                var g = generator.apply(thisArg, _arguments || []), i, q = [];
                return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
                function verb(n) { if (g[n])
                    i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
                function resume(n, v) { try {
                    step(g[n](v));
                }
                catch (e) {
                    settle(q[0][3], e);
                } }
                function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
                function fulfill(value) { resume("next", value); }
                function reject(value) { resume("throw", value); }
                function settle(f, v) { if (f(v), q.shift(), q.length)
                    resume(q[0][0], q[0][1]); }
            }
            function __asyncDelegator(o) {
                var i, p;
                return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
                function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
            }
            function __asyncValues(o) {
                if (!Symbol.asyncIterator)
                    throw new TypeError("Symbol.asyncIterator is not defined.");
                var m = o[Symbol.asyncIterator], i;
                return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
                function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
                function settle(resolve, reject, d, v) { Promise.resolve(v).then(function (v) { resolve({ value: v, done: d }); }, reject); }
            }
            function __makeTemplateObject(cooked, raw) {
                if (Object.defineProperty) {
                    Object.defineProperty(cooked, "raw", { value: raw });
                }
                else {
                    cooked.raw = raw;
                }
                return cooked;
            }
            ;
            function __importStar(mod) {
                if (mod && mod.__esModule)
                    return mod;
                var result = {};
                if (mod != null)
                    for (var k in mod)
                        if (Object.hasOwnProperty.call(mod, k))
                            result[k] = mod[k];
                result.default = mod;
                return result;
            }
            function __importDefault(mod) {
                return (mod && mod.__esModule) ? mod : { default: mod };
            }
            /***/ 
        }),
        /***/ "./src/app/app-routing.module.ts": 
        /*!***************************************!*\
          !*** ./src/app/app-routing.module.ts ***!
          \***************************************/
        /*! exports provided: AppRoutingModule */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppRoutingModule", function () { return AppRoutingModule; });
            /* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
            /* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm2015/core.js");
            /* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/router */ "./node_modules/@angular/router/fesm2015/router.js");
            /* harmony import */ var _start_start_component__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./start/start.component */ "./src/app/start/start.component.ts");
            /* harmony import */ var _viewer_viewer_component__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./viewer/viewer.component */ "./src/app/viewer/viewer.component.ts");
            /* harmony import */ var _upload_upload_component__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./upload/upload.component */ "./src/app/upload/upload.component.ts");
            /* harmony import */ var _angular_common_http__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @angular/common/http */ "./node_modules/@angular/common/fesm2015/http.js");
            /* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @angular/common */ "./node_modules/@angular/common/fesm2015/common.js");
            var routes = [
                { path: 'view/:fileName/:password', component: _viewer_viewer_component__WEBPACK_IMPORTED_MODULE_4__["ViewerComponent"] },
                { path: 'view/:fileName/:password/:showFirst', component: _viewer_viewer_component__WEBPACK_IMPORTED_MODULE_4__["ViewerComponent"] },
                { path: 'upload', component: _upload_upload_component__WEBPACK_IMPORTED_MODULE_5__["UploadComponent"] },
                { path: '', component: _start_start_component__WEBPACK_IMPORTED_MODULE_3__["StartComponent"] }
            ];
            var AppRoutingModule = /** @class */ (function () {
                function AppRoutingModule() {
                }
                return AppRoutingModule;
            }());
            AppRoutingModule = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([
                Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["NgModule"])({
                    imports: [_angular_router__WEBPACK_IMPORTED_MODULE_2__["RouterModule"].forRoot(routes), _angular_common_http__WEBPACK_IMPORTED_MODULE_6__["HttpClientModule"]],
                    exports: [_angular_router__WEBPACK_IMPORTED_MODULE_2__["RouterModule"]],
                    providers: [{ provide: _angular_common__WEBPACK_IMPORTED_MODULE_7__["LocationStrategy"], useClass: _angular_common__WEBPACK_IMPORTED_MODULE_7__["HashLocationStrategy"] }]
                })
            ], AppRoutingModule);
            /***/ 
        }),
        /***/ "./src/app/app.component.css": 
        /*!***********************************!*\
          !*** ./src/app/app.component.css ***!
          \***********************************/
        /*! exports provided: default */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony default export */ __webpack_exports__["default"] = ("\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJzcmMvYXBwL2FwcC5jb21wb25lbnQuY3NzIn0= */");
            /***/ 
        }),
        /***/ "./src/app/app.component.ts": 
        /*!**********************************!*\
          !*** ./src/app/app.component.ts ***!
          \**********************************/
        /*! exports provided: AppComponent */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppComponent", function () { return AppComponent; });
            /* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
            /* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm2015/core.js");
            var AppComponent = /** @class */ (function () {
                function AppComponent() {
                    this.navbarShow = false;
                    this.title = 'htmlbin';
                    this.filePath = '';
                }
                return AppComponent;
            }());
            AppComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([
                Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
                    selector: 'app-root',
                    template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(/*! raw-loader!./app.component.html */ "./node_modules/raw-loader/dist/cjs.js!./src/app/app.component.html")).default,
                    styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(/*! ./app.component.css */ "./src/app/app.component.css")).default]
                })
            ], AppComponent);
            /***/ 
        }),
        /***/ "./src/app/app.module.ts": 
        /*!*******************************!*\
          !*** ./src/app/app.module.ts ***!
          \*******************************/
        /*! exports provided: AppModule */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppModule", function () { return AppModule; });
            /* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
            /* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/platform-browser */ "./node_modules/@angular/platform-browser/fesm2015/platform-browser.js");
            /* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm2015/core.js");
            /* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm2015/forms.js");
            /* harmony import */ var _app_routing_module__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./app-routing.module */ "./src/app/app-routing.module.ts");
            /* harmony import */ var _app_component__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./app.component */ "./src/app/app.component.ts");
            /* harmony import */ var _start_start_component__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./start/start.component */ "./src/app/start/start.component.ts");
            /* harmony import */ var _viewer_viewer_component__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./viewer/viewer.component */ "./src/app/viewer/viewer.component.ts");
            /* harmony import */ var _upload_upload_component__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./upload/upload.component */ "./src/app/upload/upload.component.ts");
            /* harmony import */ var _encryption_service__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./encryption.service */ "./src/app/encryption.service.ts");
            var AppModule = /** @class */ (function () {
                function AppModule() {
                }
                return AppModule;
            }());
            AppModule = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([
                Object(_angular_core__WEBPACK_IMPORTED_MODULE_2__["NgModule"])({
                    declarations: [
                        _app_component__WEBPACK_IMPORTED_MODULE_5__["AppComponent"],
                        _start_start_component__WEBPACK_IMPORTED_MODULE_6__["StartComponent"],
                        _viewer_viewer_component__WEBPACK_IMPORTED_MODULE_7__["ViewerComponent"],
                        _upload_upload_component__WEBPACK_IMPORTED_MODULE_8__["UploadComponent"],
                        _viewer_viewer_component__WEBPACK_IMPORTED_MODULE_7__["SafeHtmlPipe"]
                    ],
                    imports: [
                        _angular_platform_browser__WEBPACK_IMPORTED_MODULE_1__["BrowserModule"],
                        _app_routing_module__WEBPACK_IMPORTED_MODULE_4__["AppRoutingModule"],
                        _angular_forms__WEBPACK_IMPORTED_MODULE_3__["FormsModule"]
                    ],
                    providers: [_encryption_service__WEBPACK_IMPORTED_MODULE_9__["EncryptionService"]],
                    bootstrap: [_app_component__WEBPACK_IMPORTED_MODULE_5__["AppComponent"]]
                })
            ], AppModule);
            /***/ 
        }),
        /***/ "./src/app/encryption.service.ts": 
        /*!***************************************!*\
          !*** ./src/app/encryption.service.ts ***!
          \***************************************/
        /*! exports provided: EncryptionService */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "EncryptionService", function () { return EncryptionService; });
            /* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
            /* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm2015/core.js");
            /* harmony import */ var asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! asmcrypto.js */ "./node_modules/asmcrypto.js/asmcrypto.all.es8.js");
            var EncryptionService = /** @class */ (function () {
                function EncryptionService() {
                }
                EncryptionService.prototype.encrypt = function (cleartextString, passphrase) {
                    cleartextString = encodeURIComponent(cleartextString);
                    var cleartext = new Uint8Array(Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["string_to_bytes"])(cleartextString));
                    var salt = crypto.getRandomValues(new Uint8Array(16));
                    var key = Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["Pbkdf2HmacSha256"])(new Uint8Array(Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["string_to_bytes"])(passphrase)), salt, 10000, 32);
                    var nonce = crypto.getRandomValues(new Uint8Array(16));
                    var ciphertext = asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["AES_GCM"].encrypt(cleartext, key, nonce);
                    var encrypted = JSON.stringify({
                        'salt': Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["bytes_to_string"])(salt),
                        'nonce': Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["bytes_to_string"])(nonce),
                        'ciphertext': Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["bytes_to_string"])(ciphertext)
                    });
                    return this.toBase64(encrypted);
                };
                EncryptionService.prototype.decrypt = function (ciphertext, passphrase) {
                    var cipherObj = JSON.parse(this.fromBase64(ciphertext));
                    var salt = new Uint8Array(Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["string_to_bytes"])(cipherObj.salt));
                    var nonce = new Uint8Array(Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["string_to_bytes"])(cipherObj.nonce));
                    var encrypted = new Uint8Array(Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["string_to_bytes"])(cipherObj.ciphertext));
                    var key = Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["Pbkdf2HmacSha256"])(new Uint8Array(Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["string_to_bytes"])(passphrase)), salt, 10000, 32);
                    var cleartext = asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["AES_GCM"].decrypt(encrypted, key, nonce);
                    return decodeURIComponent(Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["bytes_to_string"])(cleartext));
                };
                EncryptionService.prototype.toServerFileName = function (fileName) {
                    var hash = new asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["Sha1"]();
                    hash.process(Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["string_to_bytes"])(fileName));
                    hash.finish();
                    return 'fl' + this.toBase64(hash.result);
                };
                EncryptionService.prototype.generateFileName = function () {
                    return Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["bytes_to_hex"])(crypto.getRandomValues(new Uint8Array(8)));
                };
                EncryptionService.prototype.generatePassword = function () {
                    var b64 = Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["bytes_to_base64"])(crypto.getRandomValues(new Uint8Array(32)));
                    b64 = b64.replace(/\//g, '-');
                    b64 = b64.replace(/\=/g, '-');
                    b64 = b64.replace(/\+/g, '-');
                    return encodeURIComponent(b64);
                };
                EncryptionService.prototype.toBase64 = function (utf8string) {
                    var b64 = Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["bytes_to_base64"])(typeof utf8string === 'string' ? Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["string_to_bytes"])(utf8string) : utf8string);
                    b64 = b64.replace(/\//g, '-');
                    b64 = b64.replace(/\=/g, '_');
                    return encodeURIComponent(b64);
                };
                EncryptionService.prototype.fromBase64 = function (base64string) {
                    base64string = decodeURIComponent(base64string);
                    base64string = base64string.replace(/\-/g, '/');
                    base64string = base64string.replace(/\_/g, '=');
                    return Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["bytes_to_string"])(Object(asmcrypto_js__WEBPACK_IMPORTED_MODULE_2__["base64_to_bytes"])(base64string));
                };
                return EncryptionService;
            }());
            EncryptionService = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([
                Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Injectable"])({
                    providedIn: 'root'
                })
            ], EncryptionService);
            /***/ 
        }),
        /***/ "./src/app/start/start.component.css": 
        /*!*******************************************!*\
          !*** ./src/app/start/start.component.css ***!
          \*******************************************/
        /*! exports provided: default */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony default export */ __webpack_exports__["default"] = ("\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJzcmMvYXBwL3N0YXJ0L3N0YXJ0LmNvbXBvbmVudC5jc3MifQ== */");
            /***/ 
        }),
        /***/ "./src/app/start/start.component.ts": 
        /*!******************************************!*\
          !*** ./src/app/start/start.component.ts ***!
          \******************************************/
        /*! exports provided: StartComponent */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "StartComponent", function () { return StartComponent; });
            /* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
            /* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm2015/core.js");
            var StartComponent = /** @class */ (function () {
                function StartComponent() {
                }
                StartComponent.prototype.ngOnInit = function () {
                };
                return StartComponent;
            }());
            StartComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([
                Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
                    selector: 'app-start',
                    template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(/*! raw-loader!./start.component.html */ "./node_modules/raw-loader/dist/cjs.js!./src/app/start/start.component.html")).default,
                    styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(/*! ./start.component.css */ "./src/app/start/start.component.css")).default]
                })
            ], StartComponent);
            /***/ 
        }),
        /***/ "./src/app/upload/upload.component.css": 
        /*!*********************************************!*\
          !*** ./src/app/upload/upload.component.css ***!
          \*********************************************/
        /*! exports provided: default */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony default export */ __webpack_exports__["default"] = ("\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJzcmMvYXBwL3VwbG9hZC91cGxvYWQuY29tcG9uZW50LmNzcyJ9 */");
            /***/ 
        }),
        /***/ "./src/app/upload/upload.component.ts": 
        /*!********************************************!*\
          !*** ./src/app/upload/upload.component.ts ***!
          \********************************************/
        /*! exports provided: UploadComponent */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "UploadComponent", function () { return UploadComponent; });
            /* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
            /* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm2015/core.js");
            /* harmony import */ var _encryption_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../encryption.service */ "./src/app/encryption.service.ts");
            /* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/platform-browser */ "./node_modules/@angular/platform-browser/fesm2015/platform-browser.js");
            var UploadComponent = /** @class */ (function () {
                function UploadComponent(encryptionService, sanitizer) {
                    this.encryptionService = encryptionService;
                    this.sanitizer = sanitizer;
                    this.showFileDropdown = false;
                    this.contentType = 'text';
                    this.contentTypeName = 'Text';
                    this.contentText = '';
                    //fileKey: string = '';
                    //fullFileKey: string = '';
                    this.encryptionPassword = '';
                    this.fileName = '';
                    this.serverFileName = '';
                    this.encryptedContent = '';
                    this.isDownload = false;
                    this.dataURI = null;
                    this.applicationOrigin = '';
                    this.errorMessage = null;
                }
                UploadComponent.prototype.ngOnInit = function () { };
                UploadComponent.prototype.onFileDropdownSelect = function (contentType, contentTypeName) {
                    if (contentType === void 0) { contentType = 'text'; }
                    if (contentTypeName === void 0) { contentTypeName = 'Text'; }
                    this.showFileDropdown = false;
                    if (contentType === 'document' || contentType === 'html' || contentType === 'text') {
                        this.contentType = contentType;
                        this.contentTypeName = contentTypeName;
                    }
                    else {
                        this.contentType = 'text';
                        this.contentTypeName = 'Text';
                    }
                };
                UploadComponent.prototype.onEncrypt = function () {
                    try {
                        this.errorMessage = null;
                        var randomPrefix = ('000' + Math.round(Math.random() * 10000)).slice(-4);
                        this.encryptionPassword = this.encryptionPassword && this.encryptionPassword.length > 12 ? this.encryptionPassword : this.encryptionService.generatePassword();
                        this.fileName = this.fileName && this.fileName.length ? this.fileName : this.encryptionService.generateFileName();
                        this.serverFileName = this.encryptionService.toServerFileName(this.fileName);
                        this.encryptedContent = '{ "type": "' + this.contentType + '", "data": "' + this.encryptionService.encrypt(this.contentText, this.encryptionPassword) + '" }';
                        this.dataURI = this.sanitizer.bypassSecurityTrustResourceUrl('data:text/plain;charset=utf-8,' + encodeURIComponent(this.encryptedContent));
                        this.applicationOrigin = window.location.origin;
                        this.isDownload = true;
                    }
                    catch (e) {
                        console.log(e);
                        this.errorMessage = 'There was an error during encryption. Please make sure you are using a modern browser like Google Chrome, Firefox or Chromium.';
                    }
                };
                return UploadComponent;
            }());
            UploadComponent.ctorParameters = function () { return [
                { type: _encryption_service__WEBPACK_IMPORTED_MODULE_2__["EncryptionService"] },
                { type: _angular_platform_browser__WEBPACK_IMPORTED_MODULE_3__["DomSanitizer"] }
            ]; };
            UploadComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([
                Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
                    selector: 'app-upload',
                    template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(/*! raw-loader!./upload.component.html */ "./node_modules/raw-loader/dist/cjs.js!./src/app/upload/upload.component.html")).default,
                    styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(/*! ./upload.component.css */ "./src/app/upload/upload.component.css")).default]
                })
            ], UploadComponent);
            /***/ 
        }),
        /***/ "./src/app/viewer/viewer.component.css": 
        /*!*********************************************!*\
          !*** ./src/app/viewer/viewer.component.css ***!
          \*********************************************/
        /*! exports provided: default */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony default export */ __webpack_exports__["default"] = (".showDocument {\n  position: fixed;\n  width: 100vw;\n  min-height: 100vh;\n  top: 0;\n  bottom: 0;\n  z-index: 9999;\n  opacity: 1;\n  left: 0;\n  right: 0;\n  background: black;\n  padding: 1rem;\n  overflow: auto;\n}\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvdmlld2VyL3ZpZXdlci5jb21wb25lbnQuY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0VBQ0UsZUFBZTtFQUNmLFlBQVk7RUFDWixpQkFBaUI7RUFDakIsTUFBTTtFQUNOLFNBQVM7RUFDVCxhQUFhO0VBQ2IsVUFBVTtFQUNWLE9BQU87RUFDUCxRQUFRO0VBQ1IsaUJBQWlCO0VBQ2pCLGFBQWE7RUFDYixjQUFjO0FBQ2hCIiwiZmlsZSI6InNyYy9hcHAvdmlld2VyL3ZpZXdlci5jb21wb25lbnQuY3NzIiwic291cmNlc0NvbnRlbnQiOlsiLnNob3dEb2N1bWVudCB7XG4gIHBvc2l0aW9uOiBmaXhlZDtcbiAgd2lkdGg6IDEwMHZ3O1xuICBtaW4taGVpZ2h0OiAxMDB2aDtcbiAgdG9wOiAwO1xuICBib3R0b206IDA7XG4gIHotaW5kZXg6IDk5OTk7XG4gIG9wYWNpdHk6IDE7XG4gIGxlZnQ6IDA7XG4gIHJpZ2h0OiAwO1xuICBiYWNrZ3JvdW5kOiBibGFjaztcbiAgcGFkZGluZzogMXJlbTtcbiAgb3ZlcmZsb3c6IGF1dG87XG59XG4iXX0= */");
            /***/ 
        }),
        /***/ "./src/app/viewer/viewer.component.ts": 
        /*!********************************************!*\
          !*** ./src/app/viewer/viewer.component.ts ***!
          \********************************************/
        /*! exports provided: SafeHtmlPipe, ViewerComponent */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SafeHtmlPipe", function () { return SafeHtmlPipe; });
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ViewerComponent", function () { return ViewerComponent; });
            /* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
            /* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm2015/core.js");
            /* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/router */ "./node_modules/@angular/router/fesm2015/router.js");
            /* harmony import */ var _encryption_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../encryption.service */ "./src/app/encryption.service.ts");
            /* harmony import */ var _angular_common_http__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @angular/common/http */ "./node_modules/@angular/common/fesm2015/http.js");
            /* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @angular/platform-browser */ "./node_modules/@angular/platform-browser/fesm2015/platform-browser.js");
            var SafeHtmlPipe = /** @class */ (function () {
                function SafeHtmlPipe(sanitized) {
                    this.sanitized = sanitized;
                }
                SafeHtmlPipe.prototype.transform = function (value) {
                    return this.sanitized.bypassSecurityTrustHtml(value);
                };
                return SafeHtmlPipe;
            }());
            SafeHtmlPipe.ctorParameters = function () { return [
                { type: _angular_platform_browser__WEBPACK_IMPORTED_MODULE_5__["DomSanitizer"] }
            ]; };
            SafeHtmlPipe = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([
                Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Pipe"])({ name: 'safeHtml' })
            ], SafeHtmlPipe);
            var ViewerComponent = /** @class */ (function () {
                function ViewerComponent(http, route, router, sanitizer, encryptionService) {
                    this.http = http;
                    this.route = route;
                    this.router = router;
                    this.sanitizer = sanitizer;
                    this.encryptionService = encryptionService;
                    this.fileName = '';
                    this.serverFileName = '';
                    this.password = '';
                    this.decryptedText = '';
                    this.fileType = '';
                    this.documentHTML = null;
                    this.errorMessage = null;
                    this.isLoading = true;
                    this.siteUrl = '';
                    this.showFirst = '';
                    this.router.routeReuseStrategy.shouldReuseRoute = function () { return false; };
                }
                ViewerComponent.prototype.ngOnDestroy = function () { };
                ViewerComponent.prototype.ngOnInit = function () {
                    var _this = this;
                    this.siteUrl = window.location.origin + '/';
                    this.errorMessage = null;
                    this.route.paramMap.subscribe(function (params) {
                        var paramfileName = params.get('fileName') && params.get('fileName').length ? params.get('fileName').trim() : '';
                        var parampassword = params.get('password') && params.get('password').length ? params.get('password').trim() : '';
                        var paramshowFirst = params.get('showFirst') && params.get('showFirst').length ? '.showDocument #' + params.get('showFirst').trim() : '.showDocument h1';
                        if (paramfileName === _this.fileName && parampassword === _this.password && _this.decryptedText && _this.decryptedText.length > 0) {
                            _this.showFirst = paramshowFirst;
                            window['showNewAnchor'](_this.showFirst);
                            return;
                        }
                        _this.fileName = paramfileName;
                        _this.password = parampassword;
                        _this.showFirst = paramshowFirst;
                        if (!_this.fileName || _this.fileName.length <= 0 || !_this.password || _this.password.length <= 0) {
                            _this.errorMessage = 'Sorry, something went wrong here! Possible reason: broken link.';
                        }
                        else {
                            _this.http.get(_this.siteUrl + 'uploads/' + _this.encryptionService.toServerFileName(_this.fileName) + '.json?nocache=' + (new Date().getTime())).subscribe(function (answer) {
                                if (answer && answer.type && answer.data) {
                                    try {
                                        _this.decryptedText = _this.encryptionService.decrypt(answer.data, _this.password);
                                        if (answer.type === 'html' || answer.type === 'document') {
                                            _this.documentHTML = _this.decryptedText;
                                        }
                                        _this.isLoading = false;
                                        _this.fileType = answer.type;
                                        var showFirst_1 = _this.showFirst;
                                        setTimeout(function () {
                                            if (typeof window['addDocumentTOC'] === 'function') {
                                                window['addDocumentTOC'](showFirst_1);
                                            }
                                        }, 100);
                                    }
                                    catch (e) {
                                        _this.isLoading = false;
                                        _this.errorMessage = 'Sorry, something went wrong here! Possible reason: broken link.';
                                    }
                                }
                                else {
                                    _this.isLoading = false;
                                    _this.errorMessage = 'Sorry, something went wrong here! Possible reason: broken link or missing file.';
                                }
                            }, function (error) {
                                _this.isLoading = false;
                                _this.errorMessage = 'Sorry, something went wrong here! Possible reason: broken link or missing file.';
                            });
                        }
                    });
                };
                return ViewerComponent;
            }());
            ViewerComponent.ctorParameters = function () { return [
                { type: _angular_common_http__WEBPACK_IMPORTED_MODULE_4__["HttpClient"] },
                { type: _angular_router__WEBPACK_IMPORTED_MODULE_2__["ActivatedRoute"] },
                { type: _angular_router__WEBPACK_IMPORTED_MODULE_2__["Router"] },
                { type: _angular_platform_browser__WEBPACK_IMPORTED_MODULE_5__["DomSanitizer"] },
                { type: _encryption_service__WEBPACK_IMPORTED_MODULE_3__["EncryptionService"] }
            ]; };
            ViewerComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([
                Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
                    selector: 'app-viewer',
                    template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(/*! raw-loader!./viewer.component.html */ "./node_modules/raw-loader/dist/cjs.js!./src/app/viewer/viewer.component.html")).default,
                    styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(/*! ./viewer.component.css */ "./src/app/viewer/viewer.component.css")).default]
                })
            ], ViewerComponent);
            /***/ 
        }),
        /***/ "./src/environments/environment.ts": 
        /*!*****************************************!*\
          !*** ./src/environments/environment.ts ***!
          \*****************************************/
        /*! exports provided: environment */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "environment", function () { return environment; });
            /* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
            // This file can be replaced during build by using the `fileReplacements` array.
            // `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
            // The list of file replacements can be found in `angular.json`.
            var environment = {
                production: false
            };
            /*
             * For easier debugging in development mode, you can import the following file
             * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
             *
             * This import should be commented out in production mode because it will have a negative impact
             * on performance if an error is thrown.
             */
            // import 'zone.js/dist/zone-error';  // Included with Angular CLI.
            /***/ 
        }),
        /***/ "./src/main.ts": 
        /*!*********************!*\
          !*** ./src/main.ts ***!
          \*********************/
        /*! no exports provided */
        /***/ (function (module, __webpack_exports__, __webpack_require__) {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
            /* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm2015/core.js");
            /* harmony import */ var _angular_platform_browser_dynamic__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/platform-browser-dynamic */ "./node_modules/@angular/platform-browser-dynamic/fesm2015/platform-browser-dynamic.js");
            /* harmony import */ var _app_app_module__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/app.module */ "./src/app/app.module.ts");
            /* harmony import */ var _environments_environment__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./environments/environment */ "./src/environments/environment.ts");
            if (_environments_environment__WEBPACK_IMPORTED_MODULE_4__["environment"].production) {
                Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["enableProdMode"])();
            }
            Object(_angular_platform_browser_dynamic__WEBPACK_IMPORTED_MODULE_2__["platformBrowserDynamic"])().bootstrapModule(_app_app_module__WEBPACK_IMPORTED_MODULE_3__["AppModule"])
                .catch(function (err) { return console.error(err); });
            /***/ 
        }),
        /***/ 0: 
        /*!***************************!*\
          !*** multi ./src/main.ts ***!
          \***************************/
        /*! no static exports found */
        /***/ (function (module, exports, __webpack_require__) {
            module.exports = __webpack_require__(/*! /home/user/data2/Projekte/Dev/mealybug-gh/mealybug-gh/src/main.ts */ "./src/main.ts");
            /***/ 
        }),
        /***/ 1: 
        /*!************************!*\
          !*** crypto (ignored) ***!
          \************************/
        /*! no static exports found */
        /***/ (function (module, exports) {
            /* (ignored) */
            /***/ 
        })
    }, [[0, "runtime", "vendor"]]]);
//# sourceMappingURL=main-es2015.js.map
//# sourceMappingURL=main-es5.js.map
//# sourceMappingURL=main-es5.js.map