/* =============================================================================
   experiment.js — Mandarin Lexical Tone (MLT) online behavioural task
   -----------------------------------------------------------------------------
   Flow:
     consent -> eligibility screening -> sound + keyboard check
            -> Main Task: [ Block1 typed-response | Block2/3 same-position/same-segmental units (counterbalanced) | Block4 Repeat ]  (in MLT_Online.csv)
            -> language-background questionnaire (survey_language_background.js)
            -> DataPipe save -> Prolific completion

   - List assignment: DataPipe getCondition over 84 conditions (lab standard).
   - Anonymity: PROLIFIC_PID is NEVER stored; only an anonymous subject_id +
     a from_prolific boolean.
   - Mouse-tracking is a secondary/exploratory measure on Task 1 & Task 2.
   ============================================================================= */

const CONFIG = {
  datapipeExperimentId: "iuwfMNzXuVER", 
  nLists: 84,
  trialTable: "MLT_Online.csv",
  // ---- Prolific completion: TODO ----
  completionMode: "code",
  prolificCode: "REPLACE_WITH_PROLIFIC_CODE",
  prolificRedirectURL: "TODO"
};

const jsPsych = initJsPsych({
  show_progress_bar: true,
  message_progress_bar: "完成进度",
  auto_update_progress_bar: true,
  extensions: [{ type: jsPsychExtensionMouseTracking }],
  on_finish: () => console.log("实验结束，感谢您的参与！"),
});

/* identity — anonymous only */
const subject_id = jsPsych.randomization.randomID(10);
const filename   = `${subject_id}.csv`;
const fromProlific = !!jsPsych.data.getURLVariable("PROLIFIC_PID TODO"); 

let expInfo = { subject_id, session: "001", test_version: "MLT_v1", list: null };

jsPsych.data.addProperties({
  subject_id, session: expInfo.session, test_version: expInfo.test_version,
  from_prolific: fromProlific          // not storing Prolific PID: TODO
});

var timeline = [];

/* generated beep for the device/headphone check */
function playBeep(freq = 440, ms = 450) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.start(t); osc.stop(t + ms / 1000 + 0.02);
  } catch (e) { console.warn("Beep failed:", e); }
}
window.playBeep = playBeep;  

/* =============================== FRONT MATTER =============================== */

/* consent (jpg. in bordered, scrollable box) */
timeline.push({
  type: jsPsychSurveyMultiChoice,
  preamble: `
    <div style="border:1px solid #999; border-radius:6px; max-width:820px; max-height:62vh;
                overflow-y:auto; margin:16px auto; padding:18px; text-align:center; background:#fff;">
      <img src="resources/consentform.jpg" alt="知情同意书" style="max-width:100%; height:auto;">
    </div>
    <p style="max-width:820px; margin:12px auto;">请阅读以上知情同意书（可在框内向下滚动）。您必须同意才能参加。</p>`,
  questions: [{
    prompt: "我是否同意参加这项研究？",
    name: "consent", options: ["我同意参加这项研究"], required: true
  }],
  button_label: "继续",
  on_finish: d => jsPsych.data.addProperties({
    consent_given: d.response.consent === "我同意参加这项研究"
  })
});

/* eligibility screening (records, continues regardless? TODO) */
timeline.push({
  type: jsPsychSurveyMultiChoice,
  preamble: "<p>在开始之前，请回答以下两个问题。</p>",
  questions: [
    { prompt: "您是否已年满18岁、普通话流利，并在7岁之前开始学习普通话？",
      name: "elig_mandarin", options: ["是", "否"], required: true },
    { prompt: "您能否流畅地阅读中文？",
      name: "elig_reading", options: ["是", "否"], required: true }
  ],
  button_label: "继续",
  on_finish: d => jsPsych.data.addProperties({
    eligible: (d.response.elig_mandarin === "是") && (d.response.elig_reading === "是")
  })
});

