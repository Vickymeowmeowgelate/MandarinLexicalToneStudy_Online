var jsPsychPipe=function(i){"use strict";var y="0.5.0",o=(h,t,e)=>new Promise((r,a)=>{var n=s=>{try{d(e.next(s))}catch(p){a(p)}},f=s=>{try{d(e.throw(s))}catch(p){a(p)}},d=s=>s.done?r(s.value):Promise.resolve(s.value).then(n,f);d((e=e.apply(h,t)).next())});const u={name:"pipe",version:y,parameters:{experiment_id:{type:i.ParameterType.STRING,default:void 0},action:{type:i.ParameterType.STRING,default:void 0},filename:{type:i.ParameterType.STRING,default:null},data_string:{type:i.ParameterType.STRING,default:null},wait_message:{type:i.ParameterType.HTML_STRING,default:"<p>Saving data. Please do not close this page.</p>"}},data:{result:{type:i.ParameterType.OBJECT,default:null},success:{type:i.ParameterType.BOOL,default:null}}},c=class l{constructor(t){this.jsPsych=t}trial(t,e){this.run(t,e)}run(t,e){return o(this,null,function*(){const r=`
    <style>
      .spinner {
        animation: rotate 2s linear infinite;
        width: 50px;
        height: 50px;
      }
        
      .spinner .path {
        stroke: rgb(25,25,25);
        stroke-linecap: round;
        animation: dash 1.5s ease-in-out infinite;
      }

      @keyframes rotate {
        100% {
          transform: rotate(360deg);
        }
      }
      
      @keyframes dash {
        0% {
          stroke-dasharray: 1, 150;
          stroke-dashoffset: 0;
        }
        50% {
          stroke-dasharray: 90, 150;
          stroke-dashoffset: -35;
        }
        100% {
          stroke-dasharray: 90, 150;
          stroke-dashoffset: -124;
        }
      }
    </style>
      ${e.wait_message}
      <svg class="spinner" viewBox="0 0 50 50">
        <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
      </svg>`;t.innerHTML=r;let a;e.action==="save"&&(a=yield l.saveData(e.experiment_id,e.filename,e.data_string)),e.action==="saveBase64"&&(a=yield l.saveBase64Data(e.experiment_id,e.filename,e.data_string)),e.action==="condition"&&(a=yield l.getCondition(e.experiment_id));var n={result:a,success:!a.error};this.jsPsych.finishTrial(n)})}static saveData(t,e,r){return o(this,null,function*(){if(!t||!e||!r)throw new Error("Missing required parameter(s).");let a;try{a=yield fetch("https://pipe.jspsych.org/api/data/",{method:"POST",headers:{"Content-Type":"application/json",Accept:"*/*"},body:JSON.stringify({experimentID:t,filename:e,data:r})})}catch(n){return n}return yield a.json()})}static saveBase64Data(t,e,r){return o(this,null,function*(){if(!t||!e||!r)throw new Error("Missing required parameter(s).");let a;try{a=yield fetch("https://pipe.jspsych.org/api/base64/",{method:"POST",headers:{"Content-Type":"application/json",Accept:"*/*"},body:JSON.stringify({experimentID:t,filename:e,data:r})})}catch(n){return n}return yield a.json()})}static getCondition(t){return o(this,null,function*(){if(!t)throw new Error("Missing required parameter(s).");let e;try{e=yield fetch("https://pipe.jspsych.org/api/condition/",{method:"POST",headers:{"Content-Type":"application/json",Accept:"*/*"},body:JSON.stringify({experimentID:t})})}catch(r){return r}return(yield e.json()).condition})}};return c.info=u,c}(jsPsychModule);
//# sourceMappingURL=https://unpkg.com/@jspsych-contrib/plugin-pipe@0.5.0/dist/index.browser.min.js.map
