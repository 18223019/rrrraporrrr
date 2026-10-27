/**
 * ========================================
 * RAPOR ASRAMA - Google Apps Script Web App
 * ========================================
 *
 * Endpoints:
 * - GET /scores?month=<Tab>&name=<Panggilan> → record tunggal
 * - GET /scores?month=<Tab> → seluruh record bulan
 * - GET /history?name=<Panggilan>&months=<n> → tren lintas bulan
 * - GET /members → list members dengan metadata
 *
 * Deploy as: Web App
 * Execute as: Me
 * Access: Anyone
 */

// ========================================
// CONFIGURATION
// ========================================

const SPREADSHEET_ID = "119JaNmuiLaYtmk96ibcV1kiNTaWQoAtWgKlx1nSV6tI";
const CACHE_DURATION = 300; // 5 minutes in seconds
const SHEET_METADATA = "metadata";

// Spreadsheet "Penilaian Kehadiran 26/27" (beda file dengan rapor).
// Akun pemilik deployment Apps Script harus punya akses (minimal Viewer).
const ATTENDANCE_SPREADSHEET_ID = "1_GcrKUtzTLJagALWzX9p0PNaQML3O4uF8owIckt_q2U";
const ATTENDANCE_SHEET_TYPES = ["Kumsub", "Program"];
// Sesuai Tabel 1. Matriks Penilaian Kehadiran
const ATTENDANCE_POINTS = { H1: 5, H2: 4, H3: 3, S1: 3, I: 2, S2: 1, H4: 1, TK: 0 };

const DEFAULT_REVALIDATE_ENDPOINT = ""; // Override via Script Properties key CLOUDFLARE_REVALIDATE_URL
const DEFAULT_REVALIDATE_SECRET = ""; // Override via Script Properties key CLOUDFLARE_REVALIDATE_SECRET
const DEFAULT_REVALIDATE_PREWARM = true;
const SCRIPT_PROP_REVALIDATE_ENDPOINT = "CLOUDFLARE_REVALIDATE_URL";
const SCRIPT_PROP_REVALIDATE_SECRET = "CLOUDFLARE_REVALIDATE_SECRET";