/* sound check */
timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "<p style=\"font-size:1.4em; line-height:1.7;\">请使用<strong>电脑</strong>（台式或笔记本均可，<strong>请勿使用手机或平板</strong>），并佩戴<strong>耳机</strong>。<br>建议使用 Chrome 或 Safari 浏览器。<br>按空格键继续。</p>",
  choices: [" "]
});
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `<p>请点击下面的按钮播放测试音，确认您能清楚地听到声音。</p>
             <p><button type="button" class="jspsych-btn" onclick="playBeep()">▶ 播放测试音</button></p>`,
  choices: ["我能清楚地听到"],
  on_load: () => playBeep()
});

/* ---- Simplified-Chinese input check ----
   Task 3 requires typing Simplified Hanzi. Online participants without a
   Simplified-Chinese IME can't do it, so we verify early. Loops up to 3 tries,
   records `ime_ok`, and never traps the participant (continues after 3). The
   failure notice tells online participants they can return the task on Prolific.
   In the lab this passes on the first try. ?? TODO*/
const imeCheck = {
  type: jsPsychSurveyText,
  preamble: "<p>本研究需要您使用<strong>简体中文输入法</strong>打字。<br>请在下方输入「<strong>学习</strong>」两个字，以确认您的输入法正常工作。</p>",
  questions: [{ prompt: "请输入「学习」：", name: "ime_probe", required: true, placeholder: "在此输入" }],
  button_label: "继续",
  data: { phase: "ime_check" },
  on_finish: d => {
    const txt = (d.response && d.response.ime_probe) ? String(d.response.ime_probe).trim() : "";
    d.ime_input = txt;
    d.ime_ok = txt.includes("学习") ? 1 : 0;   // 学习 simplified; 學習 traditional would fail
  }
};
const imeFailNotice = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "<p>未能检测到正确的简体中文输入。</p><p>请确认已切换到<strong>简体中文输入法</strong>后重试。如果您的设备无法输入简体中文，您可能无法完成本研究，可在 Prolific 上退回（return）该任务。</p><p>按空格键重试。</p>",
  choices: [" "], data: { phase: "ime_fail_notice" },
  conditional_function: () => {
    const last = jsPsych.data.get().filter({ phase: "ime_check" }).last(1).values()[0];
    return last && last.ime_ok === 0;
  }
};
let imeAttempts = 0;
timeline.push({
  timeline: [imeCheck, { timeline: [imeFailNotice], conditional_function: imeFailNotice.conditional_function }],
  loop_function: () => {
    imeAttempts++;
    const last = jsPsych.data.get().filter({ phase: "ime_check" }).last(1).values()[0];
    const ok = last && last.ime_ok === 1;
    return (!ok && imeAttempts < 3);   // retry up to 3 times, then continue regardless
  }
});

/* ============================ TASK INTERFACES =============================== */
// Target each of the six option cells. In jsPsych v7 each .jspsych-btn is wrapped
// in its own div, so `.jspsych-btn:nth-child(N)` matched all-or-none; the direct
// children of the btngroup (the wrappers / grid cells) are the per-position targets.
const FC_BTN_SELECTORS = [0,1,2,3,4,5].map(
  i => `#jspsych-audio-button-response-btngroup > *:nth-child(${i+1})`);

function rowMeta(row, extra) {
  return Object.assign({
    list: row.list, block: Number(row.block), block_label: row.block_label,
    trial_in_block: Number(row.trial_in_block), trial_uid: row.trial_uid,
    task: Number(row.task), word: row.word, word_type: row.word_type,
    correct_tone: row.correct_tone, condition: row.condition, gender: row.gender,
    audio: row.audio, item_role: row.item_role, is_repeat: Number(row.is_repeat || 0),
    repeat_condition: row.repeat_condition || "", original_task: row.original_task || "",
    first_exposure_id: row.first_exposure_id || "",
    heard_tone: row.heard_tone || "",          // carried on ALL trials (incl. typed-response) for substitution analysis
    subject_id: expInfo.subject_id, test_version: expInfo.test_version, list_id: expInfo.list
  }, extra || {});
}

