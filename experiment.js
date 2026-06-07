/* =============================================================================
   experiment.js — Mandarin Lexical Tone (MLT) online behavioural task
   -----------------------------------------------------------------------------
   Flow:
     consent -> eligibility screening -> device/beep check
            -> [ Block1 Task3 | Block2/3 Task1/Task2 | Block4 Repeat ]  (MLT_Online.csv)
            -> language-background questionnaire (survey_language_background.js)
            -> DataPipe save -> Prolific completion

   - List assignment: DataPipe getCondition over 84 conditions (lab standard).
   - Anonymity: PROLIFIC_PID is NEVER stored; only an anonymous subject_id +
     a from_prolific boolean.
   - Mouse-tracking is a secondary/exploratory measure on Task 1 & Task 2.
   - Device check uses a generated beep (Web Audio), no audio file needed.
   ============================================================================= */

const CONFIG = {
  datapipeExperimentId: "iuwfMNzXuVER",   // OSF j8rbu / gzptx set on the DataPipe dashboard
  nLists: 84,
  trialTable: "MLT_Online.csv",
  // ---- Prolific completion: choose "code" (show a code) or "redirect" ----
  completionMode: "code",
  prolificCode: "REPLACE_WITH_PROLIFIC_CODE",
  prolificRedirectURL: "https://app.prolific.com/submissions/complete?cc=REPLACE_WITH_PROLIFIC_CODE"
};

const jsPsych = initJsPsych({
  show_progress_bar: true,
  message_progress_bar: "完成进度",
  auto_update_progress_bar: true,
  extensions: [{ type: jsPsychExtensionMouseTracking }],
  on_finish: () => console.log("Experiment finished.")
});

/* identity — anonymous only */
const subject_id = jsPsych.randomization.randomID(10);
const filename   = `${subject_id}.csv`;
const fromProlific = !!jsPsych.data.getURLVariable("PROLIFIC_PID");  // boolean only

let expInfo = { subject_id, session: "001", test_version: "MLT_v1", list: null };

jsPsych.data.addProperties({
  subject_id, session: expInfo.session, test_version: expInfo.test_version,
  from_prolific: fromProlific          // we deliberately do NOT store the Prolific ID
});

var timeline = [];

/* ---- generated beep for the device/headphone check (no file) ---- */
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
window.playBeep = playBeep;   // so the in-stimulus button can call it

/* =============================== FRONT MATTER =============================== */

/* consent (image) */
timeline.push({
  type: jsPsychSurveyMultiChoice,
  preamble: `
    <div style="text-align:center;">
      <img src="resources/consentform.jpg" alt="Consent Form" style="max-width:100%; height:auto;">
    </div>
    <p>请阅读以上知情同意书。您必须同意才能参加。</p>`,
  questions: [{
    prompt: "我是否同意参加这项研究？",
    name: "consent", options: ["我同意参加这项研究"], required: true
  }],
  button_label: "继续",
  on_finish: d => jsPsych.data.addProperties({
    consent_given: d.response.consent === "我同意参加这项研究"
  })
});

/* eligibility screening (records, continues regardless) */
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

/* device + beep check */
timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "本实验需在<strong>笔记本电脑</strong>上使用 <strong>Chrome 浏览器</strong>，并佩戴<strong>耳机</strong>。<br><br>请确保音量适中。<br><br>按空格键继续。",
  choices: [" "]
});
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `<p>请点击下面的按钮播放测试音，确认您能清楚地听到声音。</p>
             <p><button type="button" class="jspsych-btn" onclick="playBeep()">▶ 播放测试音</button></p>`,
  choices: ["我能清楚地听到"],
  on_load: () => playBeep()
});

/* ---- Simplified-Chinese input (IME) check ----
   Task 3 requires typing Simplified Hanzi. Online participants without a
   Simplified-Chinese IME can't do it, so we verify early. Loops up to 3 tries,
   records `ime_ok`, and never traps the participant (continues after 3). The
   failure notice tells online participants they can return the task on Prolific.
   In the lab this passes on the first try. */
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
const FC_BTN_SELECTORS = [0,1,2,3,4,5].map(
  i => `#jspsych-audio-button-response-btngroup .jspsych-btn:nth-child(${i+1})`);

function rowMeta(row, extra) {
  return Object.assign({
    list: row.list, block: Number(row.block), block_label: row.block_label,
    trial_in_block: Number(row.trial_in_block), trial_uid: row.trial_uid,
    task: Number(row.task), word: row.word, word_type: row.word_type,
    correct_tone: row.correct_tone, condition: row.condition, gender: row.gender,
    audio: row.audio, item_role: row.item_role, is_repeat: Number(row.is_repeat || 0),
    repeat_condition: row.repeat_condition || "", original_task: row.original_task || "",
    first_exposure_id: row.first_exposure_id || "",
    subject_id: expInfo.subject_id, test_version: expInfo.test_version, list_id: expInfo.list
  }, extra || {});
}

/* Task 3 — free recall (audio once -> typed recall) */
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
  return { timeline: [listen, recall] };
}

/* Task 1 & 2 — six-option forced choice (start -> audio once -> unlock -> click) */
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
    button_html: '<button class="jspsych-btn fc-start">%choice%</button>',
    data: rowMeta(row, { phase: "fc_start" })
  };
  const choice = {
    type: jsPsychAudioButtonResponse, stimulus: row.audio,
    prompt: "<p>请选择您听到的词语。</p>",
    choices: options.map(o => o.text),
    button_html: '<button class="jspsych-btn fc-option">%choice%</button>',
    response_allowed_while_playing: false,
    margin_vertical: "0px", margin_horizontal: "0px",
    extensions: [{ type: jsPsychExtensionMouseTracking, params: { targets: FC_BTN_SELECTORS } }],
    data: rowMeta(row, {
      phase: isTask1 ? "task1_choice" : "task2_choice",
      correct_pos, correct_response: row.correct_response,
      heard_tone_pos: row.heard_tone_pos || "", heard_tone,
      opt_text: options.map(o => o.text).join("|"),
      opt_role: options.map(o => o.role).join("|"),
      opt_tone: options.map(o => o.tone).join("|")
    }),
    on_finish: d => {
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
  1: "<h3>第一部分</h3><p>您将听到一些词语。每段音频只播放一次。<br>听完后，请用<strong>简体中文输入法</strong>把您听到的词语<strong>打出来</strong>。<br><br>按空格键开始。</p>",
  2: "<h3>选择部分</h3><p>每段音频播放一次后，请从六个选项中<strong>点击</strong>您听到的词语。<br><br>按空格键开始。</p>",
  3: "<h3>选择部分</h3><p>每段音频播放一次后，请从六个选项中<strong>点击</strong>您听到的词语。<br><br>按空格键开始。</p>",
  4: "<h3>最后一部分</h3><p>您会再听到一些词语，听完后<strong>打出</strong>您听到的词语。<br><br>按空格键开始。</p>"
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