function createJsonOutput(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// ========================================
// MAIN ROUTER
// ========================================

/**
 * Main entry point for GET requests
 * @param {Object} e - Event object with query parameters
 * @returns {TextOutput} JSON response
 */
function doGet(e) {
  try {
    const path = e.parameter.path || "";
    const params = e.parameter;

    let result;

    // Path khusus dicek dulu, karena ketiganya juga memakai parameter month
    // (sebelumnya semua permintaan ber-month tertangkap sebagai "scores").
    if (path === "attendance") {
      result = getAttendance(params.month, params.name);
    } else if (path === "send-monthly-rapor") {
      result = sendMonthlyRapor(params.month);
    } else if (path === "revalidate-dashboard") {
      const prewarm = normalizeBooleanParam(
        params.prewarm,
        DEFAULT_REVALIDATE_PREWARM
      );
      result = triggerRevalidateDashboard(params.month, params.slug || "", {
        reason: params.reason || "manual-trigger",
        prewarm: prewarm,
        source: "api",
      });
    } else if (path === "scores" || params.month) {
      if (params.name) {
        result = getScoreByName(params.month, params.name);
      } else {
        result = getScores(params.month);
      }
    } else if (path === "history") {
      const months = parseInt(params.months, 10) || 3;
      result = getHistory(params.name, months);
    } else if (path === "members") {
      result = getMembers();
    } else if (path === "months") {
      result = listAvailableMonthsWithLabels();
    } else {
      result = { success: true, message: "Rapor Asrama API" };
    }

    return createJsonOutput(result);
  } catch (error) {
    return createJsonOutput({
      error: "Internal server error",
      message: error.toString(),
    });
  }
}

// ========================================
// ENDPOINT HANDLERS
// ========================================

function getScores(month) {
  if (!month) {
    return { error: "Month parameter required" };
  }

  const cacheKey = `scores_${month}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = resolveSheetName(ss, month);
    const sheet = sheetName ? ss.getSheetByName(sheetName) : null;

    if (!sheet) {
      return {
        error: "Sheet not found",
        month: month,
        availableSheets: ss.getSheets().map((s) => s.getName()),
      };
    }

    const data = readSheetMatrix(sheet);
    const records = data.rows.map((row) => rowToRecord(row, data.headers));

    const response = {
      success: true,
      month: month,
      count: records.length,
      data: records,
      timestamp: new Date().toISOString(),
      cache: CACHE_DURATION,
    };

    setCachedData(cacheKey, response);
    return response;
  } catch (error) {
    return {
      error: "Failed to read sheet",
      message: error.toString(),
    };
  }
}

function getScoreByName(month, name) {
  if (!month || !name) {
    return { error: "Month and name parameters required" };
  }

  const cacheKey = `score_${month}_${slugify(name)}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetNames = month === 'Agustus26'
    ? ['Agustus26_Astra', 'Agustus26_Astri']
    : getSheetNameCandidates(month)
        .map((candidate) => resolveSheetName(ss, candidate))
        .filter((candidate, index, candidates) => candidate && candidates.indexOf(candidate) === index);
  let record = null;
  let resolvedMonth = month;

  for (const sheetName of sheetNames) {
    const allScores = getScores(sheetName);
    if (allScores.error) continue;
    record = allScores.data.find((r) => {
      const recordName = r.Panggilan || r.Panaggilan || r.Username || r.username || r.Nama;
      return recordName && recordName.toString().trim().toLowerCase() === name.toString().trim().toLowerCase();
    });
    if (record) {
      resolvedMonth = sheetName;
      break;
    }
  }

  if (!record) {
    return {
      error: "Member not found",
      name: name,
      month: month,
    };
  }

  const response = {
    success: true,
    month: resolvedMonth,
    name: name,
    data: record,
    timestamp: new Date().toISOString(),
    cache: CACHE_DURATION,
  };

  setCachedData(cacheKey, response);
  return response;
}

function getHistory(name, months = 3) {
  if (!name) {
    return { error: "Name parameter required" };
  }

  const cacheKey = `history_${slugify(name)}_${months}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const allSheets = ss
      .getSheets()
      .map((s) => s.getName())
      .filter((n) =>
        n.match(
          /^(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\d{2}(?:\d{2})?(?:_(?:Astra|Astri))?$/
        )
      )
      .map((n) => {
        const baseName = n.replace(/_(?:Astra|Astri)$/, '');
        const m = baseName.match(/^([A-Za-z]+)(\d{2})(\d{2})?$/);
        const year = m[3] ? parseInt(`${m[2]}${m[3]}`, 10) : parseInt(`20${m[2]}`, 10);
        return { name: n, m: monthIndex(m[1]), y: year };
      })
      .sort((a, b) => a.y - b.y || a.m - b.m)
      .slice(-months)
      .map((x) => x.name);

    const history = [];

    for (const sheetName of allSheets) {
      const scoreData = getScoreByName(sheetName, name);
      if (scoreData.success && scoreData.data) {
        history.push({
          month: sheetName,
          ...scoreData.data,
        });
      }
    }

    const response = {
      success: true,
      name: name,
      months: months,
      count: history.length,
      data: history,
      timestamp: new Date().toISOString(),
      cache: CACHE_DURATION,
    };

    setCachedData(cacheKey, response);
    return response;
  } catch (error) {
    return {
      error: "Failed to read history",
      message: error.toString(),
    };
  }
}

/**
 * Versi PUBLIK: dipanggil lewat web app (?path=members) dan dibaca browser.
 * Password TIDAK boleh ikut, karena endpoint ini bisa diakses siapa saja.
 */
function getMembers() {
  const cacheKey = "members_list_public_v2";
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const full = getMembersWithSecrets();
  if (!full.success) return full;

  const response = {
    ...full,
    data: full.data.map((member) => {
      const publicMember = { ...member };
      delete publicMember.password;
      return publicMember;
    }),
  };

  setCachedData(cacheKey, response);
  return response;
}

/**
 * Versi INTERNAL (ada password): hanya untuk dipakai di dalam Apps Script,
 * misalnya email blast. Jangan dipanggil dari doGet.
 */
function getMembersWithSecrets() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_METADATA);

    if (!sheet) {
      return { error: "Metadata sheet not found" };
    }

    const data = readSheetMatrix(sheet);
    const getFieldValue = (record, possibleKeys) => {
      for (const key of possibleKeys) {
        if (Object.prototype.hasOwnProperty.call(record, key)) {
          const value = record[key];
          if (value !== undefined && value !== null) {
            const trimmed = value.toString().trim();
            if (trimmed !== "") {
              return trimmed;
            }
          }
        }
      }
      return "";
    };

    const members = data.rows.map((row) => {
      const record = rowToRecord(row, data.headers);

      const username = (
        record.username ||
        record.Username ||
        record.Panggilan ||
        record.panggilan ||
        ""
      )
        .toString()
        .trim();
      const name = (record.Nama || record.nama || record.Name || "")
        .toString()
        .trim();
      const email = (record.email || record.Email || "").toString().trim();
      const password = (record.password || record.Password || "")
        .toString()
        .trim();
      const nim = getFieldValue(record, [
        "nim",
        "NIM",
        "Nim",
        "No NIM",
        "No. NIM",
        "Nomor Induk Mahasiswa",
      ]);
      const jurusan = getFieldValue(record, [
        "jurusan",
        "Jurusan",
        "Program Studi",
        "ProgramStudi",
        "Prodi",
        "Departemen",
        "Fakultas",
      ]);

      const member = {
        name: name,
        username: username,
        slug: slugify(username || name),
        panggilan: username,
        email: email,
        password: password,
        uid: "",
        role: "member",
      };

      if (nim) {
        member.nim = nim;
      }

      if (jurusan) {
        member.jurusan = jurusan;
      }

      return member;
    });

    const response = {
      success: true,
      count: members.length,
      data: members,
      timestamp: new Date().toISOString(),
      cache: CACHE_DURATION,
    };

    return response;
  } catch (error) {
    return {
      error: "Failed to read members",
      message: error.toString(),
    };
  }
}

function listAvailableMonthsWithLabels() {
  const cacheKey = "available_months_labels";
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    const availableSheets = ss
      .getSheets()
      .map((s) => s.getName())
      .filter((n) =>
        n.match(
          /^(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\d{2}(?:\d{2})?$/
        )
      );

    const academicMonths = [
      "Agustus26",
      "September26",
      "Oktober26",
      "November26",
      "Desember26",
      "Januari27",
      "Februari27",
      "Maret27",
      "April27",
      "Mei27",
    ];

    const months = academicMonths.map((monthKey) => ({
      value: monthKey,
      label: labelFromKey(monthKey),
      available:
        availableSheets.includes(monthKey) ||
      availableSheets.includes(longMonthKey(monthKey)) ||
        availableSheets.includes(`${monthKey}_Astra`) ||
        availableSheets.includes(`${monthKey}_Astri`),
    }));

    const response = {
      success: true,
      count: months.length,
      data: months,
      timestamp: new Date().toISOString(),
      cache: CACHE_DURATION,
    };

    setCachedData(cacheKey, response);
    return response;
  } catch (error) {
    return {
      error: "Failed to list months",
      message: error.toString(),
    };
  }
}

// ========================================
// KEHADIRAN (Kumsub & Program)
// ========================================

/**
 * GET ?path=attendance&month=Oktober26&name=<Panggilan>
 * Membaca sheet Kumsub_<Bulan> dan Program_<Bulan> dari spreadsheet kehadiran.
 */
function getAttendance(month, name) {
  if (!month || !name) {
    return { error: "Month and name parameters required" };
  }

  const cacheKey = `attendance_${month}_${slugify(name)}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const monthName = String(month).trim().replace(/\d+$/, "");
    const fullName = resolveFullName(name);
    const ss = SpreadsheetApp.openById(ATTENDANCE_SPREADSHEET_ID);

    const response = {
      success: true,
      month: month,
      name: name,
      fullName: fullName,
      points: ATTENDANCE_POINTS,
      timestamp: new Date().toISOString(),
      cache: CACHE_DURATION,
    };

    ATTENDANCE_SHEET_TYPES.forEach((type) => {
      const sheet = ss.getSheetByName(`${type}_${monthName}`);
      response[type.toLowerCase()] = sheet
        ? parseAttendanceSheet(sheet, fullName)
        : { available: false, found: false, entries: [], summary: summarizeAttendance([]) };
    });

    setCachedData(cacheKey, response);
    return response;
  } catch (error) {
    return {
      error: "Failed to read attendance",
      message: error.toString(),
    };
  }
}

