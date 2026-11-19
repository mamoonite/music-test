/* The listening test's settings that the researcher fills in before the page goes online (M024).
   Everything about the clips comes from clips.js, which listening_build.py writes. */
window.LT_SETTINGS = {
  // Where the page sends each listener's answer code, in the background, when they press «پایان»: the researcher's
  // Google Form «پاسخ آزمون شنیداری», whose one short-answer question «کد» is the field "entry". Empty = no sending;
  // the last page then only shows the code to copy and send.
  googleForm: {
    action: "https://docs.google.com/forms/d/e/1FAIpQLScxj4JXWQ2SWoZxH9w963SVrx33xFJDsVNEj2sRm54XR8FYAQ/formResponse",
    entry: "entry.192031656"
  },
  // Shown under the code when sending fails, e.g. "در بله یا ایتا به شناسه‌ی ..."; empty = a general line.
  contact: "",
  // A line under the title on the first page.
  about: "پژوهشِ پایان‌نامه‌ی کارشناسی ارشد، دانشگاه سمنان"
};
