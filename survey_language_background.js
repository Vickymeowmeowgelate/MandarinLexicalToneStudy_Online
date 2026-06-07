/* =============================================================================
   LANGUAGE-BACKGROUND SURVEY  (LEAP-Q adaptation, tone-background classification)
   Stack: jsPsych v7 + @jspsych/plugin-survey (SurveyJS).  Simplified Chinese only.

   Exposes pushLanguageBackgroundSurvey(timeline).

   - Matrices (proficiency / acquisition / exposure): 0-5.
   - Single ratings (accent / infer-nonnative / transliteration): 0-10.
   - Numeric fields are plain TEXT inputs + numeric validator, so the two error
     states are distinct: blank -> 此项为必填项 ; non-number -> 请输入数字.
   - env_time: each 月 in 0-12; for EACH environment row, 年 + 月/12 cannot
     exceed the participant's age (rows may overlap in time, so NOT summed).
   - Ranking uses select-to-rank (deliberate placement, no silent default) and
     is hidden when only one dialect is selected.
   - All required except the final "any issues?" item.
   - Survey progress bar OFF (jsPsych experiment-wide bar takes over).
   ========================================================================== */

const SCALE_MIN = 0;     // matrices
const SCALE_MAX = 5;
const RATE_MAX  = 10;    // single rating questions

function ratingColumns() {
  const cols = [];
  for (let v = SCALE_MIN; v <= SCALE_MAX; v++) cols.push({ value: v, text: String(v) });
  return cols;
}

const ENV_ITEMS = [
  ["env_friends",   "与朋友面对面交流"],
  ["env_family",    "与家人面对面交流"],
  ["env_voice",     "线上语音交流"],
  ["env_short",     "刷短视频"],
  ["env_podcast",   "听播客/有声书"],
  ["env_tv",        "看电影/电视节目"],
  ["env_workschool","工作/学习中使用"],
];
const envRows = () => ENV_ITEMS.map(([v, t]) => ({ value: v, text: t }));

const REQ = { isRequired: true, requiredErrorText: "此项为必填项" };
const NUMERIC = [{ type: "numeric", text: "请输入数字" }];   // text-in-number-field flag

/* =============================================================================
   1. Build the SurveyJS model.
   ========================================================================== */