function resolveFullName(name) {
  const target = normalizeName(name);
  const members = getMembers();
  if (members && members.success) {
    const member = members.data.find(
      (m) => normalizeName(m.username) === target || normalizeName(m.panggilan) === target
    );
    if (member && member.name) return member.name;
  }
  return String(name);
}

function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseAttendanceSheet(sheet, fullName) {
  const values = sheet.getDataRange().getDisplayValues();
  const lower = (v) => String(v || "").trim().toLowerCase();

  let headerIdx = -1;
  for (let i = 0; i < Math.min(values.length, 30); i += 1) {
    if (values[i].some((cell) => lower(cell) === "nama lengkap")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    return { available: false, found: false, entries: [], summary: summarizeAttendance([]) };
  }

  const header = values[headerIdx];
  const nameCol = header.findIndex((cell) => lower(cell) === "nama lengkap");
  const lpIdx = header.findIndex((cell) => lower(cell) === "l/p");
  const firstCol = lpIdx >= 0 ? lpIdx + 1 : nameCol + 4;

  // Sheet Program punya baris nama kegiatan tepat di bawah header tanggal
  const nextRow = values[headerIdx + 1] || [];
  const hasLabelRow = !String(nextRow[nameCol] || "").trim() && !String(nextRow[0] || "").trim();
  const labelRow = hasLabelRow ? nextRow : null;
  const dataStart = headerIdx + (hasLabelRow ? 2 : 1);

  const target = normalizeName(fullName);
  const row = values.slice(dataStart).find((r) => normalizeName(r[nameCol]) === target);
  if (!row) {
    return { available: true, found: false, entries: [], summary: summarizeAttendance([]) };
  }

  const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
  const entries = [];
  let lastDate = "";
  for (let c = firstCol; c < header.length; c += 1) {
    const headerValue = String(header[c] || "").trim();
    if (dateRegex.test(headerValue)) lastDate = headerValue;
    const code = String(row[c] || "").trim().toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(ATTENDANCE_POINTS, code)) continue;
    entries.push({
      date: dateRegex.test(headerValue) ? headerValue : lastDate,
      label: labelRow ? String(labelRow[c] || "").trim() : "",
      code: code,
      points: ATTENDANCE_POINTS[code],
    });
  }

  return { available: true, found: true, entries: entries, summary: summarizeAttendance(entries) };
}