/* Task 3 — audio once -> typed recall */
function makeTask3(row) {
  const listen = {
    type: jsPsychAudioKeyboardResponse, stimulus: row.audio,
    prompt: "<p>请仔细聆听。</p>", choices: "NO_KEYS", trial_ends_after_audio: true,
    data: rowMeta(row, { phase: "task3_listen" })
  };
  const recall = {
    type: jsPsychSurveyText,
    questions: [{ prompt: "请输入您刚才听到的词语：", name: "typed_recall",
                  required: true, placeholder: "在此输入" }],
    button_label: "继续",
    data: rowMeta(row, { phase: "task3_recall", correct_response: row.correct_response }),
    on_finish: d => {
      d.rt_sec = d.rt ? (d.rt / 1000).toFixed(3) : null;
      d.typed_recall = d.response ? String(d.response.typed_recall).trim() : "";
      d.recall_exact = d.typed_recall === String(row.correct_response).trim() ? 1 : 0;
    }
  };

  // Repeat block only (is_repeat=1): ask question right after the audio and before typing,
  // ask whether they heard this recording in Blocks 1-3.
  if (Number(row.is_repeat) === 1) {
    const recognition = {
      type: jsPsychHtmlButtonResponse,
      stimulus: "<p style=\"font-size:1.4em; line-height:1.7;\">在前面的部分，您有没有听到过<strong>这一段录音</strong>？</p>",
      choices: ["有", "没有"],
      data: rowMeta(row, { phase: "repeat_recognition" }),
      on_finish: d => {
        d.recog_response = d.response === 0 ? "heard" : "not_heard";
        d.recog_veridical = ((row.repeat_condition === "same_audio"     && d.response === 0) ||
                             (row.repeat_condition === "diff_condition"  && d.response === 1)) ? 1 : 0;
      }
    };
    return { timeline: [listen, recognition, recall] };
  }

  return { timeline: [listen, recall] };
}

/* Task 1 & 2 — start -> audio once -> click */
function makeForcedChoice(row) {
  const options = [0,1,2,3,4,5].map(i => ({
    text: row[`opt${i}_text`], role: row[`opt${i}_role`], tone: row[`opt${i}_tone`] }));
  const correct_pos = Number(row.correct_pos);
  const heard_tone  = row.heard_tone || "";
  const isTask1     = Number(row.task) === 1;

  const start = {
    type: jsPsychHtmlButtonResponse,
    stimulus: "<p>准备好后，请点击下方按钮开始播放音频。</p>",
    choices: ["▶ 开始"],
    data: rowMeta(row, { phase: "fc_start" })
  };

  // ms from trial start to when the options become visible (i.e. audio end); set in on_load.
  let revealOffset = 0;

  const choice = {
    type: jsPsychAudioButtonResponse, stimulus: row.audio,
    prompt: "<p>请选择您听到的词语。</p>",
    choices: options.map(o => o.text),
    response_allowed_while_playing: false,
    button_layout: "grid", grid_rows: 2, grid_columns: 3,   // v8: plugin lays out the 3×2 grid
    extensions: [{ type: jsPsychExtensionMouseTracking, params: { targets: FC_BTN_SELECTORS } }],
    on_load: () => {
      // Hide the option set while the audio plays; reveal it only once the audio
      // ends. With response_allowed_while_playing:false the plugin renders the
      // buttons disabled during playback and enables them when the audio finishes,
      // so we watch the first button's `disabled` flag and reveal on enable.
      // We also record the reveal time so mouse samples taken before the options
      // appear (cursor over a blank screen) can be dropped in on_finish.
      const t0 = performance.now();
      const grp = document.querySelector("#jspsych-audio-button-response-btngroup");
      if (!grp) return;
      grp.style.visibility = "hidden";                 // keeps layout (no jump on reveal)
      const reveal = () => { grp.style.visibility = "visible"; revealOffset = performance.now() - t0; };
      const firstBtn = grp.querySelector("button");
      if (!firstBtn || !firstBtn.disabled) { reveal(); return; }
      const obs = new MutationObserver(() => {
        if (!firstBtn.disabled) { reveal(); obs.disconnect(); }
      });
      obs.observe(firstBtn, { attributes: true, attributeFilter: ["disabled"] });
    },
    data: rowMeta(row, {
      phase: isTask1 ? "task1_choice" : "task2_choice",
      correct_pos, correct_response: row.correct_response,
      heard_tone_pos: row.heard_tone_pos || "", heard_tone,
      opt_text: options.map(o => o.text).join("|"),
      opt_role: options.map(o => o.role).join("|"),
      opt_tone: options.map(o => o.tone).join("|")
    }),
    on_finish: d => {
      // Keep only cursor samples recorded AFTER the options appeared (audio end).
      // The extension samples from trial start; revealOffset (ms) is the audio-end point.
      if (Array.isArray(d.mouse_tracking_data) && revealOffset > 0) {
        d.mouse_tracking_data = d.mouse_tracking_data.filter(s => s.t >= revealOffset);
      }
      d.mt_reveal_offset_ms = Math.round(revealOffset);
      d.rt_sec = d.rt ? (d.rt / 1000).toFixed(3) : null;
      const pos = d.response;
      d.response_pos  = pos;
      d.response_role = (pos != null) ? options[pos].role : null;
      d.response_tone = (pos != null) ? options[pos].tone : null;
      d.correct       = (pos === correct_pos) ? 1 : 0;
      d.chose_heard_tone = (isTask1 && pos != null && options[pos].tone === heard_tone) ? 1 : 0;
    }
  };
  return { timeline: [start, choice] };
}

