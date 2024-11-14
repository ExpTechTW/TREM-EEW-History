let eq_data = [];
let trem_data = [];
let month_data = [];
let current_data = [];
let Ints = [];
let currentPage = 1;
const pageSize = 500;

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());

// dev mode
const checkbox = document.getElementById("checkbox");
const dev_mode = document.getElementById("dev_mode");
if (params.dev) checkbox.checked = true;

dev_mode.addEventListener("click", () => {
  checkbox.click();
  if (checkbox.checked) urlSearchParams.set("dev", true);
  else urlSearchParams.delete("dev");
  const newUrl = `${window.location.pathname}?${urlSearchParams.toString()}`;
  history.replaceState(null, "", newUrl);
  window.location.reload();
});

async function start() {
  showLoading();
  await fetchEqData();
  await fetchTREMData();
  await fetchMonthData();

  let data;
  if (!params.time) {
    data = trem_data;
  } else {
    data = await fetchSpecifyMonthData(params.time);
  }

  data.forEach((Int) => {
    Ints.push(Int.Max);
  });

  populateMagnitudeFilter(Ints);

  current_data = data;
  eew_table(current_data);
  // get month
  month_btn();

  const month_button = document.getElementById(params.time);
  if (params.time) month_button.classList.add("active");

  hideLoading();
}
start();

function month_btn() {
  const month_ = document.getElementById("month");
  let row = document.createElement("tr");
  let cellCount = 0;

  const allMonths = Array(12).fill(null);

  month_data.forEach((month) => {
    const [year, monthNumber] = month["year-month"].split("-").map(Number);
    allMonths[monthNumber - 1] = month;
  });

  allMonths.forEach((month, index) => {
    const cell = document.createElement("td");

    if (month) {
      const link = document.createElement("a");
      const day = month["year-month"];
      cell.id = `${month["year-month"]}`;
      link.textContent = `${month["year-month"]} (${month.count})`;
      cell.appendChild(link);

      cell.addEventListener("click", async () => {
        if (cell.classList.contains("active")) {
          cell.classList.remove("active");
          params.time = "";
          const newUrl = `${window.location.pathname}`;
          history.replaceState(null, "", newUrl);
          window.location.reload();
          return;
        }

        const clickedCell = cell;

        const activeCells = document.querySelectorAll(".active");
        activeCells.forEach((cell) => {
          cell.classList.remove("active");
        });

        clickedCell.classList.add("active");

        const sp_month_data = await fetchSpecifyMonthData(day);
        urlSearchParams.set("time", day);
        const newUrl = `${
          window.location.pathname
        }?${urlSearchParams.toString()}`;
        history.replaceState(null, "", newUrl);
        window.location.reload();
      });
    }

    row.appendChild(cell);
    cellCount++;

    if (cellCount === 12) {
      month_.getElementsByTagName("tbody")[0].appendChild(row);
      row = document.createElement("tr");
      cellCount = 0;
    }
  });

  if (cellCount > 0) {
    while (cellCount < 12) {
      const emptyCell = document.createElement("td");
      row.appendChild(emptyCell);
      cellCount++;
    }
    month_.getElementsByTagName("tbody")[0].appendChild(row);
  }
}

function showLoading() {
  document.getElementById("loading").style.display = "block";
}

function hideLoading() {
  document.getElementById("loading").style.display = "none";
}