function summarizeAttendance(entries) {
  const counts = {};
  Object.keys(ATTENDANCE_POINTS).forEach((code) => (counts[code] = 0));
  let total = 0;
  entries.forEach((entry) => {
    counts[entry.code] += 1;
    total += entry.points;
  });
  const max = entries.length * 5;
  return {
    count: entries.length,
    totalPoints: total,
    maxPoints: max,
    score: max > 0 ? Math.round((total / max) * 10000) / 100 : null,
    counts: counts,
  };
}

function testGetAttendance() {
  const result = getAttendance("Oktober26", "Hamdani");
  Logger.log(JSON.stringify(result, null, 2));
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getSheetNameCandidates(month) {
  const normalized = String(month || '').trim();
  const candidates = [normalized];

  // Terima dua format nama sheet: "Oktober26" <-> "Oktober2026"
  const shortMatch = normalized.match(/^([A-Za-z]+)(\d{2})$/);
  const longMatch = normalized.match(/^([A-Za-z]+)20(\d{2})$/);
  if (shortMatch) {
    candidates.push(`${shortMatch[1]}20${shortMatch[2]}`);
  } else if (longMatch) {
    candidates.push(`${longMatch[1]}${longMatch[2]}`);
  }

  return candidates;
}

function resolveSheetName(spreadsheet, month) {
  const candidates = getSheetNameCandidates(month);
  for (const candidate of candidates) {
    if (spreadsheet.getSheetByName(candidate)) {
      return candidate;
    }
  }
  return null;
}

function longMonthKey(monthKey) {
  const match = String(monthKey || '').match(/^([A-Za-z]+)(\d{2})$/);
  return match ? `${match[1]}20${match[2]}` : String(monthKey || '');
}

function readSheetMatrix(sheet) {
  const range = sheet.getDataRange();
  const values = range.getValues();

  if (values.length === 0) {
    return { headers: [], rows: [] };
  }

  // Agustus26_Astra/Astri use a multi-row header. Select the row that
  // contains the member identity columns instead of assuming row one.
  let headerIndex = 0;
  for (let index = 0; index < Math.min(values.length, 10); index += 1) {
    const row = values[index].map((value) => String(value || '').trim().toLowerCase());
    if (row.includes('panggilan') || row.includes('panaggilan') || row.includes('username')) {
      headerIndex = index;
      break;
    }
  }

  const headers = values[headerIndex].map((header) => {
    const normalized = String(header || '').trim();
    const compact = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (normalized === 'Nama Lengkap') return 'Nama';
    if (compact === 'panggilan' || compact === 'panaggilan' || compact === 'username') {
      return 'Panggilan';
    }
    return normalized;
  });
  const rows = values.slice(headerIndex + 1).filter((row) =>
    row.some((value) => String(value || '').trim() !== '')
  );

  return { headers, rows };
}

function rowToRecord(row, headers) {
  const record = {};

  headers.forEach((header, index) => {
    record[header] = row[index] !== undefined ? row[index] : null;
  });

  return record;
}

function slugify(str) {
  if (!str) return "";

  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function monthIndex(mon) {
  return MONTHS_ID.indexOf(mon);
}

function labelFromKey(key) {
  if (key === undefined || key === null) {
    return "";
  }

  const normalized = String(key).trim();
  if (!normalized) {
    return "";
  }

  const m = normalized.match(/^([A-Za-z]+)(\d{2})$/);
  if (!m) return normalized;
  return `${m[1]} 20${m[2]}`;
}

// ========================================
// CACHE FUNCTIONS
// ========================================

function getCachedData(key) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      return null;
    }
  }

  return null;
}

