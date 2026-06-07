/* =====================================================================
   Mandarin Lexical Tone Experiment
   Timeline plan (built step by step):
     consent  ->  [Task3 | Task1 | Task2 | Repeat blocks]  ->  survey
              ->  DataPipe save (anonymous)  ->  completion code
   Anonymity rule: the Prolific ID is NEVER read or saved. We use our own
   random SUBJECT_ID. (Protocol: Prolific IDs are never recorded.)

   index.html include order (local first; CDN equivalents in comments there):
     jspsych core + jspsych.css
     plugin-survey-multi-choice.js        (consent gate)
     plugin-audio-button-response.js      (audio test)
     plugin-survey.js  +  survey.css      (SurveyJS — the language-background survey)
     survey_language_background.js        (our survey module; defines pushLanguageBackgroundSurvey)
     [later] plugin-browser-check, DataPipe save plugin, etc.
   ===================================================================== */

const CONFIG = {
  datapipeExperimentId: "iuwfMNzXuVER",  // used only at the save/assignment step
  nLists: 84
  // OSF project j8rbu / data component gzptx are configured on the DataPipe
  // dashboard, NOT referenced in code.
};

// show_progress_bar -> the "Completion Progress" bar at the top of every screen
const jsPsych = initJsPsych({
  show_progress_bar: true,
  message_progress_bar: "Completion Progress"
});

// anonymous id (NOT the Prolific id) — created now, used when we add saving
const SUBJECT_ID = jsPsych.randomization.randomID(10);
jsPsych.data.addProperties({ subject_id: SUBJECT_ID });

/* ---------------------------------------------------------------------
   CONSENT  (first page)
   The Mandarin consent image is shown in a scrolling box. The required radio
   forces agreement before continuing. English/Mandarin source documents live
   alongside the project; this page shows resources/consentform.jpg.
   --------------------------------------------------------------------- */
const consent = {
  type: jsPsychSurveyMultiChoice,
  preamble: `
    <div style="max-width:820px; margin:0 auto;">
      <div style="border:2px solid #888; border-radius:4px; height:62vh;
                  overflow-y:scroll; padding:16px; text-align:center;
                  background:#fff;">
        <img src="resources/consentform.jpg" alt="知情同意书"
             style="max-width:100%; display:block; margin:0 auto;">
      </div>
      <p style="max-width:820px; margin:18px auto 0; text-align:center;">
        请仔细阅读以上知情同意书。您必须同意才能参加本研究。
      </p>
    </div>`,
  questions: [{
    prompt: "我是否同意参加这项研究？",
    name: "consent",
    options: ["我同意参加这项研究"],
    required: true
  }],
  button_label: "继续"
};

/* ---------------------------------------------------------------------
   (Step 2 carryover) audio test — kept so we can keep checking sound.
   The Continue click on the consent page already unlocked audio.
   --------------------------------------------------------------------- */
const listen = {
  type: jsPsychAudioButtonResponse,
  stimulus: "sounds/test.mp3",
  prompt: "<p>你听到了什么？听完后点击继续。<br>What did you hear? Click when the sound finishes.</p>",
  choices: ["继续 / Continue"],
  response_allowed_while_playing: false
};

/* ---------------------------------------------------------------------
   ELIGIBILITY SCREENING  (right after consent)
   Eligible: 18+, fluent Mandarin, began Mandarin before age 7, reads Chinese.
   Two yes/no questions; any "否" ends the study with a polite message and the
   rest of the experiment never runs.
   --------------------------------------------------------------------- */
const screening = {
  type: jsPsychSurveyMultiChoice,
  preamble: `
    <div style="max-width:720px; margin:0 auto; text-align:left; line-height:1.7;">
      <p>如果您<strong>年满18周岁</strong>、<strong>能流利地说普通话</strong>、
      <strong>在7岁之前开始说普通话</strong>，并且<strong>能够阅读中文</strong>，
      您即符合本研究的参与条件。</p>
      <p>如果您在<strong>7岁或之后</strong>才开始说普通话，或<strong>无法阅读中文</strong>，
      则不符合参与条件。</p>
      <p>为确认您是否符合条件，请先回答以下两个问题。</p>
    </div>`,
  questions: [
    {
      prompt: "您是否年满18周岁、能够流利地说普通话，并且能够阅读中文？",
      name: "elig_general",
      options: ["是", "否"],
      required: true
    },
    {
      prompt: "您是否在7岁之前就开始说普通话？",
      name: "elig_aoa",
      options: ["是", "否"],
      required: true
    }
  ],
  button_label: "继续",
  on_finish: function (data) {
    const r = data.response;
    // Record eligibility for later filtering, but DO NOT end the study —
    // the participant continues the questionnaire regardless of their answers.
    jsPsych.data.addProperties({
      eligible: (r.elig_general === "是" && r.elig_aoa === "是")
    });
  }
};

/* =====================================================================
   BUILD THE TIMELINE  (lab convention: push in order; run inside .then())
   ===================================================================== */
const timeline = [];

timeline.push(consent);
timeline.push(screening);   // any "否" -> jsPsych.endExperiment(), rest never runs
// timeline.push(listen);   // DISABLED: needs sounds/test.mp3 (currently missing).
// jsPsych auto-preloads every audio file in the timeline before the FIRST trial,
// so a missing audio file blanks the whole page. Re-enable once the file exists,
// or point `listen.stimulus` at a real file in one of your resources/ audio folders.

/* >>> TASK BLOCKS slot in HERE (synchronously, before the survey push):
       Task 3 free recall (always first), then Task 1 / Task 2 counterbalanced,
       then the Repeat block — built from resources/MLT_Online.csv.
       When you add the CSV load, combine it with the survey load so order is
       guaranteed, e.g.:

         Promise.all([
           fetch("resources/MLT_Online.csv").then(r => r.text()),
           fetch("resources/dialect_map.json").then(r => r.json())
         ]).then(([csvText, dmap]) => {
           // 1) push task blocks built from csvText
           // 2) push the survey (build it here from dmap, or keep the helper)
           // 3) push DataPipe save + completion code
           jsPsych.run(timeline);
         });

       For now, with no task blocks yet, the survey helper does its own fetch
       and appends after consent + listen, which is the correct final order. <<< */

// LANGUAGE-BACKGROUND SURVEY  (after task blocks, before saving)
pushLanguageBackgroundSurvey(timeline).then(() => {

  /* >>> DataPipe SAVE (anonymous) + COMPLETION CODE screen slot in HERE later.
         The save writes subject_id + data to experiment CONFIG.datapipeExperimentId.
         The completion code is shown to the participant only, never written to
         the saved data. <<< */

  jsPsych.run(timeline);
})
.catch((err) => {
  // A failed resource load (e.g. resources/dialect_map.json missing) would
  // otherwise leave a silent blank page. Surface it instead.
  console.error("Experiment failed to start:", err);
  document.body.innerHTML =
    '<div style="max-width:640px;margin:80px auto;font-family:sans-serif;' +
    'text-align:center;color:#900;">' +
    '<h3>The experiment could not start.</h3>' +
    '<p>A required file failed to load. Check the browser console (F12) for ' +
    'the red error and the failing URL.</p>' +
    '<pre style="text-align:left;background:#f6f6f6;color:#333;padding:12px;' +
    'border-radius:4px;white-space:pre-wrap;">' + String(err) + '</pre></div>';
});