function eew_table(data) {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(currentPage * pageSize, data.length);

  document.getElementById("body").innerHTML = "";

  for (let i = startIndex; i < endIndex; i++) {
    const trem = data[i];
    const box = document.createElement("tr");

    let eq = null;
    let hide = false;
    if (trem.Cwa_id) eq = searchEq(trem.Cwa_id);

    const index = document.createElement("td");
    index.textContent = i + 1;
    const link = document.createElement("a");
    link.href = `https://${URL_MAIN}/file/trem_info.html?id=${trem.ID}&key=${params.key}`;
    link.textContent = formatTime(Number(trem.ID))
      .replaceAll("/", "")
      .replaceAll(":", "")
      .replace(" ", "");
    const id = document.createElement("td");
    id.append(link);
    const source = document.createElement("td");
    source.textContent = `TREM(${trem.Source})`;
    const serial = document.createElement("td");
    serial.textContent = trem.Serial;
    const alert_time = document.createElement("td");
    alert_time.textContent = formatTime(Number(trem.ID));
    const eq_time = document.createElement("td");
    eq_time.textContent = trem.Cancel
      ? "取消"
      : trem.False_alarm
      ? "誤報"
      : trem.False_alarm == null
      ? "調查中..."
      : eq
      ? formatTime(eq.time)
      : "未知";
    if (trem.Cancel || trem.False_alarm || trem.False_alarm == null)
      hide = true;
    if (hide) eq_time.colSpan = 9;
    const loc = document.createElement("td");
    loc.textContent = trem.Loc;
    const lat = document.createElement("td");
    lat.textContent = trem.Mag == 1 ? "NSSPE 假設震源參數" : trem.Lat;
    if (trem.Mag == 1) lat.colSpan = 4;
    const lon = document.createElement("td");
    lon.textContent = trem.Lon;
    const depth = document.createElement("td");
    depth.textContent = `${Number(trem.Depth)}km`;
    const mag = document.createElement("td");
    mag.textContent = `M ${Number(trem.Mag).toFixed(1)}`;
    const EI = document.createElement("td");
    EI.textContent = trem.Max ? int_to_intensity(trem.Max) : "不明";
    if (trem.Max) EI.className = `intensity-${trem.Max}`;
    const AI = document.createElement("td");
    AI.textContent = eq ? int_to_intensity(eq.int) : "未知";
    if (eq) AI.className = `intensity-${eq.int}`;
    const lpgm = document.createElement("td");
    lpgm.textContent = trem.Lpgm != null ? trem.Lpgm : "調查中...";
    if (trem.Lpgm != null) lpgm.className = `lpgm-${trem.Lpgm}`;
    const alarm = document.createElement("td");
    alarm.textContent = trem.Alarm ? "TRUE" : "";

    box.append(index);
    box.append(id);
    box.append(source);
    box.append(serial);
    box.append(alert_time);
    box.append(eq_time);
    if (!hide) box.append(loc);
    if (!hide) box.append(lat);
    if (!hide && trem.Mag != 1) box.append(lon);
    if (!hide && trem.Mag != 1) box.append(depth);
    if (!hide && trem.Mag != 1) box.append(mag);
    if (!hide) box.append(EI);
    if (!hide) box.append(AI);
    if (!hide) box.append(lpgm);
    box.append(alarm);

    if (params.dev || trem.Alarm)
      document.getElementById("body").appendChild(box);
  }

  document.getElementById("currentPage").textContent = currentPage;
  document.getElementById("totalPages").textContent = Math.ceil(
    data.length / pageSize
  );
}

function populateMagnitudeFilter(data) {
  const magnitudeFilter = document.getElementById("magnitudeFilter");
  const uniqueMagnitudes = new Set();

  data.forEach((item) => {
    if (!isNaN(item)) {
      uniqueMagnitudes.add(int_to_intensity(item));
    }
  });

  const sortedMagnitudes = Array.from(uniqueMagnitudes).sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    } else {
      return a.localeCompare(b);
    }
  });

  sortedMagnitudes.forEach((ints) => {
    const option = document.createElement("option");
    option.value = ints;
    option.textContent = ints;
    magnitudeFilter.appendChild(option);
  });
}

function searchEq(id) {
  for (const eq of eq_data) {
    if (eq.id == id) return eq;
  }
}

async function fetchEqData() {
  try {
    const res = await fetch(
      `https://${URL_MAIN}/api/v2/eq/report?limit=50&key=${params.key}`
    );
    eq_data = await res.json();
  } catch (err) {
    console.log(err);
  }
}

async function fetchTREMData() {
  try {
    const res = await fetch(
      `https://${URL_MAIN}/api/v1/trem/list?key=${params.key}`
    );
    trem_data = await res.json();
  } catch (err) {
    console.log(err);
  }
}

async function fetchMonthData() {
  try {
    const res = await fetch(`https://${URL_MAIN}/api/v1/trem/month`);
    month_data = await res.json();
  } catch (err) {
    console.log(err);
  }
}

async function fetchSpecifyMonthData(d) {
  try {
    const res = await fetch(`https://${URL_MAIN}/api/v1/trem/month/${d}`);
    return res.json();
  } catch (err) {
    console.log(err);
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

const intensity_list = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5弱",
  "5強",
  "6弱",
  "6強",
  "7",
];

function int_to_intensity(int) {
  return intensity_list[int];
}

document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    eew_table(current_data);
    filterAndDisplayData();
  }
});

document.getElementById("nextPage").addEventListener("click", () => {
  const maxPage = Math.ceil(current_data.length / pageSize);
  if (currentPage < maxPage) {
    currentPage++;
    eew_table(current_data);
    filterAndDisplayData();
  }
});

const topButton = document.getElementById("topButton");

window.onscroll = function () {
  scrollFunction();
};

function scrollFunction() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    topButton.style.display = "block";
  } else {
    topButton.style.display = "none";
  }
}

topButton.addEventListener("click", function () {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

document.getElementById("openButton").addEventListener("click", function () {
  var menu = document.getElementById("pagination");
  if (menu.classList.contains("open")) {
    menu.classList.remove("open");
  } else {
    menu.classList.add("open");
  }
});

document
  .getElementById("magnitudeFilter")
  .addEventListener("change", function () {
    filterAndDisplayData();
  });

function filterAndDisplayData() {
  const magnitudeFilter = document.getElementById("magnitudeFilter").value;
  let filteredData = current_data;

  if (magnitudeFilter) {
    filteredData = current_data.filter(
      (item) => int_to_intensity(item.Max) === magnitudeFilter
    );
  }

  eew_table(filteredData);
}