function setCachedData(key, data) {
  const cache = CacheService.getScriptCache();
  cache.put(key, JSON.stringify(data), CACHE_DURATION);
}

// ========================================
// REVALIDATION HELPERS
// ========================================

function normalizeBooleanParam(value, defaultValue) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = value.toString().trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].indexOf(normalized) !== -1) {
    return true;
  }
  if (["false", "0", "no", "n", "off"].indexOf(normalized) !== -1) {
    return false;
  }

  return defaultValue;
}

function bytesToHex(bytes) {
  return bytes
    .map(function (byte) {
      const value = byte < 0 ? byte + 256 : byte;
      const hex = value.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("");
}

function getRevalidateConfig() {
  const props = PropertiesService.getScriptProperties();
  const endpointProp = props
    ? props.getProperty(SCRIPT_PROP_REVALIDATE_ENDPOINT)
    : null;
  const secretProp = props
    ? props.getProperty(SCRIPT_PROP_REVALIDATE_SECRET)
    : null;

  const endpoint = (endpointProp || DEFAULT_REVALIDATE_ENDPOINT || "").trim();
  const secret = (secretProp || DEFAULT_REVALIDATE_SECRET || "").toString();

  return {
    endpoint: endpoint,
    secret: secret,
    enabled: endpoint !== "" && secret !== "",
    defaultPrewarm: DEFAULT_REVALIDATE_PREWARM,
  };
}

function triggerRevalidateDashboard(month, slug, options) {
  if (!month) {
    return {
      success: false,
      error: "Month parameter required",
    };
  }

  const config = getRevalidateConfig();
  if (!config.enabled) {
    return {
      success: false,
      skipped: true,
      reason: "Revalidate endpoint not configured",
      month: month,
      slug: slug || "",
    };
  }

  const normalizedMonth = month.toString().trim();
  const normalizedSlug = slug ? slug.toString().trim() : "";
  const issuedAt = Math.floor(Date.now() / 1000);
  const prewarm =
    options && Object.prototype.hasOwnProperty.call(options, "prewarm")
      ? options.prewarm
      : config.defaultPrewarm;
  const reason = options && options.reason ? options.reason : "manual-trigger";

  const payload = {
    month: normalizedMonth,
    issuedAt: issuedAt,
    prewarm: Boolean(prewarm),
  };

  if (normalizedSlug) {
    payload.slug = normalizedSlug;
  }

  if (reason) {
    payload.reason = reason;
  }

  const signatureBase = `${normalizedMonth}:${normalizedSlug}:${issuedAt}`;
  const signatureBytes = Utilities.computeHmacSha256Signature(
    signatureBase,
    config.secret
  );
  payload.signature = bytesToHex(signatureBytes).toLowerCase();

  const requestInit = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    followRedirects: true,
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(config.endpoint, requestInit);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText() || "";
    let parsedResponse = null;

    if (responseText) {
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        parsedResponse = responseText;
      }
    }

    const success = statusCode >= 200 && statusCode < 300;
    if (!success) {
      Logger.log(
        `⚠️ Revalidate request returned status ${statusCode}: ${responseText}`
      );
    }

    return {
      success: success,
      status: statusCode,
      month: normalizedMonth,
      slug: normalizedSlug || null,
      endpoint: config.endpoint,
      payload: payload,
      response: parsedResponse,
    };
  } catch (error) {
    Logger.log(`❌ Revalidate request failed: ${error}`);
    return {
      success: false,
      error: "RevalidateFetchFailed",
      message: error.toString(),
      month: normalizedMonth,
      slug: normalizedSlug || null,
    };
  }
}

