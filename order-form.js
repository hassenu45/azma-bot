// ===== قائمة المحافظات والمناطق الأردنية =====
var jordanData = {
  'عمان': ['عبدون', 'الدوار السابع', 'الدوار الثامن', 'الجبيهة', 'شفا بدران', 'طبربور', 'خلدا', 'دابوق', 'صويلح', 'ماركا', 'نزول', 'المقابلين', 'اليادودة', 'بيادر وادي السير', 'الرابية', 'الشميساني', 'جبل الحسين', 'جبل عمان', 'العبدلي', 'الصويفية', 'دير غبار'],
  'اربد': ['اربد المدينة', 'الحصن', 'الرمثا', 'الشونة الشمالية', 'بني كنانة', 'الكورة', 'الأغوار الشمالية', 'سحم', 'المغير', 'كفرنجة'],
  'الزرقاء': ['الزرقاء المدينة', 'الرصيفة', 'الهاشمية', 'الأزرق', 'بيرين', 'الظليل'],
  'البلقاء': ['السلط', 'الفحيص', 'ماحص', 'عين الباشا', 'دير علا', 'الشونة الجنوبية', 'ناعور'],
  'الكـرك': ['الكرك المدينة', 'المزار الجنوبي', 'القصر', 'الأغوار الجنوبية', 'عيّ', 'فقعوع', 'مؤتة'],
  'معان': ['معان المدينة', 'الشوبك', 'البتراء', 'وادي موسى', 'الجفر', 'الحسينية'],
  'العقبة': ['العقبة المدينة', 'وادي رم', 'القويرة', 'الريشة'],
  'المفرق': ['المفرق المدينة', 'البادية الشمالية', 'الصفاوي', 'رويشد', 'سرحان', 'أم الجمال'],
  'الطفيلة': ['الطفيلة المدينة', 'بصيرا', 'الحسا', 'عيمة'],
  'مادبا': ['مادبا المدينة', 'ذيبان', 'ماعين', 'فلسطين'],
  'جـرش': ['جرش المدينة', 'بريوين', 'ساكب', 'كفر خل'],
  'عجلون': ['عجلون المدينة', 'عنجرة', 'كفرنجة', 'صخرة', 'عرجان']
};

// ===== إنشاء المودال =====
function initOrderModal() {
  var html =
    '<div id="orderModal">' +
      '<div class="overlay"></div>' +
      '<div class="box">' +
        '<button class="close">✕</button>' +
        '<h3>🛒 إرسال الطلب</h3>' +
        '<p class="sub">املأ البيانات وسنعاود الاتصال بك للتأكيد</p>' +
        '<form id="orderForm">' +
          '<input type="text" id="ordName" placeholder="الاسم" required />' +
          '<select id="ordGov" required><option value="">المحافظة</option>' +
            Object.keys(jordanData).map(function(g) { return '<option>' + g + '</option>'; }).join('') +
          '</select>' +
          '<select id="ordArea" required><option value="">المنطقة</option></select>' +
          '<input type="tel" id="ordPhone" placeholder="رقم الهاتف (10 أرقام)" required />' +
          '<div class="err" id="phoneErr">رقم الهاتف يجب أن يكون 10 أرقام</div>' +
          '<textarea id="ordNote" placeholder="تفاصيل الطلب أو ملاحظات (اختياري)"></textarea>' +
          '<button type="submit">إرسال الطلب</button>' +
        '</form>' +
      '</div>' +
    '</div>';

  var div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);

  // إغلاق (الحدث مربوط بالأسفل، هذا السطر متعلق)

  // محافظة ← منطقة
  document.getElementById('ordGov').addEventListener('change', function() {
    var areaSel = document.getElementById('ordArea');
    areaSel.innerHTML = '<option value="">المنطقة</option>';
    var areas = jordanData[this.value];
    if (areas) {
      areas.forEach(function(a) {
        var opt = document.createElement('option');
        opt.textContent = a;
        areaSel.appendChild(opt);
      });
    }
  });

  // التحقق من رقم الهاتف
  document.getElementById('ordPhone').addEventListener('input', function() {
    var err = document.getElementById('phoneErr');
    var val = this.value.replace(/[^0-9]/g, '');
    this.value = val;
    if (val.length > 0 && val.length !== 10) {
      err.classList.add('show');
    } else {
      err.classList.remove('show');
    }
  });

  // إرسال
  document.getElementById('orderForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var phone = document.getElementById('ordPhone').value;
    if (phone.length !== 10) {
      document.getElementById('phoneErr').classList.add('show');
      return;
    }

    var btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'جاري الإرسال...';

    var product = document.title.replace('أزما | معاينة ', '').replace(' 3D', '');

    var imgData = document.getElementById('orderModal').getAttribute('data-img') || '';

    var data = {
      name: document.getElementById('ordName').value,
      phone: phone,
      message: '🛒 *طلب منتج*\n' +
               'المنتج: ' + product + '\n' +
               'المحافظة: ' + document.getElementById('ordGov').value + '\n' +
               'المنطقة: ' + document.getElementById('ordArea').value + '\n' +
               'الملاحظات: ' + (document.getElementById('ordNote').value || 'بدون'),
      image: imgData,
      page: window.location.pathname
    };

    fetch('https://azma-bot.onrender.com/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.ok) {
        document.getElementById('orderModal').classList.remove('open');
        alert('✅ تم إرسال طلبك! سنتواصل معك قريباً لتأكيد الطلب.');
        document.getElementById('orderForm').reset();
      } else {
        alert('❌ عذراً، حدث خطأ. حاول مرة أخرى');
      }
    })
    .catch(function() { alert('❌ تعذر الاتصال بالخادم'); })
    .finally(function() { btn.disabled = false; btn.textContent = 'إرسال الطلب'; });
  });

  // إغلاق المودال
  document.querySelectorAll('#orderModal .close, #orderModal .overlay').forEach(function(el) {
    el.addEventListener('click', function() {
      document.getElementById('orderModal').classList.remove('open');
    });
  });
}

// ===== فتح المودال =====
function openOrderModal(imgDataUrl) {
  var m = document.getElementById('orderModal');
  if (!m) initOrderModal();
  if (imgDataUrl) {
    document.getElementById('orderModal').setAttribute('data-img', imgDataUrl);
  }
  document.getElementById('orderModal').classList.add('open');
}

// تهيئة عند التحميل
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOrderModal);
} else {
  initOrderModal();
}