function buildSurveyJson(dmap) {

  const groupNames = Object.keys(dmap.groups);
  const q1Choices = groupNames.map(g => ({ value: g, text: g }));

  const otherTextQs = [];
  groupNames.forEach(g => dmap.groups[g].forEach(s => {
    if (s.is_other) {
      otherTextQs.push(Object.assign({
        type: "text",
        name: "other_" + s.code,
        visibleIf: "{q2_subgroups} contains '" + s.code + "'",
        title: "您在「" + g + "」选择了「以上都不是」：请填写该方言名称或您学话的县/市",
        placeholder: "如：太原小店话",
      }, REQ));
    }
  }));

  return {
    showQuestionNumbers: "off",
    showProgressBar: "off",
    locale: "zh-cn",
    pagePrevText: "上一页",
    pageNextText: "下一页",
    completeText: "完成",

    pages: [
      /* ---- demographics --------------------------------------------------- */
      { name: "p_demo", elements: [
        Object.assign({ type: "text", name: "age",
          validators: [{ type: "numeric", text: "请输入数字", minValue: 0, maxValue: 120 }],
          title: "请填写您的年龄" }, REQ),
        Object.assign({ type: "radiogroup", name: "gender", title: "请选择您的性别",
          choices: [
            { value: "male",   text: "男性" },
            { value: "female", text: "女性" },
            { value: "nonbin", text: "非二元性别" },
            { value: "other",  text: "其他" },
            { value: "nodisc", text: "不便透露" },
          ]}, REQ),
        Object.assign({ type: "radiogroup", name: "education",
          title: "请选择您的最高学历（或在其他国家获得的学位的美国等效学历）",
          choices: [
            { value: "midsch",   text: "初中及以下" },
            { value: "highsch",  text: "高中/职业学校" },
            { value: "someuni",  text: "部分大学课程" },
            { value: "bachelor", text: "大学本科学位" },
            { value: "gradedu",  text: "研究生教育" },
            { value: "masters",  text: "硕士研究生学位" },
            { value: "phdstu",   text: "博士研究生在读" },
            { value: "phd",      text: "博士学位" },
          ]}, REQ),
      ]},

      /* ---- dialect selection ---------------------------------------------- */
      { name: "p_dialect", elements: [
        Object.assign({ type: "checkbox", name: "q1_groups",
          title: "请选择您使用（包括听得懂但不会说，优先选会听会说的）或所学的所有汉语方言大类",
          choices: q1Choices }, REQ),
        Object.assign({ type: "checkbox", name: "q2_subgroups", maxSelectedChoices: 5,
          title: "请选择您使用或所学的方言细分（最多五个；只显示您上面选中大类下的选项）",
          choices: [], visibleIf: "{q1_groups} notempty" }, REQ),
        ...otherTextQs,
      ]},

      /* ---- GLOBAL profile ------------------------------------------------- */
      { name: "p_global", visibleIf: "{q2_subgroups} notempty", elements: [
        { type: "ranking", name: "dialect_rank",
          title: "请按主次顺序排列您使用或所学的方言（最流利的放第1位；可拖动调整，本题选填）",
          choices: [] },
        Object.assign({ type: "multipletext", name: "time_pct",
          title: "假设交谈对象对您所有语言同样流利，请估计您说各语言的时间比例（数字，合计最多100%；若您还说列表以外的语言，如英语，剩余比例即为这些语言）",
          items: [] }, REQ),
      ]},

      /* ---- PER-DIALECT LOOP (stacked list, Chinese title) ----------------- */
      { name: "p_loop", visibleIf: "{q2_subgroups} notempty", elements: [
        { type: "paneldynamic", name: "dialect_loop",
          title: "请针对您选择的每种方言分别回答以下问题",
          renderMode: "list",
          allowAddPanel: false, allowRemovePanel: false,
          templateTitle: "以下问题都与您的「{panel.dialect_label}」相关",
          templateElements: [
            Object.assign({ type: "multipletext", name: "aoa",
              title: "您接触该方言时候的年龄（岁）",
              items: [
                { name: "begin",  title: "开始习得", validators: NUMERIC },
                { name: "fluent", title: "说得流畅", validators: NUMERIC },
              ]}, REQ),
            Object.assign({ type: "matrixdropdown", name: "env_time",
              title: "请填写您在每类语言环境中度过的大概时间（年 / 月）",
              columns: [
                { name: "years",  title: "年", cellType: "text", validators: NUMERIC },
                { name: "months", title: "月", cellType: "text", validators: NUMERIC },
              ],
              rows: [
                { value: "region", text: "使用该语言的地区或国家" },
                { value: "family", text: "使用该语言的家庭" },
                { value: "work",   text: "使用该语言的学校或工作单位" },
              ]}, REQ),
            Object.assign({ type: "matrix", name: "proficiency", isAllRowRequired: true,
              title: "请在 " + SCALE_MIN + "-" + SCALE_MAX + " 之间标出您的语言水平",
              columns: ratingColumns(),
              rows: [
                { value: "speak",  text: "说" },
                { value: "listen", text: "听懂" },
              ]}, REQ),
            Object.assign({ type: "matrix", name: "acquisition", isAllRowRequired: true,
              title: "请标出下列因素对您习得该方言的影响程度（" + SCALE_MIN + "-" + SCALE_MAX + "）",
              columns: ratingColumns(), rows: envRows() }, REQ),
            Object.assign({ type: "matrix", name: "exposure", isAllRowRequired: true,
              title: "请标出您当前在下列环境中接触该方言的程度（" + SCALE_MIN + "-" + SCALE_MAX + "）",
              columns: ratingColumns(), rows: envRows() }, REQ),
            Object.assign({ type: "rating", name: "accent_strength", rateMin: 0, rateMax: RATE_MAX,
              title: "您自我感觉说该方言时口音有多重？（0 = 完全没有口音）" }, REQ),
            Object.assign({ type: "rating", name: "infer_nonnative", rateMin: 0, rateMax: RATE_MAX,
              title: "他人根据口音判断这不是您第一语言的频率？（0 = 从未）" }, REQ),
            Object.assign({ type: "radiogroup", name: "translit_use",
              title: "日常打字交流中，您是否会用该方言转写（标准书面语以外用汉字/拼音表示方言读音）？",
              choices: [{ value: "yes", text: "是" }, { value: "no", text: "否" }] }, REQ),
            Object.assign({ type: "rating", name: "translit_understand", rateMin: 0, rateMax: RATE_MAX,
              title: "您能理解他人此类转写的程度？（0 = 完全看不懂）" }, REQ),
          ]},
      ]},

      /* ---- wrap-up (OPTIONAL) --------------------------------------------- */
      { name: "p_end", elements: [
        { type: "radiogroup", name: "has_issues",
          title: "您是否对本问卷有任何疑问或问题？（选填）",
          choices: [{ value: "yes", text: "是" }, { value: "no", text: "否" }] },
        { type: "comment", name: "issues_detail",
          visibleIf: "{has_issues} = 'yes'",
          title: "请描述您的疑问或问题（选填）" },
      ]},
    ],
  };
}

/* =============================================================================
   2. Wire the dynamic behaviour.
   ========================================================================== */