// ========================================
// EMAIL BLAST FUNCTIONS
// ========================================

function sendMonthlyRapor(month) {
  if (!month) {
    return { error: "Month parameter required" };
  }

  try {
    const members = getMembersWithSecrets();

    if (!members.success) {
      return { error: "Failed to get members list" };
    }

    const scores = getScores(month);

    if (!scores.success) {
      return { error: "Failed to get scores" };
    }

    const results = {
      success: true,
      month: month,
      total: 0,
      sent: 0,
      failed: 0,
      errors: [],
    };

    members.data.forEach((member) => {
      if (!member.email || member.role === "coach") {
        return;
      }

      results.total++;

      Logger.log(
        `Preparing email → name: ${member.name || "(tanpa nama)"}, username: ${
          member.username || member.panggilan || "-"
        }, email: ${member.email || "(tanpa email)"}`
      );

      const memberScore = scores.data.find(
        (s) =>
          s.Panggilan &&
          s.Panggilan.toLowerCase() === (member.panggilan || "").toLowerCase()
      );

      if (!memberScore) {
        Logger.log(
          `⚠️ Tidak menemukan nilai untuk ${member.name} pada bulan ${month}`
        );
        results.failed++;
        results.errors.push(`No score found for ${member.name}`);
        return;
      }

      try {
        const emailSent = sendRaporEmail(member, memberScore, month);

        if (emailSent) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`Failed to send to ${member.email}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Error sending to ${member.email}: ${error.toString()}`
        );
      }
    });

    Logger.log(
      `Selesai broadcast bulan ${month}: ${JSON.stringify(results, null, 2)}`
    );

    try {
      results.revalidate = triggerRevalidateDashboard(month, null, {
        reason: "monthly-email-blast",
        prewarm: true,
      });
    } catch (revalidateError) {
      const message =
        revalidateError && revalidateError.toString
          ? revalidateError.toString()
          : String(revalidateError);
      Logger.log(`❌ Revalidate trigger exception: ${message}`);
      results.revalidate = {
        success: false,
        error: "RevalidateTriggerException",
        message: message,
      };
    }

    return results;
  } catch (error) {
    return {
      error: "Email blast failed",
      message: error.toString(),
    };
  }
}

