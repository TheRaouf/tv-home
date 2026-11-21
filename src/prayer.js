/* Prayer time engine — astronomical calculation (PrayTimes-style), ES5 for older TV browsers.
   Runs fully offline. */
var PrayerEngine = (function () {
  function dtr(d) { return d * Math.PI / 180; }
  function rtd(r) { return r * 180 / Math.PI; }
  function sin(d) { return Math.sin(dtr(d)); }
  function cos(d) { return Math.cos(dtr(d)); }
  function tan(d) { return Math.tan(dtr(d)); }
  function arcsin(x) { return rtd(Math.asin(x)); }
  function arccos(x) { return rtd(Math.acos(x)); }
  function arctan2(y, x) { return rtd(Math.atan2(y, x)); }
  function arccot(x) { return rtd(Math.atan(1 / x)); }
  function fix(a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; }
  function fixAngle(a) { return fix(a, 360); }
  function fixHour(a) { return fix(a, 24); }

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    var D = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * D);
    var q = fixAngle(280.459 + 0.98564736 * D);
    var L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
    var e = 23.439 - 0.00000036 * D;
    var RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
    return { decl: arcsin(sin(e) * sin(L)), eqt: q / 15 - fixHour(RA) };
  }

  // Calculation presets. isha: degrees, or {min: N} for fixed minutes after maghrib.
  var METHODS = {
    uae:   { name: 'UAE (18.2° / 18.2°)', fajr: 18.2, isha: 18.2, adj: { dhuhr: 3, maghrib: 3 } },
    makkah:{ name: 'Umm al-Qura, Makkah', fajr: 18.5, isha: { min: 90 } },
    mwl:   { name: 'Muslim World League', fajr: 18, isha: 17 },
    egypt: { name: 'Egyptian Authority', fajr: 19.5, isha: 17.5 },
    gulf:  { name: 'Gulf Region', fajr: 19.5, isha: { min: 90 } }
  };

  /* opts: {lat, lng, method, asr: 1|2, tz (hours), offsets: {fajr..isha minutes}}
     date: JS Date (local calendar day used). Returns minutes-from-midnight values. */
  function compute(date, opts) {
    var m = METHODS[opts.method] || METHODS.uae;
    var lat = opts.lat, lng = opts.lng;
    var jDate = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);

    function midDay(t) { var eqt = sunPosition(jDate + t).eqt; return fixHour(12 - eqt); }
    function sunAngleTime(angle, t, ccw) {
      var decl = sunPosition(jDate + t).decl;
      var noon = midDay(t);
      var x = (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat));
      x = Math.max(-1, Math.min(1, x));
      var h = arccos(x) / 15;
      return noon + (ccw ? -h : h);
    }
    function asrTime(factor, t) {
      var decl = sunPosition(jDate + t).decl;
      var angle = -arccot(factor + tan(Math.abs(lat - decl)));
      return sunAngleTime(angle, t);
    }

    var t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, isha: 18 };
    for (var i = 0; i < 2; i++) { // two refinement passes
      var p = {};
      for (var k in t) p[k] = t[k] / 24;
      t = {
        fajr: sunAngleTime(m.fajr, p.fajr, true),
        sunrise: sunAngleTime(0.833, p.sunrise, true),
        dhuhr: midDay(p.dhuhr),
        asr: asrTime(opts.asr || 1, p.asr),
        sunset: sunAngleTime(0.833, p.sunset),
        isha: typeof m.isha === 'number' ? sunAngleTime(m.isha, p.isha) : 0
      };
    }
    var tz = typeof opts.tz === 'number' ? opts.tz : -date.getTimezoneOffset() / 60;
    var adj = tz - lng / 15;
    var out = {
      fajr: t.fajr + adj,
      sunrise: t.sunrise + adj,
      dhuhr: t.dhuhr + adj,
      asr: t.asr + adj,
      maghrib: t.sunset + adj,
      isha: typeof m.isha === 'number' ? t.isha + adj : t.sunset + adj + m.isha.min / 60
    };
    var offs = opts.offsets || {};
    var res = {};
    for (var key in out) {
      var base = (m.adj && m.adj[key]) || 0;
      res[key] = Math.round(out[key] * 60) + base + (offs[key] || 0);
    }
    return res;
  }

  return { compute: compute, METHODS: METHODS };
})();
if (typeof module !== 'undefined') module.exports = PrayerEngine;
