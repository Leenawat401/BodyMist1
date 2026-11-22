/* ==========================================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   ทำงานตาม element ที่พบในหน้านั้นๆ:
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     Config
     ------------------------------------------------------------------------ */
  var PRODUCTS_URL = 'products.json';

  var ORDER_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbz1qX3Z7Uv-bruoGy1SAJhvbGo3b8B_44PNLWMIDqveyuUw3uTcOjhvGZcfzKqaoyb3/exec';

  var ORDERS_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vQwbhGpTQeGGXR3oURsXgQ6vz1fohe25kErhsKeL-tN-tdbH5WkuSM4_iejx-u8BBEMDB-PEfFRBO-a/pub?gid=0&single=true&output=csv';

  var MOODS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'fresh', label: 'Fresh' },
    { key: 'sweet', label: 'Sweet' },
    { key: 'confident', label: 'Confident' },
    { key: 'romance', label: 'Romance' }
  ];

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function formatPrice(value) {
    var n = Number(value);
    return isNaN(n) ? String(value) : n.toLocaleString('th-TH');
  }

  /* ========================================================================
     1) product.html — โหลดสินค้า, การ์ด, ตัวกรอง mood
     ======================================================================== */
  function initProductPage() {
    var filterBar = $('#filter-bar');
    var listEl = $('#product-list');
    if (!filterBar || !listEl) return;

    var products = [];
    var currentMood = 'all';

    function isValidMood(m) {
      return MOODS.some(function (x) { return x.key === m; });
    }

    // ---- ปุ่มกรอง ----
    function renderFilters() {
      filterBar.innerHTML = '';
      MOODS.forEach(function (m) {
        var btn = el('button', 'filter-btn');
        btn.type = 'button';
        btn.dataset.mood = m.key;

        if (m.key !== 'all') {
          // data-mood บน wrapper ทำให้ .mood-dot ใช้สีของ mood นั้น
          var dotWrap = el('span');
          dotWrap.dataset.mood = m.key;
          dotWrap.appendChild(el('span', 'mood-dot'));
          btn.appendChild(dotWrap);
        }
        btn.appendChild(document.createTextNode(m.label));

        btn.addEventListener('click', function () {
          setMood(m.key, true);
        });
        filterBar.appendChild(btn);
      });
    }

    function updateFilterState() {
      var buttons = filterBar.querySelectorAll('.filter-btn');
      Array.prototype.forEach.call(buttons, function (btn) {
        var active = btn.dataset.mood === currentMood;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    // ---- การ์ดสินค้า ----
    function buildOrderUrl(p) {
      var itemName = p.size ? p.name + ' ' + p.size : p.name;
      var params = new URLSearchParams({ item: itemName, price: String(p.price) });
      return 'order.html?' + params.toString();
    }

    function buildCard(p) {
      var card = el('article', 'product-card');
      card.dataset.mood = p.mood;

      var media = el('div', 'product-card__media');
      var img = el('img');
      img.src = p.image;
      img.alt = p.name;
      img.loading = 'lazy';
      img.addEventListener('error', function () {
        img.style.visibility = 'hidden';
      });
      media.appendChild(img);

      var body = el('div', 'product-card__body');

      var meta = el('div', 'product-card__meta');
      meta.appendChild(el('span', 'mood-dot'));
      meta.appendChild(
        el('span', null, p.size ? p.size : p.type === 'rollon' ? 'โรลออน' : '')
      );

      var title = el('h3', 'product-card__title', p.name);

      var footer = el('div', 'product-card__footer');
      var price = el('span', 'price', formatPrice(p.price));
      price.appendChild(el('small', null, 'บาท'));

      var buy = el('a', 'btn btn--accent', 'สั่งซื้อ');
      buy.href = buildOrderUrl(p);

      footer.appendChild(price);
      footer.appendChild(buy);

      body.appendChild(meta);
      body.appendChild(title);
      body.appendChild(footer);

      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    function renderProducts() {
      listEl.innerHTML = '';
      var shown = products.filter(function (p) {
        return currentMood === 'all' || p.mood === currentMood;
      });

      if (!shown.length) {
        listEl.appendChild(el('p', 'text-muted', 'ไม่พบสินค้าในหมวดนี้'));
        return;
      }
      shown.forEach(function (p) {
        listEl.appendChild(buildCard(p));
      });
    }

    function setMood(mood, updateUrl) {
      currentMood = isValidMood(mood) ? mood : 'all';
      updateFilterState();
      renderProducts();

      if (updateUrl && window.history && history.replaceState) {
        var url = new URL(window.location.href);
        if (currentMood === 'all') {
          url.searchParams.delete('mood');
        } else {
          url.searchParams.set('mood', currentMood);
        }
        history.replaceState(null, '', url.toString());
      }
    }

    // ---- เริ่มทำงาน ----
    renderFilters();
    listEl.appendChild(el('p', 'text-muted', 'กำลังโหลดสินค้า...'));

    fetch(PRODUCTS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        products = Array.isArray(data) ? data : [];
        var moodParam = (new URLSearchParams(window.location.search).get('mood') || '')
          .toLowerCase();
        setMood(moodParam, false); // กรองอัตโนมัติจาก ?mood=xxx
      })
      .catch(function (error) {
        console.error(error);
        listEl.innerHTML = '';
        listEl.appendChild(
          el('p', 'text-muted', 'โหลดข้อมูลสินค้าไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง')
        );
      });
  }

  /* ========================================================================
     2) order.html — เติมฟอร์มจาก URL และส่งออเดอร์
     ======================================================================== */
  function initOrderPage() {
    var form = $('#orderForm');
    if (!form) return;

    var itemsInput = $('#items');
    var totalInput = $('#total');

    // ---- เติมค่าจาก URL parameter ทันทีที่โหลดหน้า ----
    var params = new URLSearchParams(window.location.search);
    var item = params.get('item');
    var price = params.get('price');

    if (item && itemsInput) {
      itemsInput.value = item;
    }
    if (price && totalInput) {
      var priceNum = Number(price);
      totalInput.value = isNaN(priceNum) ? price : String(priceNum);
    }

    // ---- ส่งออเดอร์ ----
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;

      var payload = {
        customerName: $('#customerName').value.trim(),
        contact: $('#contact').value.trim(),
        items: itemsInput.value.trim(),
        total: totalInput.value.trim(),
        note: $('#note') ? $('#note').value.trim() : ''
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(ORDER_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(() => { window.location.href = 'thankyou.html'; })
      .catch(error => {
        console.error(error);
        if (submitBtn) submitBtn.disabled = false;
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      });
    });
  }

  /* ========================================================================
     3) admin.html — ตารางออเดอร์จาก Google Sheets (CSV)
     ======================================================================== */

  // parse CSV เอง: รองรับ "ข้อความมี, คอมมา", "" (quote ซ้อน), ขึ้นบรรทัดใหม่ใน cell, CRLF, BOM
  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, '');
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }

    // ตัดแถวว่างทิ้ง
    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ''; });
    });
  }

  // แปลงวันเวลาจาก Sheet เป็น ms (order = 'dmy' | 'mdy')
  function parseTimestamp(str, order) {
    var m = String(str || '').match(
      /^\s*(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );
    if (!m) return NaN;

    var a = +m[1], b = +m[2], c = +m[3];
    var year, month, day;

    if (m[1].length === 4) {          // YYYY-MM-DD
      year = a; month = b; day = c;
    } else if (order === 'mdy') {     // MM/DD/YYYY
      month = a; day = b; year = c;
    } else {                          // DD/MM/YYYY
      day = a; month = b; year = c;
    }
    if (year > 2400) year -= 543;     // ปี พ.ศ.

    return new Date(
      year, month - 1, day,
      +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)
    ).getTime();
  }

  // ถ้ามีค่าที่ "ช่องที่ 2" > 12 แปลว่ารูปแบบเป็น เดือน/วัน/ปี ไม่งั้นถือว่า วัน/เดือน/ปี
  function detectDateOrder(rows) {
    for (var i = 0; i < rows.length; i++) {
      var m = String(rows[i][0] || '').match(/^\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.]\d{2,4}/);
      if (m && +m[2] > 12) return 'mdy';
    }
    return 'dmy';
  }

  function initAdminPage() {
    var tbody = $('#ordersTable tbody');
    if (!tbody) return;

    var COLS = 6;

    function showMessage(text) {
      tbody.innerHTML = '';
      var tr = el('tr');
      var td = el('td', 'text-muted', text);
      td.colSpan = COLS;
      td.style.textAlign = 'center';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    showMessage('กำลังโหลดข้อมูล...');

    fetch(ORDERS_CSV_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);
        if (!rows.length) {
          showMessage('ยังไม่มีรายการสั่งซื้อ');
          return;
        }

        var order = detectDateOrder(rows);

        // ข้ามแถวหัวตาราง (ถ้าคอลัมน์แรกไม่ใช่วันที่)
        if (isNaN(parseTimestamp(rows[0][0], order))) rows.shift();

        if (!rows.length) {
          showMessage('ยังไม่มีรายการสั่งซื้อ');
          return;
        }

        // ล่าสุดขึ้นก่อน: เรียงตามวันเวลา ถ้าเท่ากัน/อ่านไม่ได้ ให้แถวที่อยู่ล่างกว่า (ใหม่กว่า) ขึ้นก่อน
        var indexed = rows.map(function (r, i) {
          return { row: r, time: parseTimestamp(r[0], order), index: i };
        });
        indexed.sort(function (x, y) {
          var tx = isNaN(x.time) ? -Infinity : x.time;
          var ty = isNaN(y.time) ? -Infinity : y.time;
          if (tx !== ty) return ty > tx ? 1 : -1;
          return y.index - x.index;
        });

        var labels = ['วันเวลา', 'ชื่อลูกค้า', 'เบอร์โทร/Line', 'รายการสินค้า', 'จำนวนเงินรวม', 'หมายเหตุ'];

        tbody.innerHTML = '';
        indexed.forEach(function (entry) {
          var tr = el('tr');
          for (var c = 0; c < COLS; c++) {
            var value = entry.row[c] !== undefined ? entry.row[c] : '';
            // textContent ป้องกัน HTML/script ที่ลูกค้าพิมพ์เข้ามา
            var td = el('td', null, c === 4 && value !== '' ? formatPrice(value) : value);
            td.dataset.label = labels[c];
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (error) {
        console.error(error);
        showMessage('โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง');
      });
  }

  /* ------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------ */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