function makeTrialFromRow(row) {
  const t = Number(row.task);
  if (t === 3) return makeTask3(row);
  if (t === 1 || t === 2) return makeForcedChoice(row);
  return { timeline: [] };
}

const BLOCK_INTRO = {
  1: "<div style=\"font-size:2.4em; font-weight:bold; margin-bottom:20px;\">第一部分</div>" +
     "<div style=\"font-size:1em; line-height:1.7; max-width:680px; margin:0 auto 22px;\">您将听到一些词语。每段音频只播放一次。听完后，请用<strong>简体中文输入法</strong>把您听到的词语<strong>打出来</strong>。</div>" +
     "<div style=\"font-size:1.3em;\">按空格键开始</div>",
  2: "<div style=\"font-size:2.4em; font-weight:bold; margin-bottom:20px;\">选择部分</div>" +
     "<div style=\"font-size:1em; line-height:1.7; max-width:680px; margin:0 auto 22px;\">每段音频播放一次后，请从六个选项中<strong>点击</strong>您听到的词语。</div>" +
     "<div style=\"font-size:1.3em;\">按空格键开始</div>",
  3: "<div style=\"font-size:2.4em; font-weight:bold; margin-bottom:20px;\">选择部分</div>" +
     "<div style=\"font-size:1em; line-height:1.7; max-width:680px; margin:0 auto 22px;\">每段音频播放一次后，请从六个选项中<strong>点击</strong>您听到的词语。</div>" +
     "<div style=\"font-size:1.3em;\">按空格键开始</div>",
  4: "<div style=\"font-size:2.4em; font-weight:bold; margin-bottom:20px;\">最后一部分</div>" +
     "<div style=\"font-size:1em; line-height:1.7; max-width:680px; margin:0 auto 22px;\">您会再听到一些词语，听完后<strong>打出</strong>您听到的词语。</div>" +
     "<div style=\"font-size:1.3em;\">按空格键开始</div>"
};
const blockIntro = (b, label) => ({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: BLOCK_INTRO[b] || `<h3>${label}</h3><p>按空格键开始。</p>`,
  choices: [" "], data: { block: b, phase: "block_intro" }
});
const blockOutro = b => ({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "<p>本部分结束。</p><p>按空格键继续。</p>",
  choices: [" "], data: { block: b, phase: "block_outro" }
});

