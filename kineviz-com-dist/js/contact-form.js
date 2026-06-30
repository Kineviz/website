/*
 * contact-form.js
 * The static Squarespace export's contact form posts to Squarespace's backend,
 * which doesn't exist off-platform — so the "Contact Us" button does nothing.
 *
 * This intercepts the submit, collects the fields, and POSTs them to a Google
 * Apps Script web app (which appends a row to a Sheet and emails a notification).
 */
(function () {
  // Google Apps Script web app URL (ends in /exec). Set after deploying contact-form.gs.
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbzXP0imk3ht-YflD6YB7TRkv4YEpGZ65mNIHwDiuk-ojAwXtxcvcfL57jEERyFgZ_TQdA/exec";

  // Post-submit confirmation (the message Squarespace shows after a submission).
  var CONFIRMATION_HTML =
    '<p style="white-space:pre-wrap;">Thank you for completing the form! <br>We received your request.<br><br>' +
    'One of our team members will reach out within 1 business day. <br><br>' +
    'Please check your inbox for an email confirmation.<br><br>' +
    'In the meantime, check out our <a href="/case-studies"><strong>case studies</strong></a> ' +
    'or visit <a href="https://medium.com/kineviz"><strong>our blog</strong></a> for product and company updates.<br><br>' +
    'For immediate product Demo Request, <a href="https://calendar.app.google/S51EPY4bewNbEo2M8"><strong>click HERE</strong></a>.</p>';

  // Bot protection. A honeypot field (hidden from humans) and a minimum fill
  // time catch automated spam. Both are also re-checked server-side.
  var MIN_FILL_MS = 1500;
  var renderedAt = Date.now();
  var honeypot = null;

  function addHoneypot(form) {
    if (honeypot || form.querySelector('input[name="_hp"]')) return;
    var wrap = document.createElement("div");
    wrap.setAttribute("aria-hidden", "true");
    wrap.style.cssText =
      "position:absolute!important;left:-9999px!important;top:auto;width:1px;height:1px;overflow:hidden;";
    honeypot = document.createElement("input");
    honeypot.type = "text";
    honeypot.name = "_hp";
    honeypot.tabIndex = -1;
    honeypot.autocomplete = "off";
    honeypot.setAttribute("aria-hidden", "true");
    wrap.appendChild(honeypot);
    form.appendChild(wrap);
  }

  function labelText(el) {
    if (el.labels && el.labels[0]) return el.labels[0].innerText || "";
    var id = el.getAttribute("id");
    if (id) {
      var l = document.querySelector('label[for="' + id + '"]');
      if (l) return l.innerText || "";
    }
    return "";
  }

  function findByLabel(form, re) {
    var els = form.querySelectorAll("input, select, textarea");
    for (var i = 0; i < els.length; i++) {
      if (re.test(labelText(els[i]))) return els[i];
    }
    return null;
  }

  function val(el) { return el && el.value ? String(el.value).trim() : ""; }

  function showConfirmation(form) {
    if (form.__confShown) return;
    form.__confShown = true;
    var box = document.createElement("div");
    box.className = "contact-form-confirmation";
    box.style.cssText =
      "text-align:center;max-width:820px;margin:2.5em auto;padding:0 1em;font-size:1.25rem;line-height:1.5;";
    box.innerHTML = CONFIRMATION_HTML;
    form.style.display = "none";
    form.insertAdjacentElement("afterend", box);
    try { box.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
  }

  function getForm() {
    var fname = document.querySelector('input[name="fname"]');
    return fname ? fname.closest("form") : document.querySelector(".sqs-block-form form");
  }

  function collect(form) {
    var firstName = form.querySelector('input[name="fname"]');
    var lastName = form.querySelector('input[name="lname"]');
    var email = form.querySelector('input[type="email"]') || findByLabel(form, /e-?mail/i);
    return {
      firstName: val(firstName) || val(findByLabel(form, /first name/i)),
      lastName: val(lastName) || val(findByLabel(form, /last name/i)),
      email: val(email),
      company: val(findByLabel(form, /company/i)),
      role: val(findByLabel(form, /role/i)),
      useCase: val(findByLabel(form, /use case|industry/i)),
      message: val(findByLabel(form, /accomplish|message|tell us|how can/i)),
      pageUrl: location.href,
      _hp: honeypot ? honeypot.value : "",
      _elapsed: String(Date.now() - renderedAt)
    };
  }

  function notify(form, msg, isError) {
    var box = form.querySelector(".contact-form-status");
    if (!box) {
      box = document.createElement("div");
      box.className = "contact-form-status";
      box.style.cssText = "margin-top:1em;font-size:1rem;line-height:1.4;";
      form.appendChild(box);
    }
    box.style.color = isError ? "#c0392b" : "inherit";
    box.textContent = msg;
  }

  function submitHandler(e) {
    var form = getForm();
    if (!form) return;
    // Only intercept the contact form's own submit.
    if (e.target !== form && !(e.target && form.contains(e.target))) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    var data = collect(form);

    // Bot protection: honeypot filled or submitted implausibly fast → silently
    // accept (show success, send nothing) so spam bots get no useful signal.
    if (data._hp || Number(data._elapsed) < MIN_FILL_MS) {
      showConfirmation(form);
      return;
    }

    if (!data.firstName || !data.lastName || !data.email) {
      notify(form, "Please fill in your first name, last name, and email.", true);
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
      notify(form, "Please enter a valid email address.", true);
      return;
    }

    var btn = form.querySelector('[type="submit"], button');
    var btnText = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
    notify(form, "");

    if (ENDPOINT.indexOf("__CONTACT") === 0) {
      notify(form, "Form endpoint is not configured yet.", true);
      if (btn) { btn.disabled = false; btn.textContent = btnText; }
      return;
    }

    var body = new URLSearchParams(data).toString();
    fetch(ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: body
    }).then(function () {
      // no-cors gives an opaque response; a resolved promise means the request was sent.
      form.querySelectorAll("input, select, textarea").forEach(function (el) {
        if (el.type !== "hidden" && el.type !== "submit") el.value = "";
      });
      if (btn) { btn.disabled = false; btn.textContent = btnText; }
      showConfirmation(form);
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = btnText; }
      notify(form, "Sorry, something went wrong sending your message. Please email hello@kineviz.com.", true);
    });
  }

  function initEmailButton() {
    var link = document.querySelector("a.kv-cta-email-display");
    if (!link || link.__wired) return;
    link.__wired = true;
    var email = (link.getAttribute("href") || "").replace(/^mailto:/, "") || link.textContent.trim();
    var label = link.textContent;
    var timer = null;
    // Don't preventDefault: the mailto still opens a mail client if one exists.
    link.addEventListener("click", function () {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(email);
        } else {
          var ta = document.createElement("textarea");
          ta.value = email;
          ta.style.cssText = "position:fixed;opacity:0;";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
      } catch (e) {}
      link.textContent = "Copied!";
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { link.textContent = label; timer = null; }, 1600);
    });
  }

  function init() {
    initEmailButton();
    // Capture phase on document → runs before Squarespace's own submit handler.
    document.addEventListener("submit", submitHandler, true);
    // The Squarespace form renders asynchronously; poll briefly to plant the
    // honeypot once it exists so bots see it before submitting.
    var tries = 0;
    var t = setInterval(function () {
      var form = getForm();
      if (form) { addHoneypot(form); clearInterval(t); }
      else if (++tries >= 20) clearInterval(t);
    }, 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