function sendRaporEmail(member, score, month) {
  if (!member) {
    Logger.log("sendRaporEmail called without valid member data");
    return false;
  }

  const baseUrl = "https://rapor-asrama.salmanitb.site/";
  const campaignValue = month ? encodeURIComponent(month) : "latest";
  const loginUrl = `${baseUrl}?utm_source=email&utm_medium=rapor&utm_campaign=${campaignValue}`;

  const monthLabel = labelFromKey(month) || "Periode Terbaru";
  const subject = `Rapor Asrama ${monthLabel}`;

  const username = (member.username || member.panggilan || member.name || "")
    .toString()
    .trim();
  const password =
    (member.password || member.Password || "(hubungi coach)")
      .toString()
      .trim() || "(hubungi coach)";
  const useraccount = username
    ? username.charAt(0).toLowerCase() + username.slice(1)
    : "";

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Rapor Asrama ${monthLabel}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');
        body { font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; line-height: 1.7; color: #1f2933; background: #f5f0e6; margin: 0; padding: 0; }
  .wrapper { max-width: 640px; margin: 0 auto; padding: 24px 16px; }
  .card { background: #fffbf4 !important; border-radius: 16px; box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08); overflow: hidden; color-scheme: light only; }
  .hero { padding: 0; background: #fffbf4 !important; border-bottom: 1px solid #e5dcc7; color-scheme: light only; }
  .hero img { display: block; width: 100%; height: auto; }
  .content { padding: 32px; }
  .content h1 { margin: 0 0 8px; font-size: 26px; color: #111827; letter-spacing: 0.4px; }
  .content .subtitle { margin: 0 0 24px; color: #4b5563; font-size: 16px; }
        .content p { margin: 0 0 16px; }
        .cta { display: inline-block; background: #0f416d; color: #f5f0e6 !important; padding: 12px 28px; border-radius: 16px; font-weight: 600; text-decoration: none; margin: 16px 0 24px; box-shadow: 0 10px 20px rgba(79, 70, 229, 0.25); }
        .credentials { background: #f3f4ff; border: 1px solid #e5e7ff; padding: 16px 20px; border-radius: 12px; margin: 8px 0 24px; }
        .credentials strong { color: #1f2937; display: inline-block; width: 90px; }
  .footer { background: #f4ede2; padding: 20px 24px; text-align: center; font-size: 13px; color: #4b4f58; }
      </style>
    </head>
    <body>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1e293b;padding:24px 0;">
      <div class="wrapper">
        <div class="card">
          <div class="content">
            <h1>Rapor Asrama ${monthLabel}</h1>
            <p>Halo, <strong>${username}</strong>! ( ◜ ‿ ◝ )</p>
            <p>Apa kabarrr? Semoga kamu senantiasa sehat, bahagia, dan berada dalam lindungan Allah SWT, yaa.</p>
            <p>Alhamdulillah rapor asrama untuk bulan <strong>${monthLabel}</strong> sudah tersedia yaa!</p>
            <p>Rapor ini menjadi salah satu bentuk feedback dan evaluasi atas perjalananmu selama satu bulan terakhir. Semoga hasilnya bisa menjadi bahan refleksi, penyemangat untuk terus bertumbuh, dan pengingat bahwa selalu ada ruang untuk menjadi lebih baik dari hari ke hari.</p>
            <p>Kamu bisa lihat rapor performa berasramamu melalui link berikut:</p>
            <p style="text-align: center;">
              <a class="cta" href="${loginUrl}" target="_blank" rel="noopener">Dashboard Rapor Asrama</a>
            </p>
            <p>Gunakan akunmu untuk login:</p>
            <div class="credentials">
              <div><strong>Username:</strong> ${useraccount}</div>
              <div><strong>Password:</strong> ${password}</div>
            </div>
            <p style="color: #b91c1c; font-weight: 600;">⚠️ Harap menjaga kerahasiaan akun dan password ini. Password bersifat pribadi dan tidak boleh dibagikan kepada siapa pun.</p>
            <p>Apa pun hasil yang kamu dapatkan bulan ini, semoga bisa menjadi bekal untuk melangkah lebih baik di bulan berikutnya. Tetap semangat berproses, jangan lupa mengapresiasi setiap progres kecilmu, dan terus libatkan Allah dalam setiap langkahmu.</p>
            <p>Semoga Allah mudahkan setiap urusanmu, berkahi proses bertumbuhmu, dan jadikan setiap usaha kecilmu bernilai kebaikan di sisi-Nya. Aamiin yaa Rabbal 'aalamiin. 🤲🏻</p>
            <p style="margin-top: 24px;">Have a nice dayy &lt;3</p>
            <p style="margin-top: 24px;">Wassalamu’alaikum warahmatullahi wabarakatuh.</p>
            <p style="margin-top: 24px;">With love,<br><strong>Coach Asrama 26/27 ^^</strong></p>
          </div>
          <div class="footer">
            Email otomatis – mohon tidak membalas email ini.<br>
            © ${new Date().getFullYear()} Asrama Salman ITB
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const plainBody = `Halo, ${username}! ( ◜ ‿ ◝ )

Apa kabarrr? Semoga kamu senantiasa sehat, bahagia, dan berada dalam lindungan Allah SWT, yaa.

Alhamdulillah rapor asrama untuk bulan ${monthLabel} sudah tersedia yaa!

Rapor ini menjadi salah satu bentuk feedback dan evaluasi atas perjalananmu selama satu bulan terakhir. Semoga hasilnya bisa menjadi bahan refleksi, penyemangat untuk terus bertumbuh, dan pengingat bahwa selalu ada ruang untuk menjadi lebih baik dari hari ke hari.

Kamu bisa lihat rapor performa berasramamu melalui link berikut:
${loginUrl}

Gunakan akunmu untuk login:
- Username: ${useraccount}
- Password: ${password}

⚠️ Harap menjaga kerahasiaan akun dan password ini.
Password bersifat pribadi dan tidak boleh dibagikan kepada siapa pun.

Apa pun hasil yang kamu dapatkan bulan ini, semoga bisa menjadi bekal untuk melangkah lebih baik di bulan berikutnya. Tetap semangat berproses, jangan lupa mengapresiasi setiap progres kecilmu, dan terus libatkan Allah dalam setiap langkahmu.

Semoga Allah mudahkan setiap urusanmu, berkahi proses bertumbuhmu, dan jadikan setiap usaha kecilmu bernilai kebaikan di sisi-Nya. Aamiin yaa Rabbal 'aalamiin. 🤲🏻

Have a nice dayy <3

Wassalamu’alaikum warahmatullahi wabarakatuh.

With love,
Coach Asrama 26/27 ^^

--
Email otomatis – mohon tidak membalas email ini.`;

  try {
    Logger.log(`Mengirim email ke ${member.email} untuk bulan ${monthLabel}`);
    MailApp.sendEmail({
      to: member.email,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: "Coach Asrama Salman ITB",
    });

    Logger.log(`✅ Email terkirim ke ${member.email}`);

    return true;
  } catch (error) {
    Logger.log(`Failed to send email to ${member.email}: ${error.toString()}`);
    return false;
  }
}

// ========================================
// MANUAL TESTING FUNCTIONS
// ========================================

function testGetScores() {
  const result = getScores("Oktober26");
  Logger.log(JSON.stringify(result, null, 2));
}

function testGetScoreByName() {
  const result = getScoreByName("Oktober26", "John");
  Logger.log(JSON.stringify(result, null, 2));
}

function testGetHistory() {
  const result = getHistory("John", 3);
  Logger.log(JSON.stringify(result, null, 2));
}

function testGetMembers() {
  const result = getMembers();
  Logger.log(JSON.stringify(result, null, 2));
}

function testSendEmail() {
  const members = getMembersWithSecrets();
  if (members.success && members.data.length > 0) {
    const testMember = members.data[0];
    const scores = getScores("Oktober26");
    if (scores.success && scores.data.length > 0) {
      const result = sendRaporEmail(testMember, scores.data[0], "Oktober26");
      Logger.log("Email sent: " + result);
    }
  }
}

function testEmailBlast() {
  const result = sendMonthlyRapor("Oktober26");
  Logger.log(JSON.stringify(result, null, 2));
}

function testSendEmailToAqeela() {
  const targetMonth = "Oktober26";
  const targetEmail = "aqeelaamin25@gmail.com";

  const members = getMembersWithSecrets();
  if (!members.success) {
    Logger.log("Failed to load members: " + JSON.stringify(members));
    return;
  }

  const normalizedTarget = targetEmail.trim().toLowerCase();
  const member = members.data.find(
    (m) => (m.email || "").trim().toLowerCase() === normalizedTarget
  );

  if (!member) {
    Logger.log(`Member with email ${targetEmail} not found.`);
    return;
  }

  const scoreResponse = getScoreByName(targetMonth, member.username);
  const scoreData = scoreResponse.success ? scoreResponse.data : {};

  const sent = sendRaporEmail(member, scoreData, targetMonth);
  Logger.log(`Email sent to ${targetEmail}: ${sent}`);
}