/* ============================ LOAD CSV & BUILD ============================== */
async function resolveList() {
  const urlList = parseInt(jsPsych.data.getURLVariable("list"), 10);
  if (!isNaN(urlList) && urlList >= 1 && urlList <= CONFIG.nLists) return urlList;
  try {
    const cond = await jsPsychPipe.getCondition(CONFIG.datapipeExperimentId);  // 0-based, balanced
    if (typeof cond === "number" && cond >= 0) return (cond % CONFIG.nLists) + 1;
  } catch (e) { console.warn("getCondition unavailable; using local fallback list.", e); }
  let h = 0; for (const ch of subject_id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % CONFIG.nLists) + 1;       // local-preview fallback only
}

async function main() {
  expInfo.list = await resolveList();
  jsPsych.data.addProperties({ list: expInfo.list });
  console.log("Assigned list:", expInfo.list);

  const csvText = await fetch(CONFIG.trialTable).then(r => r.text());
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const allRows = parsed.data.filter(r => r && r.block && r.task);
  const myRows = allRows.filter(r => Number(r.list) === Number(expInfo.list));
  const rows = myRows.length ? myRows : allRows;

  const byBlock = {};
  rows.forEach(r => { (byBlock[Number(r.block)] ||= []).push(r); });
  const blockNums = Object.keys(byBlock).map(Number).sort((a, b) => a - b);
  blockNums.forEach(b => byBlock[b].sort(
    (x, y) => Number(x.trial_in_block) - Number(y.trial_in_block)));

  timeline.push({
    type: jsPsychPreload, audio: rows.map(r => r.audio),
    message: "正在加载实验……", continue_after_error: true, max_load_time: 60000
  });

  blockNums.forEach(b => {
    const label = byBlock[b][0].block_label;
    timeline.push(blockIntro(b, label));
    byBlock[b].forEach(row => timeline.push(makeTrialFromRow(row)));
    timeline.push(blockOutro(b));
  });

  // language-background questionnaire (async: it fetches dialect_map.json then pushes)
  await pushLanguageBackgroundSurvey(timeline);

  // optional comments
  timeline.push({
    type: jsPsychSurveyText,
    questions: [{ prompt: "您有什么想告诉研究者的吗？（可选）", rows: 5, columns: 60 }],
    button_label: "继续",
    data: { phase: "final_comments" }
  });

  // saving notice + DataPipe save
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: "感谢参与！<br><br>正在保存您的数据，请稍候……",
    choices: "NO_KEYS", trial_duration: 2500
  });
  timeline.push({
    type: jsPsychPipe, action: "save",
    experiment_id: CONFIG.datapipeExperimentId, filename,
    data_string: () => jsPsych.data.get().csv()
  });

  // Prolific completion
  if (CONFIG.completionMode === "redirect") {
    timeline.push({
      type: jsPsychHtmlButtonResponse,
      stimulus: "实验结束，感谢您的参与！<br><br>请点击下方按钮返回 Prolific 完成提交。",
      choices: ["返回 Prolific"],
      on_finish: () => { window.location = CONFIG.prolificRedirectURL; }
    });
  } else {
    timeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `实验到此结束，感谢您的参与！<br><br>您的 Prolific 完成码是：<br>
                 <strong style="font-size:1.4em">${CONFIG.prolificCode}</strong><br><br>
                 请复制此码并返回 Prolific 提交。<br><br>按空格键结束。`,
      choices: [" "]
    });
  }

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") jsPsych.endExperiment("您已提前退出实验。");
  });

  jsPsych.run(timeline);
}

main().catch(err => {
  console.error("Fatal error building the experiment:", err);
  document.body.innerHTML = "<p>实验加载出错，请联系研究者。</p>";
});