function wireSurvey(survey, dmap) {

  const groupNames = Object.keys(dmap.groups);
  const labelOf = {};
  groupNames.forEach(g => dmap.groups[g].forEach(s => {
    labelOf[s.code] = { city: s.city, group: g, is_other: !!s.is_other };
  }));

  function getLabel(code) {
    if (labelOf[code].is_other) {
      const t = survey.getValue("other_" + code);
      return (t && String(t).trim()) ? String(t).trim() : ("其他方言（" + labelOf[code].group + "）");
    }
    return labelOf[code].city;
  }

  let lastSig = null;
  function rebuildDownstream() {
    const sel = survey.getValue("q2_subgroups") || [];
    const sig = JSON.stringify(sel.map(function (c) { return c + "::" + getLabel(c); }));
    if (sig === lastSig) return;
    lastSig = sig;
    const rank = survey.getQuestionByName("dialect_rank");
    const pct  = survey.getQuestionByName("time_pct");
    const loop = survey.getQuestionByName("dialect_loop");

    rank.choices = sel.map(function (c) { return { value: c, text: getLabel(c) }; });
    // Ranking is optional; hide it when only 0-1 dialects (ranking one item is
    // meaningless) and record the trivial rank-1 in that case.
    rank.visible = sel.length > 1;
    if (sel.length <= 1) rank.value = sel.slice();

    pct.items = [];
    sel.forEach(function (c) { pct.addItem(c, getLabel(c)); });   // plain text -> non-number flaggable

    const prev = (loop.value || []);
    loop.value = sel.map(function (c) {
      const keep = prev.find(function (p) { return p.dialect_code === c; }) || {};
      return Object.assign({}, keep, { dialect_code: c, dialect_label: getLabel(c) });
    });
  }

  // (a) Q1 -> rebuild Q2 choices; prune invalid selections.
  survey.onValueChanged.add(function (sender, opt) {
    if (opt.name !== "q1_groups") return;
    const selected = opt.value || [];
    const q2 = sender.getQuestionByName("q2_subgroups");
    const newChoices = [];
    groupNames.forEach(function (g) {
      if (selected.indexOf(g) === -1) return;
      dmap.groups[g].forEach(function (s) { newChoices.push({ value: s.code, text: s.city }); });
    });
    q2.choices = newChoices;
    const valid = newChoices.map(function (c) { return c.value; });
    if (Array.isArray(q2.value)) {
      const pruned = q2.value.filter(function (v) { return valid.indexOf(v) !== -1; });
      if (pruned.length !== q2.value.length) q2.value = pruned;
    }
  });

  // (b) rebuild downstream when leaving the dialect page.
  survey.onCurrentPageChanging.add(function (sender, opt) {
    if (opt.oldCurrentPage && opt.oldCurrentPage.name === "p_dialect") rebuildDownstream();
  });

  // (c) validation
  survey.onValidateQuestion.add(function (sender, opt) {

    // %-split: non-number flag, then <=100.
    if (opt.name === "time_pct" && opt.value) {
      const vals = Object.values(opt.value);
      const hasText = vals.some(function (x) { return x !== "" && x != null && isNaN(Number(x)); });
      if (hasText) { opt.error = "请输入数字"; return; }
      const total = vals.reduce(function (a, b) { return a + (Number(b) || 0); }, 0);
      if (total > 100) opt.error = "各项百分比之和不能超过 100%（目前 " + total + "%）";
      return;
    }

    // aoa: 开始习得 / 说得流畅 cannot exceed the participant's age (equal is OK).
    if (opt.name === "aoa" && opt.value) {
      const age = Number(sender.getValue("age"));
      const begin = Number(opt.value.begin), fluent = Number(opt.value.fluent);
      if (!isNaN(age) && ((!isNaN(begin) && begin > age) || (!isNaN(fluent) && fluent > age))) {
        opt.error = "此处年龄不能大于您填写的年龄（" + age + " 岁）";
        return;
      }
    }

    // env_time: per-ROW (年 + 月/12) <= age; 月 in 0-12. Rows may overlap, so NOT summed.
    if (opt.name === "env_time" && opt.value) {
      const v = opt.value;
      const age = Number(sender.getValue("age"));
      let err = null;
      ["region", "family", "work"].forEach(function (row) {
        if (err) return;
        const cell = v[row] || {};
        const y = Number(cell.years), m = Number(cell.months);
        if (cell.months !== undefined && cell.months !== "" && !isNaN(m) && (m < 0 || m > 12)) {
          err = "「月」需在 0 到 12 之间"; return;
        }
        const dur = (isNaN(y) ? 0 : y) + (isNaN(m) ? 0 : m) / 12;
        if (!isNaN(age) && dur > age) {
          err = "每一项的「年 + 月」不能超过您的年龄（" + age + " 岁）";
        }
      });
      if (err) opt.error = err;
    }
  });
}

/* =============================================================================
   3. Push the trial.
   ========================================================================== */
function pushLanguageBackgroundSurvey(timeline) {
  return fetch("resources/dialect_map.json")
    .then(function (r) { return r.json(); })
    .then(function (dmap) {
      timeline.push({
        type: jsPsychSurvey,
        survey_json: buildSurveyJson(dmap),
        survey_function: function (survey) { wireSurvey(survey, dmap); },
        data: { phase: "language_background" },
      });
    });
}