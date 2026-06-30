(globalThis.webpackChunkextract_css=globalThis.webpackChunkextract_css||[]).push([["73940"],{471831:(function(b){function x(p){return p===null}b.exports=x}),176944:(function(b){function x(p){return p===void 0}b.exports=x}),134521:(function(b,x,p){var y=p(210750),g=p(58980),w="Expected a function";function S(M,N,d){var E=!0,O=!0;if(typeof M!="function")throw new TypeError(w);return g(d)&&(E="leading"in d?!!d.leading:E,O="trailing"in d?!!d.trailing:O),y(M,N,{leading:E,maxWait:N,trailing:O})}b.exports=S}),731638:(function(b,x,p){"use strict";p.d(x,{A9:()=>_,VI:()=>X});function y(n){const t=parseFloat(n);return typeof t=="number"&&!Number.isNaN(t)}function g(n,t,e){return Math.min(Math.max(n,t),e)}function w(n,t,e){return t+(e-t)*n}function S(n,t){return Math.round(n*10**t)/10**t}function M(n){const t=parseFloat(n);return n.toString().replace(t.toString(),"")}function N(n,t,e=3){const r=t.length-1,i=[];let o=0,s=0,a=n.length;for(;s<a;s++){o=n[s];const l=g(Math.floor(o*r),0,r-1),u=t[l],c=t[l+1],f=(o-l/r)*r;i.push(S(w(f,u,c),e))}return i}function d(n,t){const e=t.length-1,r=[];let i=0,o=0,s=n.length;for(;o<s;o++){i=g(n[o],0,1);const a=Math.round(i*e);r.push(t[a])}return r}const E=null;function O(n,t,e=3){let r="";return y(t[0])&&(r=M(t[0])),N(n,t.map(i=>typeof i=="number"?i:parseFloat(i)),e).map(i=>i+r)}function U(n,t,e=3){let r=!0,i=!0,o=0,s;const a=t.length;for(;o<a;o++)s=t[o],r&&(r=typeof s=="number"),i&&(i=y(s));return r?N(n,t,e):i?O(n,t,e):d(n,t)}function rt(n,t={},e=U){const r=j(t),[i,o]=_(r);return[e?.(i,n,r.decimal),o]}function it(n){return(t,e,r)=>t.map(i=>n(i,e,r))}/*!
 * Based off of https://github.com/jakearchibald/linear-easing-generator
 * 
 * Changes:
 * - Added comments and docs top explain logic
 * - Switched to iterative approach for the `ramerDouglasPeucker` algorithim
 * - Renamed functions, parameters and variables to improve readability and to better match a library usecase 
 * 
 * Copyright 2023 Jake Archibald [@jakearchibald](https://github.com/jakearchibald)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $(n,t,e){let[r,i]=t,o=e[0]-r,s=e[1]-i;if(o!==0||s!==0){let a=((n[0]-r)*o+(n[1]-i)*s)/(o*o+s*s);a>1?(r=e[0],i=e[1]):a>0&&(r+=o*a,i+=s*a)}return o=n[0]-r,s=n[1]-i,o*o+s*s}function R(n,t){const e=t*t;if(n.length<3)return n;let r=[n[0]],i=[[0,n.length-1]];for(;i.length>0;){let[o,s]=i.pop(),a=0,l=0;for(let u=o+1;u<s;u++){const c=$(n[u],n[o],n[s]);c>a&&(l=u,a=c)}a>e?(i.push([o,l]),i.push([l,s])):r.push(n[s])}return r.sort((o,s)=>o[0]-s[0])}function z(n,t,e){if(!n)return null;const r=Math.max(e,2);return R(n,t).map(([i,o])=>[S(i,r),S(o,e)])}/*!
 * Based off of https://github.com/jakearchibald/linear-easing-generator
 * 
 * Changes:
 * - Added comments and docs top explain logic
 * - Switched to iterative approach for the `ramerDouglasPeucker` algorithim
 * - Renamed functions, parameters and variables to improve readability and to better match a library usecase 
 * 
 * Copyright 2023 Jake Archibald [@jakearchibald](https://github.com/jakearchibald)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function W(n,t){if(!n)return[];const e=new Intl.NumberFormat("en-US",{maximumFractionDigits:Math.max(t-2,0)}),r=new Intl.NumberFormat("en-US",{maximumFractionDigits:t}),i=n,o=new Set,s=1/10**t;for(const[u,c]of i.entries()){const[f]=c;if(u===0){f===0&&o.add(c);continue}if(u===i.length-1){const D=i[u-1][0];f===1&&D<=1&&o.add(c);continue}const F=i[u-1][0],V=(i[u+1][0]-F)/2+F;Math.abs(f-V)<s&&o.add(c)}const a=[[i[0]]];for(const u of i.slice(1))u[1]===a.at(-1)[0][1]?a.at(-1).push(u):a.push([u]);return a.map(u=>{const c=r.format(u[0][1]),f=u.map(I=>{const[D]=I;let A=c;return o.has(I)||(A+=" "+e.format(D*100)+"%"),A}).join(", ");if(u.length===1)return f;const L=[u[0][0],u.at(-1)[0]].map(I=>e.format(I*100)+"%").join(" "),V=`${c} ${L}`;return V.length>f.length?f:V})}function X(n={}){const t=j(n),[e,r]=_(t),i=g(t.quality??.85,0,1),o=w(1-i,0,.025),s=e.length,a=e.map((u,c)=>[c/(s-1),u]),l=z(a,o,t.decimal);return[W(l,t.decimal).join(", "),r]}/*!
 * Spring solver inspired by Webkit Copyright © 2016 Apple Inc. All rights reserved. https://webkit.org/demos/spring/spring.js
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. AND ITS CONTRIBUTORS ``AS IS''
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL APPLE INC. OR ITS CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
*/const m=(n,[t=1,e=100,r=10,i=0]=[],o)=>{t=g(t,1e-4,1e3),e=g(e,1e-4,1e3),r=g(r,1e-4,1e3),i=g(i,1e-4,1e3);const s=Math.sqrt(e/t),a=r/(2*Math.sqrt(e*t)),l=a<1?s*Math.sqrt(1-a*a):0,u=a<1?(a*s+-i)/l:-i+s;let c=o?o*n/1e3:n;return a<1?c=Math.exp(-c*a*s)*(Math.cos(l*c)+u*Math.sin(l*c)):c=(1+u*c)*Math.exp(-c*s),1-c},q=new Map,P=1e5;function B([n,t,e,r]=[]){let i=[n,t,e,r],o=`${i}`;if(q.has(o))return q.get(o);const s=1/6;let a=0,l=0;for(;++l<P;){if(Math.abs(1-m(a,i))<.001){let c=a,f=1;for(;++l<P&&(a+=s,!(Math.abs(1-m(a,i))>=.001));)if(f++,f===16){const F=c*1e3;return q.set(o,[F,l]),[F,l]}}a+=s}const u=a*1e3;return q.set(o,[u,l]),[u,l]}function G(n){return(t,e=[],r)=>1-n(1-t,e,r)}function K(n){return function(t,e=[],r){return t<.5?n(t*2,e,r)/2:1-n(t*-2+2,e,r)/2}}function H(n){return function(t,e=[],r){return t<.5?(1-n(1-t*2,e,r))/2:(n(t*2-1,e,r)+1)/2}}const J=m,Q=G(m),Y=K(m),Z=H(m);function C(n,t,e=3){const r=t.length-1,i=g(Math.floor(n*r),0,r-1),o=t[i],s=t[i+1],a=(n-i/r)*r;return S(w(a,o,s),e)}function v(n,t){const e=t.length-1;n=g(n,0,1);const r=Math.round(n*e);return t[r]}const ot=null;function tt(n,t,e=3){let r="";return y(t[0])&&(r=M(t[0])),C(n,t.map(i=>typeof i=="number"?i:parseFloat(i)),e)+r}function nt(n,t,e=3){return t.every(o=>typeof o=="number")?C(n,t,e):t.every(o=>y(o))?tt(n,t,e):v(n,t)}let h={spring:m,"spring-in":J,"spring-out":Q,"spring-in-out":Y,"spring-out-in":Z},T=Object.keys(h);function st(n,t){h={...h,[n]:t},T=Object.keys(h)}function at(n){h={...h,...n},T=Object.keys(h)}function et(n){const t=/(\(|\s)([^)]+)\)?/.exec(n.toString());return t?t[2].split(",").map(e=>{let r=parseFloat(e);return Number.isNaN(r)?e.trim():r}):[]}function j(n={}){const t=typeof n=="string"||Array.isArray(n)&&typeof n[0]=="function";let{easing:e=[m,1,100,10,0],numPoints:r=38,decimal:i=3,...o}=t?{easing:n}:n;if(typeof e=="string"){const s=h[e.replace(/(\(|\s).+/,"").toLowerCase().trim()],a=et(e);e=[s,...a]}return{easing:e,numPoints:r,decimal:i,...o}}const k=new Map;function _(n={}){let{easing:t,numPoints:e}=j(n);if(Array.isArray(t)){if(typeof t[0]!="function")throw new Error("[spring-easing] A frame function is required as the first element in the easing array, e.g. [SpringFrame, ...]")}else throw new Error(`[spring-easing] The easing needs to be in the format:  
* "spring-out(mass, stiffness, damping, velocity)" or 
* [SpringOutFrame, mass, stiffness, damping, velocity], the easing recieved is "${t}", [spring-easing] doesn't really know what to do with that.`);let[r,...i]=t;const[o,s=38]=B(i);e||(e=s);const a=`${i},${e}`;if(k.has(a)){let c=k.get(a);if(c.has(r))return c.get(r)}const l=[];for(let c=0;c<e;c++)l[c]=r(c/(e-1),i,o);const u=k.has(a)?k.get(a):new WeakMap;return u.set(r,[l,o]),k.set(a,u),[l,o]}function ut(n,t={},e=nt){const r=j(t),[i,o]=_(r);return[i.map(s=>e(s,n,r.decimal)),o]}})}]);

//# sourceMappingURL=https://sourcemaps.squarespace.net/universal/scripts-compressed/sourcemaps/5f25071c3d1dda9e/73940-a2653f6e6a6b86a9-min.en-US.js.map